<?php

namespace Modules\Creator\Connectors;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\Creator\Enums\PlatformEnum;

class DataProviderConnector
{
    /**
     * Lấy dữ liệu profile công khai và các bài đăng gần nhất từ Data Provider
     */
    public function fetchProfileWithPosts(string $handle, PlatformEnum $platform): array
    {
        $driver = strtolower(config('services.social_data_provider.driver', 'sandbox'));
        $apiKey = config('services.social_data_provider.api_key');

        if (!empty($apiKey) && $driver !== 'sandbox') {
            try {
                return match ($driver) {
                    'rapidapi' => $this->fetchFromRapidApi($handle, $platform, $apiKey),
                    'apify' => $this->fetchFromApify($handle, $platform, $apiKey),
                    'tikapi' => $this->fetchFromTikApi($handle, $platform, $apiKey),
                    default => $this->fetchFromHttpProvider($handle, $platform, $apiKey),
                };
            } catch (\Throwable $e) {
                Log::channel('kol_sync')->error("Lỗi khi gọi Data Provider Driver [{$driver}] cho @{$handle}: " . $e->getMessage());
                throw $e;
            }
        }

        // Mặc định chạy Sandbox nếu chưa cấu hình API Key
        return $this->fetchFromSandbox($handle, $platform);
    }

    /**
     * Gọi API qua RapidAPI (Ví dụ: TikTok Scraper / TikTok All-in-One)
     */
    protected function fetchFromRapidApi(string $handle, PlatformEnum $platform, string $apiKey): array
    {
        $apiHost = config('services.social_data_provider.api_host', 'tiktok-api23.p.rapidapi.com');
        $baseUrl = config('services.social_data_provider.base_url') ?: "https://{$apiHost}";

        // Trường hợp 1: tiktok-api23 (Lundehund)
        if (str_contains($apiHost, 'tiktok-api23')) {
            $infoResponse = Http::withHeaders([
                'x-rapidapi-key' => $apiKey,
                'x-rapidapi-host' => $apiHost,
                'Accept' => 'application/json',
            ])->timeout(20)->get("{$baseUrl}/api/user/info", [
                'uniqueId' => $handle,
            ]);

            if ($infoResponse->successful()) {
                $infoData = $infoResponse->json();
                $userInfo = $infoData['userInfo'] ?? [];
                $user = $userInfo['user'] ?? [];
                $stats = $userInfo['stats'] ?? [];
                $secUid = $user['secUid'] ?? null;

                $posts = [];
                if (!empty($secUid)) {
                    $postsResponse = Http::withHeaders([
                        'x-rapidapi-key' => $apiKey,
                        'x-rapidapi-host' => $apiHost,
                        'Accept' => 'application/json',
                    ])->timeout(20)->get("{$baseUrl}/api/user/posts", [
                        'secUid' => $secUid,
                        'count' => 15,
                        'cursor' => 0,
                    ]);

                    if ($postsResponse->successful()) {
                        $postsData = $postsResponse->json();
                        $itemList = $postsData['data']['itemList'] ?? ($postsData['itemList'] ?? ($postsData['items'] ?? []));
                        foreach ($itemList as $vid) {
                            $vidStats = $vid['stats'] ?? $vid;
                            $posts[] = [
                                'id' => (string) ($vid['id'] ?? uniqid()),
                                'is_pinned' => !empty($vid['isTop']) || !empty($vid['is_top']) || !empty($vid['isPinned']),
                                'views' => (int) ($vidStats['playCount'] ?? ($vidStats['views'] ?? 0)),
                                'likes' => (int) ($vidStats['diggCount'] ?? ($vidStats['likes'] ?? 0)),
                                'comments' => (int) ($vidStats['commentCount'] ?? ($vidStats['comments'] ?? 0)),
                                'shares' => (int) ($vidStats['shareCount'] ?? ($vidStats['shares'] ?? 0)),
                                'published_at' => isset($vid['createTime']) ? date('c', $vid['createTime']) : now()->toIso8601String(),
                            ];
                        }
                    }
                }

                return [
                    'handle' => $handle,
                    'name' => $user['nickname'] ?? $handle,
                    'platform' => $platform->value,
                    'followers_count' => (int) ($stats['followerCount'] ?? 0),
                    'avatar_url' => $user['avatarLarger'] ?? ($user['avatarThumb'] ?? null),
                    'bio' => $user['signature'] ?? '',
                    'url' => "https://www.tiktok.com/@{$handle}",
                    'recent_posts' => $posts,
                ];
            }

            throw new \RuntimeException("RapidAPI [tiktok-api23] trả lỗi {$infoResponse->status()}: " . $infoResponse->body());
        }

        // Trường hợp 2: tiktok-all-in-one / tiktok-scraper7 và các host khác
        $response = Http::withHeaders([
            'x-rapidapi-key' => $apiKey,
            'x-rapidapi-host' => $apiHost,
            'Accept' => 'application/json',
        ])->timeout(20)->get("{$baseUrl}/user/info", [
            'unique_id' => $handle,
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $user = $data['data']['user'] ?? ($data['user'] ?? []);
            $stats = $data['data']['stats'] ?? ($data['stats'] ?? []);

            $posts = [];
            $rawVideos = $data['data']['videos'] ?? ($data['videos'] ?? []);
            foreach ($rawVideos as $vid) {
                $posts[] = [
                    'id' => $vid['video_id'] ?? ($vid['id'] ?? uniqid()),
                    'is_pinned' => !empty($vid['is_top']) || !empty($vid['is_pinned']),
                    'views' => (int) ($vid['play_count'] ?? ($vid['views'] ?? 0)),
                    'likes' => (int) ($vid['digg_count'] ?? ($vid['likes'] ?? 0)),
                    'comments' => (int) ($vid['comment_count'] ?? ($vid['comments'] ?? 0)),
                    'shares' => (int) ($vid['share_count'] ?? ($vid['shares'] ?? 0)),
                    'published_at' => isset($vid['create_time']) ? date('c', $vid['create_time']) : now()->toIso8601String(),
                ];
            }

            return [
                'handle' => $handle,
                'name' => $user['nickname'] ?? $handle,
                'platform' => $platform->value,
                'followers_count' => (int) ($stats['followerCount'] ?? 0),
                'avatar_url' => $user['avatarLarger'] ?? ($user['avatarThumb'] ?? null),
                'bio' => $user['signature'] ?? '',
                'url' => "https://www.tiktok.com/@{$handle}",
                'recent_posts' => $posts,
            ];
        }

        throw new \RuntimeException("RapidAPI trả lỗi {$response->status()}: " . $response->body());
    }

    /**
     * Gọi API qua Apify Actor
     */
    protected function fetchFromApify(string $handle, PlatformEnum $platform, string $apiKey): array
    {
        $baseUrl = config('services.social_data_provider.base_url', 'https://api.apify.com/v2');
        $actorId = config('services.social_data_provider.api_host', 'clockworks~tiktok-profile-scraper');

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ])->timeout(30)->post("{$baseUrl}/acts/{$actorId}/run-sync-get-dataset-items", [
            'profiles' => [$handle],
        ]);

        if ($response->successful()) {
            $items = $response->json();
            if (!empty($items[0])) {
                $item = $items[0];
                return [
                    'handle' => $handle,
                    'name' => $item['nickname'] ?? $item['name'] ?? $handle,
                    'platform' => $platform->value,
                    'followers_count' => (int) ($item['followers'] ?? $item['fans'] ?? 0),
                    'avatar_url' => $item['avatar'] ?? null,
                    'bio' => $item['signature'] ?? $item['bio'] ?? '',
                    'url' => "https://www.tiktok.com/@{$handle}",
                    'recent_posts' => $item['videos'] ?? [],
                ];
            }
        }

        throw new \RuntimeException("Apify trả lỗi {$response->status()}: " . $response->body());
    }

    /**
     * Gọi API qua TikAPI (tikapi.io)
     */
    protected function fetchFromTikApi(string $handle, PlatformEnum $platform, string $apiKey): array
    {
        $response = Http::withHeaders([
            'X-API-KEY' => $apiKey,
            'Accept' => 'application/json',
        ])->timeout(20)->get('https://api.tikapi.io/public/check', [
            'username' => $handle,
        ]);

        if ($response->successful()) {
            $json = $response->json();
            $userInfo = $json['userInfo']['user'] ?? [];
            $stats = $json['userInfo']['stats'] ?? [];

            return [
                'handle' => $handle,
                'name' => $userInfo['nickname'] ?? $handle,
                'platform' => $platform->value,
                'followers_count' => (int) ($stats['followerCount'] ?? 0),
                'avatar_url' => $userInfo['avatarLarger'] ?? null,
                'bio' => $userInfo['signature'] ?? '',
                'url' => "https://www.tiktok.com/@{$handle}",
                'recent_posts' => [],
            ];
        }

        throw new \RuntimeException("TikAPI trả lỗi {$response->status()}: " . $response->body());
    }

    /**
     * Gọi API Generic HTTP RESTful
     */
    protected function fetchFromHttpProvider(string $handle, PlatformEnum $platform, string $apiKey): array
    {
        $baseUrl = config('services.social_data_provider.base_url', 'https://api.socialdata.io/v1');

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Accept' => 'application/json',
        ])->timeout(20)->get("{$baseUrl}/profile", [
            'platform' => $platform->value,
            'handle' => $handle,
        ]);

        if ($response->successful()) {
            return $response->json();
        }

        throw new \RuntimeException("HTTP Provider trả lỗi {$response->status()}: " . $response->body());
    }

    /**
     * Chế độ Sandbox / Giả lập thông minh (dùng khi chưa cấu hình API Key)
     */
    protected function fetchFromSandbox(string $handle, PlatformEnum $platform): array
    {
        $seed = crc32($handle . $platform->value);
        mt_srand($seed);

        $followers = mt_rand(15_000, 1_500_000);
        $avgBaseViews = (int) round($followers * (mt_rand(8, 35) / 100));

        $posts = [];
        $posts[] = [
            'id' => 'post_pin_1',
            'is_pinned' => true,
            'views' => $avgBaseViews * mt_rand(5, 12),
            'likes' => (int) round($avgBaseViews * 0.4),
            'comments' => (int) round($avgBaseViews * 0.05),
            'shares' => (int) round($avgBaseViews * 0.02),
            'published_at' => now()->subMonths(6)->toIso8601String(),
        ];

        for ($i = 1; $i <= 16; $i++) {
            $postViews = (int) round($avgBaseViews * (mt_rand(70, 140) / 100));
            $postLikes = (int) round($postViews * (mt_rand(4, 9) / 100));
            $postComments = (int) round($postLikes * (mt_rand(2, 6) / 100));
            $postShares = (int) round($postLikes * (mt_rand(1, 4) / 100));

            $posts[] = [
                'id' => "post_{$i}",
                'is_pinned' => false,
                'is_top' => 0,
                'views' => $postViews,
                'likes' => $postLikes,
                'comments' => $postComments,
                'shares' => $postShares,
                'published_at' => now()->subDays($i * 2)->toIso8601String(),
            ];
        }

        mt_srand();

        $formattedName = ucwords(str_replace(['.', '_', '-'], ' ', $handle));
        $phoneSample = '09' . mt_rand(10000000, 99999999);
        $emailSample = "contact.{$handle}@gmail.com";

        return [
            'handle' => $handle,
            'name' => $formattedName,
            'platform' => $platform->value,
            'followers_count' => $followers,
            'avatar_url' => "https://ui-avatars.com/api/?name=" . urlencode($formattedName) . "&background=0D8ABC&color=fff",
            'bio' => "Xin chào, mình là {$formattedName}. Chia sẻ về cuộc sống, review & tips hữu ích. 📩 Booking: {$phoneSample} (Zalo) | Mail: {$emailSample}",
            'url' => match ($platform) {
                PlatformEnum::TIKTOK => "https://www.tiktok.com/@{$handle}",
                PlatformEnum::YOUTUBE => "https://www.youtube.com/@{$handle}",
                PlatformEnum::INSTAGRAM => "https://www.instagram.com/{$handle}",
                PlatformEnum::FACEBOOK => "https://www.facebook.com/{$handle}",
                PlatformEnum::SHOPEE => "https://shopee.vn/shop/{$handle}",
                default => "https://{$platform->value}.com/{$handle}",
            },
            'recent_posts' => $posts,
        ];
    }
}
