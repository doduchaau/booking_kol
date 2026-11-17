<?php

namespace Modules\Content\Services;

use Carbon\Carbon;
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
        $apiKey = config('services.youtube.api_key');
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

        // 1. TẦNG 1: TikWM Public API (Real-time, miễn phí, trả về đầy đủ views, likes, comments, shares, title, author)
        $tikwmData = $this->fetchFromTikWmApi($canonicalUrl);
        if (!empty($tikwmData) && isset($tikwmData['views_count'])) {
            return $tikwmData;
        }

        // 2. TẦNG 2: HTML Scraping trực tiếp từ trang TikTok Web với Chrome Browser Headers
        $scrapedData = $this->scrapeTikTokHtmlStats($canonicalUrl);
        if (!empty($scrapedData) && isset($scrapedData['views_count'])) {
            return $scrapedData;
        }

        // 3. TẦNG 3: RapidAPI / TikAPI nếu có cấu hình API Key trả phí
        $apiKey = config('services.social_data_provider.api_key');
        $driver = strtolower(config('services.social_data_provider.driver', 'sandbox'));
        $apiHost = config('services.social_data_provider.api_host', 'tiktok-api23.p.rapidapi.com');

        if (!empty($apiKey) && $driver !== 'sandbox' && $videoId) {
            try {
                $res = Http::withHeaders([
                    'x-rapidapi-key' => $apiKey,
                    'x-rapidapi-host' => $apiHost,
                    'Accept' => 'application/json',
                ])->timeout(10)->get("https://{$apiHost}/api/post/info", [
                    'postId' => $videoId,
                ]);

                if ($res->successful()) {
                    $itemInfo = $res->json('itemInfo.itemStruct') ?? $res->json('data') ?? [];
                    $stats = $itemInfo['stats'] ?? [];

                    return [
                        'source' => 'tiktok_provider_api',
                        'title' => $itemInfo['desc'] ?? null,
                        'author_name' => $itemInfo['author']['nickname'] ?? null,
                        'views_count' => (int) ($stats['playCount'] ?? 0),
                        'likes_count' => (int) ($stats['diggCount'] ?? 0),
                        'comments_count' => (int) ($stats['commentCount'] ?? 0),
                        'shares_count' => (int) ($stats['shareCount'] ?? 0),
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning("TikTok Data Provider fetch failed: " . $e->getMessage(), ['url' => $url]);
            }
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
     * Chuẩn hóa URL TikTok và xử lý resolve Shortlink (vt.tiktok.com, vm.tiktok.com)
     */
    public function resolveTikTokCanonicalUrl(string $url): string
    {
        $url = trim($url);

        // Nếu là short link vt.tiktok.com hoặc vm.tiktok.com
        if (preg_match('/(?:vt|vm)\.tiktok\.com\/([\w-]+)/i', $url)) {
            try {
                $response = Http::timeout(5)->withoutRedirecting()->head($url);
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

        // 1. Meta Graph API oEmbed nếu có cấu hình Facebook Client Token
        $clientToken = config('services.facebook.client_token');
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
