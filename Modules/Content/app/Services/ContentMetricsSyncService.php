<?php

namespace Modules\Content\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\Content\Models\ContentPost;
use Modules\Content\Models\ContentPostMetric;

class ContentMetricsSyncService
{
    /**
     * Đồng bộ chỉ số cho một bài đăng/video cụ thể (Dữ liệu thực tế 100%, không sinh số giả)
     */
    public function syncPost(ContentPost $post, ?array $customMetrics = null): array
    {
        $views = $customMetrics['views_count'] ?? $post->views_count;
        $likes = $customMetrics['likes_count'] ?? $post->likes_count;
        $comments = $customMetrics['comments_count'] ?? $post->comments_count;
        $shares = $customMetrics['shares_count'] ?? $post->shares_count;
        $gmv = $customMetrics['gmv_amount'] ?? $post->gmv_amount;
        $orders = $customMetrics['orders_count'] ?? 0;
        $syncSource = 'manual';

        // Nếu không có customMetrics truyền vào, gọi bộ thu thập số liệu thực tế từ API/Metadata
        if ($customMetrics === null && !empty($post->post_url)) {
            $fetched = $this->fetchRealMetrics($post->platform, $post->post_url);

            if (!empty($fetched)) {
                $syncSource = $fetched['source'] ?? 'api';

                if (isset($fetched['title']) && empty($post->video_title)) {
                    $post->video_title = $fetched['title'];
                }

                // Cập nhật chỉ số nếu bóc tách được số liệu thật từ API
                if (isset($fetched['views_count'])) {
                    $views = (int) $fetched['views_count'];
                }
                if (isset($fetched['likes_count'])) {
                    $likes = (int) $fetched['likes_count'];
                }
                if (isset($fetched['comments_count'])) {
                    $comments = (int) $fetched['comments_count'];
                }
                if (isset($fetched['shares_count'])) {
                    $shares = (int) $fetched['shares_count'];
                }
            }
        }

        return DB::transaction(function () use ($post, $views, $likes, $comments, $shares, $gmv, $orders, $syncSource) {
            $today = Carbon::today()->toDateString();

            // 1. Cập nhật bảng content_posts với số liệu thực tế
            $post->update([
                'video_title' => $post->video_title,
                'views_count' => $views,
                'likes_count' => $likes,
                'comments_count' => $comments,
                'shares_count' => $shares,
                'gmv_amount' => $gmv,
                'last_synced_at' => now(),
            ]);

            // 2. Ghi nhận snapshot lịch sử theo ngày trong content_post_metrics
            $metric = ContentPostMetric::updateOrCreate(
                [
                    'content_post_id' => $post->id,
                    'recorded_date' => $today,
                ],
                [
                    'views_count' => $views,
                    'likes_count' => $likes,
                    'comments_count' => $comments,
                    'shares_count' => $shares,
                    'orders_count' => $orders,
                    'gmv_amount' => $gmv,
                ]
            );

            // 3. Làm mới cache báo cáo nếu có
            if (class_exists(\Modules\Report\Services\ReportCalculationService::class)) {
                $campaignId = $post->campaignCreator?->campaign_id;
                \Modules\Report\Services\ReportCalculationService::flushReportCache($campaignId);
            }

            return [
                'post' => $post->fresh(),
                'metric' => $metric,
                'recorded_date' => $today,
                'source' => $syncSource,
            ];
        });
    }

    /**
     * Bóc tách chỉ số thực tế từ các nguồn dữ liệu chính thức (YouTube Data API, TikTok API, oEmbed)
     */
    public function fetchRealMetrics(string $platform, string $url): array
    {
        $platform = strtolower(trim($platform));

        return match ($platform) {
            'youtube' => $this->fetchYouTubeMetrics($url),
            'tiktok' => $this->fetchTikTokMetrics($url),
            'shopee' => $this->fetchShopeeMetrics($url),
            'facebook' => $this->fetchFacebookMetrics($url),
            default => $this->fetchGenericOEmbedMetrics($platform, $url),
        };
    }

    /**
     * Bóc tách chỉ số YouTube qua YouTube Data API v3 chính thức (Views, Likes, Comments, Title)
     */
    protected function fetchYouTubeMetrics(string $url): array
    {
        // 1. Lấy YouTube API Key từ Cài đặt Database (ưu tiên) hoặc .env
        $apiKey = class_exists(\Modules\Settings\Models\Setting::class)
            ? (\Modules\Settings\Models\Setting::get('youtube_api_key') ?: config('services.youtube.api_key'))
            : config('services.youtube.api_key');
        $videoId = $this->extractYouTubeVideoId($url);

        // 1. Nếu có Google / YouTube API Key, gọi lấy số liệu thật 100%
        if (!empty($apiKey) && !empty($videoId)) {
            try {
                $res = Http::timeout(8)->get('https://www.googleapis.com/youtube/v3/videos', [
                    'part' => 'snippet,statistics',
                    'id' => $videoId,
                    'key' => $apiKey,
                ]);

                if ($res->successful()) {
                    $item = $res->json('items.0');
                    if ($item) {
                        $stats = $item['statistics'] ?? [];
                        $snippet = $item['snippet'] ?? [];

                        return [
                            'source' => 'youtube_official_api',
                            'title' => $snippet['title'] ?? null,
                            'author_name' => $snippet['channelTitle'] ?? null,
                            'views_count' => (int) ($stats['viewCount'] ?? 0),
                            'likes_count' => (int) ($stats['likeCount'] ?? 0),
                            'comments_count' => (int) ($stats['commentCount'] ?? 0),
                            'shares_count' => 0,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("YouTube API fetch failed: " . $e->getMessage(), ['url' => $url]);
            }
        }

        // 2. Fallback: Lấy tiêu đề và tác giả qua YouTube oEmbed công khai (không sinh số view giả)
        $metadata = $this->fetchPublicMetadata('youtube', $url);
        return [
            'source' => 'youtube_oembed',
            'title' => $metadata['title'] ?? null,
            'author_name' => $metadata['author_name'] ?? null,
        ];
    }

    /**
     * Bóc tách chỉ số TikTok thực tế qua Multi-Tier Resolver:
     * 1. TikWM Public API (Miễn phí, Real-time 100%, không cần API key)
     * 2. HTML Scraper & Hydration Data trực tiếp từ TikTok web (__UNIVERSAL_DATA_FOR_REHYDRATION__ / SIGI_STATE)
     * 3. RapidAPI / TikAPI (nếu có cấu hình API key trong .env)
     * 4. oEmbed công khai (Fallback tiêu đề & tác giả)
     */
    protected function fetchTikTokMetrics(string $url): array
    {
        $canonicalUrl = $this->resolveTikTokCanonicalUrl($url);
        $videoId = $this->extractTikTokVideoId($canonicalUrl) ?: $this->extractTikTokVideoId($url);

        $hasSettings = class_exists(\Modules\Settings\Models\Setting::class);
        $apiKey = $hasSettings
            ? (\Modules\Settings\Models\Setting::get('social_data_provider_api_key') ?: config('services.social_data_provider.api_key'))
            : config('services.social_data_provider.api_key');
        $driver = strtolower($hasSettings
            ? (\Modules\Settings\Models\Setting::get('social_data_provider_driver') ?: config('services.social_data_provider.driver', 'sandbox'))
            : config('services.social_data_provider.driver', 'sandbox'));
        $apiHost = $hasSettings
            ? (\Modules\Settings\Models\Setting::get('social_data_provider_api_host') ?: config('services.social_data_provider.api_host', 'tiktok-api23.p.rapidapi.com'))
            : config('services.social_data_provider.api_host', 'tiktok-api23.p.rapidapi.com');

        // 1. TẦNG ƯU TIÊN 1: Nếu người dùng đã cấu hình API Key (RapidAPI / TikAPI), GỌI NGAY LẬP TỨC để tránh bị timeout
        if (!empty($apiKey) && $driver !== 'sandbox') {
            // Ưu tiên 1: Chạy luồng User Pipeline chuẩn hóa (uid/secUid -> user posts có phân trang continuation_token / cursor)
            $providerData = $this->fetchFromRapidApiTikTokUserPipeline($canonicalUrl, $url, $videoId, $apiKey, $apiHost);
            if (!empty($providerData) && isset($providerData['views_count'])) {
                return $providerData;
            }

            // Fallback: Thử các endpoint single post trực tiếp
            $fallbackData = $this->fetchFromRapidApiWithFallbacks($canonicalUrl, $url, $videoId, $apiKey, $apiHost);
            if (!empty($fallbackData) && isset($fallbackData['views_count'])) {
                return $fallbackData;
            }
        }

        // 2. TẦNG 2: TikWM Public API (Miễn phí fallback)
        $tikwmData = $this->fetchFromTikWmApi($canonicalUrl);
        if (!empty($tikwmData) && isset($tikwmData['views_count'])) {
            return $tikwmData;
        }

        // 3. TẦNG 3: HTML Scraping trực tiếp từ trang TikTok Web với Chrome Browser Headers
        $scrapedData = $this->scrapeTikTokHtmlStats($canonicalUrl);
        if (!empty($scrapedData) && isset($scrapedData['views_count'])) {
            return $scrapedData;
        }

        // 4. TẦNG 4: Fallback qua oEmbed công khai (Chỉ lấy tiêu đề & tác giả thật, tuyệt đối không sinh số ảo)
        $metadata = $this->fetchPublicMetadata('tiktok', $canonicalUrl);
        return [
            'source' => 'tiktok_oembed',
            'title' => $metadata['title'] ?? null,
            'author_name' => $metadata['author_name'] ?? null,
        ];
    }

    /**
     * Trích xuất username (@uniqueId) từ URL TikTok
     */
    public function extractTikTokUsername(string $url): ?string
    {
        if (preg_match('/@([A-Za-z0-9_.-]+)/i', $url, $matches)) {
            return trim($matches[1], '/?#');
        }
        return null;
    }

    /**
     * Bóc tách chỉ số từ RapidAPI TikTok theo chuẩn tài liệu nhà cung cấp (Pha 1: uid/secUid -> Pha 2: user videos có phân trang)
     */
    public function fetchFromRapidApiTikTokUserPipeline(
        string $canonicalUrl,
        string $rawUrl,
        ?string $videoId,
        string $apiKey,
        string $apiHost
    ): array {
        $username = $this->extractTikTokUsername($canonicalUrl) ?: $this->extractTikTokUsername($rawUrl);
        $vid = $videoId ?: ($this->extractTikTokVideoId($canonicalUrl) ?: $this->extractTikTokVideoId($rawUrl));

        if (empty($apiKey) || empty($apiHost)) {
            return [];
        }

        $headers = [
            'x-rapidapi-key' => $apiKey,
            'x-rapidapi-host' => $apiHost,
            'Accept' => 'application/json',
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ];

        // -------------------------------------------------------------
        // PHA 1: Xác định và Cache UID / SECUID của Creator (TTL: 30 ngày)
        // -------------------------------------------------------------
        $uid = null;
        $secUid = null;

        if (!empty($username)) {
            $cleanUser = ltrim($username, '@');
            $cacheKeyUid = "tiktok_uid_{$cleanUser}";
            $cachedIdentity = Cache::get($cacheKeyUid);

            if (is_array($cachedIdentity)) {
                $uid = $cachedIdentity['uid'] ?? null;
                $secUid = $cachedIdentity['secUid'] ?? null;
            } elseif (is_string($cachedIdentity)) {
                $uid = $cachedIdentity;
                $secUid = $cachedIdentity;
            }

            if (empty($uid) && empty($secUid)) {
                // Thử các endpoint lấy user info: /api/user/info hoặc /user/info
                $userEndpoints = [
                    "https://{$apiHost}/api/user/info",
                    "https://{$apiHost}/user/info",
                ];

                foreach ($userEndpoints as $uUrl) {
                    try {
                        $res = Http::withHeaders($headers)
                            ->timeout(15)
                            ->retry(2, 500)
                            ->get($uUrl, ['uniqueId' => $cleanUser]);

                        if ($res->successful()) {
                            $uJson = $res->json();
                            $userData = $uJson['userInfo']['user'] ?? ($uJson['data']['user'] ?? ($uJson['user'] ?? ($uJson['data'] ?? [])));
                            $userStats = $uJson['userInfo']['stats'] ?? ($uJson['data']['stats'] ?? ($uJson['stats'] ?? []));

                            $extractedUid = (string) ($userData['id'] ?? ($userData['uid'] ?? ($userData['userId'] ?? '')));
                            $extractedSecUid = (string) ($userData['secUid'] ?? ($userData['sec_uid'] ?? ''));

                            if (!empty($extractedUid) || !empty($extractedSecUid)) {
                                $uid = $extractedUid ?: $extractedSecUid;
                                $secUid = $extractedSecUid ?: $extractedUid;

                                Cache::put($cacheKeyUid, [
                                    'uid' => $uid,
                                    'secUid' => $secUid,
                                ], now()->addDays(30));

                                // Cập nhật followerCount vào hồ sơ KOL nếu có
                                if (!empty($userStats['followerCount'])) {
                                    $this->syncCreatorFollowers($cleanUser, (int) $userStats['followerCount']);
                                }

                                break;
                            }
                        } elseif ($res->status() === 401 || $res->status() === 403) {
                            Log::warning("RapidAPI [{$apiHost}] User Info Auth Failed: HTTP {$res->status()}");
                            break;
                        }
                    } catch (\Throwable $e) {
                        Log::warning("RapidAPI user/info attempt failed on {$uUrl}: " . $e->getMessage());
                    }
                }
            }
        }

        // -------------------------------------------------------------
        // PHA 2: Quét Danh Sách Video có Phân Trang (continuation_token / cursor)
        // -------------------------------------------------------------
        $targetId = !empty($vid) ? (string) $vid : null;

        $cleanUser = !empty($username) ? ltrim($username, '@') : null;
        if (!empty($uid) || !empty($secUid) || !empty($cleanUser)) {
            $effectiveId = $uid ?: ($secUid ?: $cleanUser);
            $cacheKeyVideos = "tiktok_videos_{$effectiveId}";
            $cachedVideos = Cache::get($cacheKeyVideos);

            if (is_array($cachedVideos) && !empty($targetId)) {
                $matched = $this->findVideoInList($cachedVideos, $targetId);
                if ($matched) {
                    $matched['source'] = 'tiktok_provider_api';
                    return $matched;
                }
            }

            // Danh sách các cấu hình endpoint phân trang
            $postPipelines = [];
            if (!empty($cleanUser)) {
                $postPipelines[] = ['url' => "https://{$apiHost}/user/videos", 'id_param' => 'username', 'id_val' => $cleanUser, 'token_param' => 'continuation_token'];
            }
            if (!empty($uid) || !empty($secUid)) {
                $postPipelines[] = ['url' => "https://{$apiHost}/user/videos", 'id_param' => 'uid', 'id_val' => $uid ?: $secUid, 'token_param' => 'continuation_token'];
                $postPipelines[] = ['url' => "https://{$apiHost}/api/user/posts", 'id_param' => 'secUid', 'id_val' => $secUid ?: $uid, 'token_param' => 'cursor'];
                $postPipelines[] = ['url' => "https://{$apiHost}/user/posts", 'id_param' => 'secUid', 'id_val' => $secUid ?: $uid, 'token_param' => 'cursor'];
            }

            foreach ($postPipelines as $pipeline) {
                $token = null;
                $allFetchedVideos = [];

                for ($page = 0; $page < 4; $page++) {
                    $params = [
                        $pipeline['id_param'] => $pipeline['id_val'],
                        'count' => 35,
                    ];
                    if ($token) {
                        $params[$pipeline['token_param']] = $token;
                    }

                    try {
                        $res = Http::withHeaders($headers)
                            ->timeout(20)
                            ->retry(2, 500)
                            ->get($pipeline['url'], $params);

                        if ($res->status() === 429) {
                            usleep(600000); // Nghỉ 0.6s nếu bị 429
                            continue;
                        }

                        if ($res->successful()) {
                            $json = $res->json();
                            $videoList = $json['videos'] ?? ($json['itemList'] ?? ($json['data']['itemList'] ?? ($json['data']['videos'] ?? ($json['data'] ?? []))));

                            if (is_array($videoList) && !empty($videoList)) {
                                foreach ($videoList as $vItem) {
                                    $allFetchedVideos[] = $vItem;
                                }

                                if (!empty($targetId)) {
                                    $found = $this->findVideoInList($videoList, $targetId);
                                    if ($found !== null) {
                                        Cache::put($cacheKeyVideos, $allFetchedVideos, now()->addMinutes(15));
                                        $found['source'] = 'tiktok_provider_api';
                                        return $found;
                                    }
                                }

                                // Token phân trang cho trang kế tiếp
                                $token = $json['continuation_token'] ?? ($json['cursor'] ?? ($json['data']['cursor'] ?? null));
                                $hasMore = $json['hasMore'] ?? ($json['has_more'] ?? ($token !== null));

                                if (!$hasMore || empty($token)) {
                                    break;
                                }

                                usleep(300000); // Nghỉ 0.3s chống 429 rate limit
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                    } catch (\Throwable $e) {
                        Log::warning("RapidAPI user posts fetch failed: " . $e->getMessage());
                        break;
                    }
                }

                if (!empty($allFetchedVideos)) {
                    Cache::put($cacheKeyVideos, $allFetchedVideos, now()->addMinutes(15));
                }
            }
        }

        return [];
    }

    /**
     * Tìm video cụ thể trong danh sách và bóc tách chỉ số đa hình
     */
    public function findVideoInList(array $videoList, string $targetId): ?array
    {
        $cleanTargetId = trim($targetId);

        foreach ($videoList as $item) {
            if (!is_array($item)) {
                continue;
            }

            $itemId = (string) ($item['video_id'] ?? ($item['id'] ?? ($item['aweme_id'] ?? '')));
            if ($itemId === $cleanTargetId) {
                $stats = $item['statistics'] ?? ($item['stats'] ?? $item);

                $views = $stats['number_of_plays'] ?? ($stats['playCount'] ?? ($stats['play_count'] ?? ($stats['plays'] ?? ($stats['view_count'] ?? ($stats['views'] ?? null)))));
                $likes = $stats['number_of_hearts'] ?? ($stats['diggCount'] ?? ($stats['digg_count'] ?? ($stats['hearts'] ?? ($stats['likes'] ?? ($stats['like_count'] ?? 0)))));
                $comments = $stats['number_of_comments'] ?? ($stats['commentCount'] ?? ($stats['comment_count'] ?? ($stats['comments'] ?? 0)));
                $shares = $stats['number_of_shares'] ?? ($stats['shareCount'] ?? ($stats['share_count'] ?? ($stats['shares'] ?? 0)));

                $title = $item['title'] ?? ($item['desc'] ?? ($item['description'] ?? null));
                $author = $item['author']['nickname'] ?? ($item['author']['unique_id'] ?? ($item['author_name'] ?? null));

                return [
                    'source' => 'tiktok_provider_api',
                    'title' => $title,
                    'author_name' => $author,
                    'views_count' => (int) ($views ?? 0),
                    'likes_count' => (int) $likes,
                    'comments_count' => (int) $comments,
                    'shares_count' => (int) $shares,
                ];
            }
        }

        return null;
    }

    /**
     * Đồng bộ số follower vào hồ sơ CreatorAccount nếu tồn tại
     */
    protected function syncCreatorFollowers(string $username, int $followerCount): void
    {
        try {
            if (class_exists(\Modules\Creator\Models\CreatorAccount::class)) {
                $clean = ltrim($username, '@');
                \Modules\Creator\Models\CreatorAccount::where('handle', $clean)
                    ->orWhere('handle', "@{$clean}")
                    ->update([
                        'followers_count' => $followerCount,
                        'last_metrics_updated_at' => now(),
                    ]);
            }
        } catch (\Throwable) {
            // Không chặn tiến trình nếu lỗi
        }
    }

    /**
     * Bóc tách chỉ số từ RapidAPI với hỗ trợ đa dạng endpoint và định dạng JSON của các provider khác nhau
     */
    public function fetchFromRapidApiWithFallbacks(
        string $canonicalUrl,
        string $rawUrl,
        ?string $videoId,
        string $apiKey,
        string $apiHost
    ): array {
        $headers = [
            'x-rapidapi-key' => $apiKey,
            'x-rapidapi-host' => $apiHost,
            'Accept' => 'application/json',
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ];

        // Danh sách endpoint và tham số linh hoạt tương thích với hầu hết các package RapidAPI TikTok
        $endpoints = [];

        // Thử theo videoId (ID dạng số như 7123456789012345678)
        if (!empty($videoId)) {
            $endpoints[] = ['url' => "https://{$apiHost}/video/details", 'params' => ['video_id' => $videoId]];
            $endpoints[] = ['url' => "https://{$apiHost}/video/details", 'params' => ['id' => $videoId]];
            $endpoints[] = ['url' => "https://{$apiHost}/api/post/info", 'params' => ['postId' => $videoId]];
            $endpoints[] = ['url' => "https://{$apiHost}/api/post/detail", 'params' => ['videoId' => $videoId]];
            $endpoints[] = ['url' => "https://{$apiHost}/video/info", 'params' => ['video_id' => $videoId]];
            $endpoints[] = ['url' => "https://{$apiHost}/feed/detail", 'params' => ['video_id' => $videoId]];
        }

        // Thử theo link video (hỗ trợ cả canonical lẫn shortlink)
        $endpoints[] = ['url' => "https://{$apiHost}/api/post/info", 'params' => ['url' => $canonicalUrl]];
        $endpoints[] = ['url' => "https://{$apiHost}/video/info", 'params' => ['url' => $canonicalUrl]];
        $endpoints[] = ['url' => "https://{$apiHost}/media/info", 'params' => ['url' => $canonicalUrl]];
        $endpoints[] = ['url' => "https://{$apiHost}/", 'params' => ['url' => $canonicalUrl]];

        if ($rawUrl !== $canonicalUrl) {
            $endpoints[] = ['url' => "https://{$apiHost}/video/info", 'params' => ['url' => $rawUrl]];
            $endpoints[] = ['url' => "https://{$apiHost}/media/info", 'params' => ['url' => $rawUrl]];
        }

        foreach ($endpoints as $ep) {
            try {
                $res = Http::withHeaders($headers)
                    ->timeout(8)
                    ->get($ep['url'], $ep['params']);

                if ($res->successful()) {
                    $json = $res->json();
                    if (!empty($json)) {
                        $parsed = $this->parseRapidApiPayload($json);
                        if ($parsed !== null && isset($parsed['views_count'])) {
                            $parsed['source'] = 'tiktok_provider_api';
                            return $parsed;
                        }
                    }
                } elseif ($res->status() === 401 || $res->status() === 403) {
                    Log::error("RapidAPI [{$apiHost}] Authentication Failed ({$res->status()}): " . substr($res->body(), 0, 200));
                    break;
                }
            } catch (\Throwable $e) {
                Log::warning("RapidAPI attempt failed on {$ep['url']}: " . $e->getMessage());
            }
        }

        return [];
    }

    /**
     * Tự động nhận diện cấu trúc JSON của các RapidAPI TikTok Provider khác nhau
     */
    public function parseRapidApiPayload(array $json): ?array
    {
        // 1. Dạng Lundehund / tiktok-api23: { itemInfo: { itemStruct: { stats: { playCount, diggCount, ... } } } }
        $itemStruct = $json['itemInfo']['itemStruct'] ?? $json['data']['itemInfo']['itemStruct'] ?? null;
        if (!empty($itemStruct)) {
            $stats = $itemStruct['stats'] ?? [];
            if (isset($stats['playCount']) || isset($stats['play_count']) || isset($stats['number_of_plays'])) {
                return [
                    'title' => $itemStruct['desc'] ?? null,
                    'author_name' => $itemStruct['author']['nickname'] ?? ($itemStruct['author']['uniqueId'] ?? null),
                    'views_count' => (int) ($stats['number_of_plays'] ?? ($stats['playCount'] ?? ($stats['play_count'] ?? 0))),
                    'likes_count' => (int) ($stats['number_of_hearts'] ?? ($stats['diggCount'] ?? ($stats['digg_count'] ?? 0))),
                    'comments_count' => (int) ($stats['number_of_comments'] ?? ($stats['commentCount'] ?? ($stats['comment_count'] ?? 0))),
                    'shares_count' => (int) ($stats['number_of_shares'] ?? ($stats['shareCount'] ?? ($stats['share_count'] ?? 0))),
                ];
            }
        }

        // 2. Dạng TikWM / Douyin / tiktok-scraper: { data: { play_count, digg_count, ... } }
        $data = $json['data'] ?? $json;
        if (is_array($data)) {
            $stats = $data['stats'] ?? ($data['statistics'] ?? $data);
            
            $views = null;
            if (isset($stats['number_of_plays'])) $views = (int) $stats['number_of_plays'];
            elseif (isset($stats['play_count'])) $views = (int) $stats['play_count'];
            elseif (isset($stats['playCount'])) $views = (int) $stats['playCount'];
            elseif (isset($stats['views'])) $views = (int) $stats['views'];
            elseif (isset($stats['view_count'])) $views = (int) $stats['view_count'];
            elseif (isset($stats['viewCount'])) $views = (int) $stats['viewCount'];
            elseif (isset($data['number_of_plays'])) $views = (int) $data['number_of_plays'];
            elseif (isset($data['play_count'])) $views = (int) $data['play_count'];
            elseif (isset($data['views'])) $views = (int) $data['views'];

            if ($views !== null) {
                $likes = (int) ($stats['number_of_hearts'] ?? ($stats['digg_count'] ?? ($stats['diggCount'] ?? ($stats['likes'] ?? ($stats['like_count'] ?? ($data['digg_count'] ?? 0))))));
                $comments = (int) ($stats['number_of_comments'] ?? ($stats['comment_count'] ?? ($stats['commentCount'] ?? ($stats['comments'] ?? ($data['comment_count'] ?? 0)))));
                $shares = (int) ($stats['number_of_shares'] ?? ($stats['share_count'] ?? ($stats['shareCount'] ?? ($stats['shares'] ?? ($data['share_count'] ?? 0)))));
                $title = $data['title'] ?? ($data['desc'] ?? ($data['description'] ?? null));
                $authorName = $data['author']['nickname'] ?? ($data['author']['unique_id'] ?? ($data['author_name'] ?? null));

                return [
                    'title' => $title,
                    'author_name' => $authorName,
                    'views_count' => $views,
                    'likes_count' => $likes,
                    'comments_count' => $comments,
                    'shares_count' => $shares,
                ];
            }
        }

        // 3. Dạng item_list (User feed hoặc search item): { data: { itemList: [ { stats: ... } ] } }
        $itemList = $json['data']['itemList'] ?? ($json['itemList'] ?? ($json['items'] ?? null));
        if (is_array($itemList) && !empty($itemList[0])) {
            $first = $itemList[0];
            $stats = $first['stats'] ?? $first;
            if (isset($stats['playCount']) || isset($stats['play_count'])) {
                return [
                    'title' => $first['desc'] ?? null,
                    'author_name' => $first['author']['nickname'] ?? null,
                    'views_count' => (int) ($stats['playCount'] ?? ($stats['play_count'] ?? 0)),
                    'likes_count' => (int) ($stats['diggCount'] ?? ($stats['digg_count'] ?? 0)),
                    'comments_count' => (int) ($stats['commentCount'] ?? ($stats['comment_count'] ?? 0)),
                    'shares_count' => (int) ($stats['shareCount'] ?? ($stats['share_count'] ?? 0)),
                ];
            }
        }

        return null;
    }

    /**
     * Bóc tách chỉ số từ TikWM Public API (Miễn phí, Real-time 100%)
     */
    public function fetchFromTikWmApi(string $url): array
    {
        $headers = [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept' => 'application/json, text/plain, */*',
            'Referer' => 'https://www.tikwm.com/',
        ];

        $endpoints = [
            'https://www.tikwm.com/api/',
            'https://api.tikwm.com/',
        ];

        foreach ($endpoints as $apiEndpoint) {
            try {
                $res = Http::withHeaders($headers)
                    ->timeout(6)
                    ->retry(1, 200)
                    ->get($apiEndpoint, [
                        'url' => $url,
                        'count' => 12,
                        'cursor' => 0,
                        'web' => 1,
                    ]);

                if ($res->successful()) {
                    $json = $res->json();
                    if (($json['code'] ?? -1) === 0 && isset($json['data'])) {
                        $d = $json['data'];
                        $playCount = isset($d['play_count']) ? (int) $d['play_count'] : null;
                        if ($playCount !== null) {
                            return [
                                'source' => 'tikwm_public_api',
                                'title' => $d['title'] ?? null,
                                'author_name' => $d['author']['nickname'] ?? ($d['author']['unique_id'] ?? null),
                                'views_count' => $playCount,
                                'likes_count' => (int) ($d['digg_count'] ?? 0),
                                'comments_count' => (int) ($d['comment_count'] ?? 0),
                                'shares_count' => (int) ($d['share_count'] ?? 0),
                            ];
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("TikWM fetch failed at {$apiEndpoint}: " . $e->getMessage(), ['url' => $url]);
            }
        }

        return [];
    }

    /**
     * Cào trực tiếp HTML trang TikTok Web để bóc tách hydration JSON hoặc regex stats
     */
    public function scrapeTikTokHtmlStats(string $url): array
    {
        try {
            $res = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language' => 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer' => 'https://www.tiktok.com/',
                'sec-ch-ua' => '"Chromium";v="124", "Google Chrome";v="124"',
            ])->timeout(8)->get($url);

            if ($res->successful()) {
                $html = $res->body();

                // 1. Thử bóc tách từ script JSON __UNIVERSAL_DATA_FOR_REHYDRATION__
                if (preg_match('/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s', $html, $matches)) {
                    $universalData = json_decode($matches[1], true);
                    $itemStruct = $universalData['__DEFAULT_SCOPE__']['webapp.video-detail']['itemInfo']['itemStruct'] ?? null;
                    if ($itemStruct && isset($itemStruct['stats'])) {
                        $stats = $itemStruct['stats'];
                        return [
                            'source' => 'tiktok_html_hydration',
                            'title' => $itemStruct['desc'] ?? null,
                            'author_name' => $itemStruct['author']['nickname'] ?? ($itemStruct['author']['uniqueId'] ?? null),
                            'views_count' => (int) ($stats['playCount'] ?? 0),
                            'likes_count' => (int) ($stats['diggCount'] ?? 0),
                            'comments_count' => (int) ($stats['commentCount'] ?? 0),
                            'shares_count' => (int) ($stats['shareCount'] ?? 0),
                        ];
                    }
                }

                // 2. Thử bóc tách từ SIGI_STATE
                if (preg_match('/<script id="SIGI_STATE"[^>]*>(.*?)<\/script>/s', $html, $matches)) {
                    $sigiData = json_decode($matches[1], true);
                    $itemModule = $sigiData['ItemModule'] ?? [];
                    $firstItem = reset($itemModule);
                    if ($firstItem && isset($firstItem['stats'])) {
                        $stats = $firstItem['stats'];
                        return [
                            'source' => 'tiktok_sigi_state',
                            'title' => $firstItem['desc'] ?? null,
                            'author_name' => $firstItem['author'] ?? null,
                            'views_count' => (int) ($stats['playCount'] ?? 0),
                            'likes_count' => (int) ($stats['diggCount'] ?? 0),
                            'comments_count' => (int) ($stats['commentCount'] ?? 0),
                            'shares_count' => (int) ($stats['shareCount'] ?? 0),
                        ];
                    }
                }

                // 3. Fallback regex bóc tách trực tiếp các key stats
                if (preg_match('/"playCount":\s*(\d+)/', $html, $playMatch)) {
                    preg_match('/"diggCount":\s*(\d+)/', $html, $diggMatch);
                    preg_match('/"commentCount":\s*(\d+)/', $html, $commentMatch);
                    preg_match('/"shareCount":\s*(\d+)/', $html, $shareMatch);

                    return [
                        'source' => 'tiktok_html_regex',
                        'views_count' => (int) $playMatch[1],
                        'likes_count' => isset($diggMatch[1]) ? (int) $diggMatch[1] : 0,
                        'comments_count' => isset($commentMatch[1]) ? (int) $commentMatch[1] : 0,
                        'shares_count' => isset($shareMatch[1]) ? (int) $shareMatch[1] : 0,
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning("TikTok HTML scrape failed: " . $e->getMessage(), ['url' => $url]);
        }

        return [];
    }

    /**
     * Chuẩn hóa URL TikTok và xử lý resolve Shortlink (vt.tiktok.com, vm.tiktok.com, tiktok.com/t/)
     */
    public function resolveTikTokCanonicalUrl(string $url): string
    {
        $url = trim($url);

        // Nếu là short link vt.tiktok.com, vm.tiktok.com hoặc tiktok.com/t/
        if (preg_match('/(?:vt|vm)\.tiktok\.com\/([\w-]+)|tiktok\.com\/t\/([\w-]+)/i', $url)) {
            try {
                $response = Http::withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                ])->timeout(6)->withoutRedirecting()->get($url);

                $location = $response->header('Location');
                if ($location) {
                    return strtok($location, '?');
                }
            } catch (\Throwable $e) {
                // Tiếp tục với URL ban đầu
            }
        }

        // Tách bỏ query params rác (?is_from_webapp=1&sender_device=pc)
        if (str_contains($url, '/video/')) {
            $parts = explode('?', $url);
            return $parts[0];
        }

        return $url;
    }

    /**
     * Bóc tách chỉ số Shopee Video (Views, Likes, Comments, Shares)
     */
    protected function fetchShopeeMetrics(string $url): array
    {
        $canonicalUrl = $this->resolveShopeeCanonicalUrl($url);
        $videoId = $this->extractShopeeVideoId($canonicalUrl);

        if ($videoId) {
            try {
                // Tầng 1: Shopee Video Public Detail API
                $apiUrl = "https://shopee.vn/api/v4/video/get_video_detail?video_id={$videoId}";
                $res = Http::timeout(6)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Shopee',
                        'Accept' => 'application/json',
                    ])
                    ->get($apiUrl);

                if ($res->successful()) {
                    $json = $res->json();
                    $data = $json['data'] ?? [];
                    if (!empty($data)) {
                        $views = (int) ($data['play_count'] ?? ($data['view_count'] ?? 0));
                        $likes = (int) ($data['like_count'] ?? ($data['digg_count'] ?? 0));
                        $comments = (int) ($data['comment_count'] ?? 0);
                        $shares = (int) ($data['share_count'] ?? 0);
                        $title = (string) ($data['caption'] ?? ($data['description'] ?? ($data['title'] ?? null)));
                        $authorName = $data['author']['nickname'] ?? ($data['author_name'] ?? null);

                        return [
                            'source' => 'shopee_public_api',
                            'title' => $title,
                            'author_name' => $authorName,
                            'views_count' => $views,
                            'likes_count' => $likes,
                            'comments_count' => $comments,
                            'shares_count' => $shares,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("Shopee Video API fetch failed: " . $e->getMessage(), ['url' => $url]);
            }
        }

        // Tầng 2: Scraping HTML trang Shopee Video
        try {
            $htmlRes = Http::timeout(6)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ])
                ->get($canonicalUrl);

            if ($htmlRes->successful()) {
                $html = $htmlRes->body();
                $title = null;
                if (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $title = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }

                $views = 0;
                $likes = 0;
                if (preg_match('/([0-9.,KkMmNnTr]+)\s*(?:lượt xem|views|plays)/i', $html, $m)) {
                    $views = $this->parseCountString($m[1]);
                }
                if (preg_match('/([0-9.,KkMmNnTr]+)\s*(?:lượt thích|likes)/i', $html, $m)) {
                    $likes = $this->parseCountString($m[1]);
                }

                if ($views > 0 || $likes > 0 || $title) {
                    return [
                        'source' => 'shopee_html_scrape',
                        'title' => $title,
                        'author_name' => null,
                        'views_count' => $views,
                        'likes_count' => $likes,
                        'comments_count' => 0,
                        'shares_count' => 0,
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Shopee Video HTML scrape failed: " . $e->getMessage(), ['url' => $url]);
        }

        return [
            'source' => 'shopee_fallback',
            'title' => null,
            'author_name' => null,
        ];
    }

    /**
     * Bóc tách chỉ số Facebook Reels / Video (Views, Likes, Comments)
     */
    protected function fetchFacebookMetrics(string $url): array
    {
        $canonicalUrl = $this->resolveFacebookCanonicalUrl($url);

        // 1. Meta Graph API oEmbed nếu có cấu hình Facebook Client Token (ưu tiên Database Settings, fallback .env)
        $clientToken = class_exists(\Modules\Settings\Models\Setting::class)
            ? (\Modules\Settings\Models\Setting::get('facebook_client_token') ?: config('services.facebook.client_token'))
            : config('services.facebook.client_token');
        if (!empty($clientToken)) {
            try {
                $oembedUrl = 'https://graph.facebook.com/v19.0/oembed_post?url=' . urlencode($canonicalUrl) . '&access_token=' . urlencode($clientToken);
                $res = Http::timeout(6)->get($oembedUrl);
                if ($res->successful()) {
                    $data = $res->json();
                    $title = strip_tags($data['html'] ?? '');
                    $authorName = $data['author_name'] ?? null;

                    return [
                        'source' => 'facebook_oembed',
                        'title' => !empty($title) ? mb_substr($title, 0, 250) : null,
                        'author_name' => $authorName,
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning("Facebook oEmbed fetch failed: " . $e->getMessage(), ['url' => $url]);
            }
        }

        // 2. OpenGraph & HTML Scraper công khai
        try {
            $res = Http::timeout(6)
                ->withHeaders([
                    'User-Agent' => 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept-Language' => 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                ])
                ->get($canonicalUrl);

            if ($res->successful()) {
                $html = $res->body();
                $title = null;
                if (preg_match('/<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $title = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                } elseif (preg_match('/<meta\s+property=["\']og:title["\']\s+content=["\'](.*?)["\']/i', $html, $m)) {
                    $title = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                }

                $views = 0;
                $likes = 0;
                $comments = 0;

                // Quét chỉ số hiển thị công khai trên HTML Reels
                if (preg_match('/([0-9.,KkMmNnTr]+)\s*(?:lượt xem|plays|views)/i', $html, $m)) {
                    $views = $this->parseCountString($m[1]);
                }
                if (preg_match('/([0-9.,KkMmNnTr]+)\s*(?:lượt thích|likes)/i', $html, $m)) {
                    $likes = $this->parseCountString($m[1]);
                }
                if (preg_match('/([0-9.,KkMmNnTr]+)\s*(?:bình luận|comments)/i', $html, $m)) {
                    $comments = $this->parseCountString($m[1]);
                }

                return [
                    'source' => 'facebook_opengraph',
                    'title' => $title,
                    'author_name' => null,
                    'views_count' => $views,
                    'likes_count' => $likes,
                    'comments_count' => $comments,
                    'shares_count' => 0,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning("Facebook HTML scrape failed: " . $e->getMessage(), ['url' => $url]);
        }

        return [
            'source' => 'facebook_fallback',
            'title' => null,
            'author_name' => null,
        ];
    }

    /**
     * Chuyển đổi chuỗi số lượng rút gọn (10.5K, 1.2M, 2Tr) thành số nguyên
     */
    public function parseCountString(?string $text): int
    {
        if (empty($text)) {
            return 0;
        }

        $clean = strtoupper(trim(str_replace(',', '.', $text)));
        if (str_contains($clean, 'M') || str_contains($clean, 'TR')) {
            $num = (float) preg_replace('/[^0-9.]/', '', $clean);
            return (int) round($num * 1000000);
        }
        if (str_contains($clean, 'K') || str_contains($clean, 'N')) {
            $num = (float) preg_replace('/[^0-9.]/', '', $clean);
            return (int) round($num * 1000);
        }

        $num = (int) preg_replace('/[^0-9]/', '', $clean);
        return $num;
    }

    /**
     * Trích xuất Video ID từ URL Shopee Video
     */
    public function extractShopeeVideoId(string $url): ?string
    {
        if (preg_match('/(?:universal-link\/video|video|feed\/video)\/([a-zA-Z0-9_-]+)/i', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Chuẩn hóa URL Shopee Video & phân giải Shortlink (vn.shp.ee)
     */
    public function resolveShopeeCanonicalUrl(string $url): string
    {
        $url = trim($url);
        if (preg_match('/vn\.shp\.ee\/(?:video\/)?([a-zA-Z0-9._-]+)/i', $url)) {
            try {
                $response = Http::timeout(4)->withoutRedirecting()->head($url);
                $location = $response->header('Location');
                if ($location) {
                    return strtok($location, '?');
                }
            } catch (\Throwable) {
                // Tiếp tục
            }
        }
        return strtok($url, '?');
    }

    /**
     * Chuẩn hóa URL Facebook Reels / Video & phân giải Shortlink
     */
    public function resolveFacebookCanonicalUrl(string $url): string
    {
        $url = trim($url);
        if (preg_match('/(?:fb\.watch|facebook\.com\/share\/r)\/([a-zA-Z0-9._-]+)/i', $url)) {
            try {
                $response = Http::timeout(4)->withoutRedirecting()->head($url);
                $location = $response->header('Location');
                if ($location) {
                    return strtok($location, '?');
                }
            } catch (\Throwable) {
                // Tiếp tục
            }
        }
        return strtok($url, '?');
    }

    /**
     * Bóc tách tiêu đề/tác giả chung qua oEmbed công khai
     */
    protected function fetchGenericOEmbedMetrics(string $platform, string $url): array
    {
        $metadata = $this->fetchPublicMetadata($platform, $url);
        return [
            'source' => "{$platform}_oembed",
            'title' => $metadata['title'] ?? null,
            'author_name' => $metadata['author_name'] ?? null,
        ];
    }

    /**
     * Trích xuất video ID từ URL YouTube
     */
    public function extractYouTubeVideoId(string $url): ?string
    {
        if (preg_match('/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Trích xuất video ID từ URL TikTok
     */
    public function extractTikTokVideoId(string $url): ?string
    {
        if (preg_match('/video\/(\d+)/i', $url, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Đồng bộ toàn bộ các bài đăng đang hoạt động trong hệ thống
     */
    public function syncAllActivePosts(): int
    {
        $posts = ContentPost::query()
            ->whereNotNull('post_url')
            ->where(function ($query) {
                $query->where('status', 'approved')
                    ->orWhereNotNull('posted_at');
            })
            ->where(function ($query) {
                $query->where('posted_at', '>=', now()->subDays(30))
                    ->orWhere('created_at', '>=', now()->subDays(30));
            })
            ->get();

        $count = 0;
        foreach ($posts as $post) {
            try {
                $this->syncPost($post);
                $count++;
            } catch (\Exception $e) {
                Log::error("Lỗi khi đồng bộ chỉ số ContentPost #{$post->id}: " . $e->getMessage());
            }
        }

        return $count;
    }

    /**
     * Trích xuất tiêu đề công khai qua oEmbed
     */
    protected function fetchPublicMetadata(string $platform, string $url): array
    {
        try {
            if ($platform === 'tiktok') {
                $res = Http::timeout(4)->get('https://www.tiktok.com/oembed', ['url' => $url]);
                if ($res->successful()) {
                    return [
                        'title' => $res->json('title'),
                        'author_name' => $res->json('author_name'),
                        'thumbnail_url' => $res->json('thumbnail_url'),
                    ];
                }
            }

            if ($platform === 'youtube') {
                $res = Http::timeout(4)->get('https://www.youtube.com/oembed', ['url' => $url, 'format' => 'json']);
                if ($res->successful()) {
                    return [
                        'title' => $res->json('title'),
                        'author_name' => $res->json('author_name'),
                        'thumbnail_url' => $res->json('thumbnail_url'),
                    ];
                }
            }
        } catch (\Exception $e) {
            // Không chặn tiến trình nếu oEmbed timeout
        }

        return [];
    }
}
