<?php

declare(strict_types=1);

namespace App\Services\Kol;

use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Services\CreatorNormalizationService;

class KolDataAdapter
{
    /**
     * Chuyển đổi toàn bộ dữ liệu telemetry từ Playwright thành mảng chuẩn mực
     * tương thích 100% với cấu trúc một dòng dữ liệu của Excel Import
     *
     * @param array<string, mixed> $telemetry Dữ liệu thô từ PlaywrightNetworkConnector
     * @param string $platform Tên nền tảng (tiktok, shopee, kalodata)
     * @return array<string, mixed> Mảng chuẩn hóa để lưu DB hoặc cập nhật Model Kol
     */
    public function transform(array $telemetry, string $platform = 'tiktok'): array
    {
        $platformKey = strtolower(trim($telemetry['platform'] ?? $platform));
        $profile = $telemetry['profile'] ?? [];
        $rawPosts = $telemetry['posts'] ?? [];
        $xhrDumps = $telemetry['xhr_dumps'] ?? [];

        // 1. Bóc tách thông tin cá nhân cơ bản
        $uniqueId = trim((string) ($profile['uniqueId'] ?? ($profile['handle'] ?? '')));
        $nickname = trim((string) ($profile['nickname'] ?? ($profile['name'] ?? '')));
        $bio = (string) ($profile['signature'] ?? ($profile['bio'] ?? ($profile['description'] ?? '')));
        $avatarUrl = $profile['avatarLarger'] ?? ($profile['avatar_url'] ?? null);

        $handle = $this->normalizeHandle($uniqueId ?: $nickname);
        $name = !empty($nickname) ? $nickname : ($uniqueId ?: $handle);

        $followers = (int) ($profile['followerCount'] ?? ($profile['followers_count'] ?? 0));
        $heartCount = (int) ($profile['heartCount'] ?? 0);
        $videoCount = (int) ($profile['videoCount'] ?? 0);

        // 2. Bóc tách liên hệ tự động từ Bio bằng Regex
        $extractedPhone = $this->extractPhone($bio);
        $extractedEmail = $this->extractEmail($bio);

        // 3. Lọc bài ghim (Pinned Posts) và lấy tối đa 15 video mới nhất
        $cleanPosts = array_values(array_filter($rawPosts, function (array $post): bool {
            $isPinned = !empty($post['isPinnedItem']) && ($post['isPinnedItem'] === true || $post['isPinnedItem'] === 1);
            $isTop = !empty($post['is_top']) && ($post['is_top'] === true || $post['is_top'] === 1);
            $pinned = !empty($post['pinned']) && ($post['pinned'] === true || $post['pinned'] === 1);
            return !$isPinned && !$isTop && !$pinned;
        }));

        $samplePosts = array_slice($cleanPosts, 0, 15);

        // 4. Tính toán chỉ số tương tác trung bình & ER%
        $metrics = $this->calculateMetrics($samplePosts, $followers);

        // 5. Trích xuất GMV / Revenue từ XHR Kalodata / TikTok Affiliate nếu có
        $commerceMetrics = $this->extractCommerceMetrics($xhrDumps, $platformKey);

        // 6. Xác định Tier theo số lượng follower
        $tier = $this->determineTier($followers);

        // 7. Tạo link trang cá nhân sạch
        $targetUrl = $telemetry['resolved_url'] ?? ($profile['url'] ?? $this->buildProfileUrl($platformKey, $handle));

        $rawMetrics = array_merge([
            'heart_count' => $heartCount,
            'video_count' => $videoCount,
            'avg_views' => $metrics['avg_views'],
            'avg_likes' => $metrics['avg_likes'],
            'avg_comments' => $metrics['avg_comments'],
            'avg_shares' => $metrics['avg_shares'],
            'sample_posts_count' => count($samplePosts),
            'gmv_30d' => $commerceMetrics['gmv_30d'],
            'avg_live_views' => $commerceMetrics['avg_live_views'],
            'synced_at' => now()->toIso8601String(),
        ], $commerceMetrics['additional_data'] ?? []);

        return [
            // Cột định danh & liên hệ (tương đương bảng kols / creators)
            'name' => $name,
            'handle' => $handle,
            'phone' => $extractedPhone,
            'email' => $extractedEmail,
            'platform' => $this->resolvePlatformEnumString($platformKey),
            'url' => $targetUrl,
            'avatar_url' => $avatarUrl,
            'bio' => $bio,
            'niche' => 'general',
            'tier' => $tier,
            'notes' => !empty($bio) ? "Bio: {$bio}" : null,
            'shipping_address' => null,
            'city_province' => null,
            'district' => null,
            'rate_price' => 0.0,

            // Cột chỉ số tương tác (tương đương creator_accounts)
            'followers_count' => $followers,
            'metrics' => $metrics,
            'average_views' => $metrics['avg_views'],
            'average_likes' => $metrics['avg_likes'],
            'average_comments' => $metrics['avg_comments'],
            'average_shares' => $metrics['avg_shares'],
            'engagement_rate' => $metrics['engagement_rate'], // ER% trên Views
            'view_engagement_rate' => $metrics['view_engagement_rate'], // ER% trên Views
            'er_followers' => $metrics['er_followers'], // ER% trên Followers
            'posts_sample_count' => count($samplePosts),
            'gmv_estimate' => $commerceMetrics['gmv_30d'] > 0 ? (int) $commerceMetrics['gmv_30d'] : 0,

            // Cột viễn trắc JSON mở rộng
            'raw_metrics' => $rawMetrics,
            'data_source' => 'playwright_interception',
            'raw_posts' => $samplePosts,
        ];
    }

    /**
     * Tính toán chỉ số tương tác trung bình và ER% từ mảng bài đăng mẫu (tối đa 15 bài)
     *
     * Công thức ER% trên Views:
     * round(((avg_likes + avg_comments + avg_shares) / max(avg_views, 1)) * 100, 2)
     */
    public function calculateMetrics(array $posts, int $followers): array
    {
        $count = count($posts);
        if ($count === 0) {
            return [
                'avg_views' => 0,
                'avg_likes' => 0,
                'avg_comments' => 0,
                'avg_shares' => 0,
                'engagement_rate' => 0.0,
                'view_engagement_rate' => 0.0,
                'er_followers' => 0.0,
            ];
        }

        $totalViews = 0;
        $totalLikes = 0;
        $totalComments = 0;
        $totalShares = 0;

        foreach ($posts as $post) {
            $stats = $post['stats'] ?? $post;
            $totalViews += (int) ($stats['playCount'] ?? ($stats['play_count'] ?? ($stats['views'] ?? 0)));
            $totalLikes += (int) ($stats['diggCount'] ?? ($stats['digg_count'] ?? ($stats['likes'] ?? 0)));
            $totalComments += (int) ($stats['commentCount'] ?? ($stats['comment_count'] ?? ($stats['comments'] ?? 0)));
            $totalShares += (int) ($stats['shareCount'] ?? ($stats['share_count'] ?? ($stats['shares'] ?? 0)));
        }

        $avgViews = (int) round($totalViews / $count);
        $avgLikes = (int) round($totalLikes / $count);
        $avgComments = (int) round($totalComments / $count);
        $avgShares = (int) round($totalShares / $count);

        $avgInteractions = $avgLikes + $avgComments + $avgShares;

        // Tỷ lệ tương tác chuẩn trên Lượt xem (ER on Views)
        $erViews = round(($avgInteractions / max($avgViews, 1)) * 100, 2);

        // Tỷ lệ tương tác trên Người theo dõi (ER on Followers)
        $erFollowers = $followers > 0 ? round(($avgInteractions / $followers) * 100, 2) : 0.0;

        return [
            'avg_views' => $avgViews,
            'avg_likes' => $avgLikes,
            'avg_comments' => $avgComments,
            'avg_shares' => $avgShares,
            'engagement_rate' => $erViews,
            'view_engagement_rate' => $erViews,
            'er_followers' => $erFollowers,
        ];
    }

    /**
     * Bóc tách số điện thoại Việt Nam từ văn bản Bio bằng Regex
     * Hỗ trợ chuẩn đầu số 03|05|07|08|09 hoặc +84, kể cả khi viết cách khoảng trắng hoặc dấu chấm
     */
    public function extractPhone(?string $bio): ?string
    {
        if (empty($bio)) {
            return null;
        }

        // Bắt mọi biến thể SĐT Việt Nam:
        // (+84) 866.554.433, +84 98.xxx.xxxx, 098.xxx.xxxx, 098 xxx xxxx, 8498xxxxxxx, etc.
        $pattern = '/(?:\(?\+84\)?|\(?0084\)?|84|0)\s*[35789](?:[\s.\-_]*\d){8}/';
        if (preg_match($pattern, $bio, $matches)) {
            $rawPhone = $matches[0];
            // Làm sạch về 10 chữ số chuẩn
            $digits = preg_replace('/[^\d]/', '', $rawPhone);
            if (str_starts_with($digits, '84') && strlen($digits) === 11) {
                $digits = '0' . substr($digits, 2);
            }
            if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
                return $digits;
            }
        }

        return null;
    }

    /**
     * Bóc tách địa chỉ Email từ văn bản Bio bằng Regex
     */
    public function extractEmail(?string $bio): ?string
    {
        if (empty($bio)) {
            return null;
        }

        $pattern = '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i';
        if (preg_match($pattern, $bio, $matches)) {
            return strtolower(trim($matches[0]));
        }

        return null;
    }

    /**
     * Trích xuất chỉ số GMV và Live Views từ các gói tin XHR intercepted của Kalodata / Shopee
     */
    public function extractCommerceMetrics(array $xhrDumps, string $platform): array
    {
        $gmv30d = 0.0;
        $avgLiveViews = 0;
        $additional = [];

        foreach ($xhrDumps as $dump) {
            $data = $dump['data'] ?? [];
            if (!is_array($data)) {
                continue;
            }

            // Tìm kiếm đệ quy các trường GMV / Doanh thu
            $foundGmv = $this->searchKeysRecursive($data, [
                'gmv', 'gmv_30d', 'gmv30d', 'sales_amount', 'revenue', 'revenue_30d', 'total_sales'
            ]);
            if ($foundGmv !== null && is_numeric($foundGmv) && (float) $foundGmv > $gmv30d) {
                $gmv30d = (float) $foundGmv;
            }

            // Tìm kiếm lượt xem Live
            $foundLiveViews = $this->searchKeysRecursive($data, [
                'avg_live_views', 'live_views', 'live_viewers', 'live_avg_viewers'
            ]);
            if ($foundLiveViews !== null && is_numeric($foundLiveViews) && (int) $foundLiveViews > $avgLiveViews) {
                $avgLiveViews = (int) $foundLiveViews;
            }

            // Tìm thêm hoa hồng hoặc danh mục sản phẩm nếu có
            $commission = $this->searchKeysRecursive($data, ['commission_rate', 'commission']);
            if ($commission !== null) {
                $additional['commission_rate'] = $commission;
            }
        }

        return [
            'gmv_30d' => $gmv30d,
            'avg_live_views' => $avgLiveViews,
            'additional_data' => $additional,
        ];
    }

    /**
     * Tìm giá trị của một trong các khóa mục tiêu trong mảng lồng nhau
     */
    protected function searchKeysRecursive(array $data, array $targetKeys): mixed
    {
        foreach ($targetKeys as $targetKey) {
            if (array_key_exists($targetKey, $data) && $data[$targetKey] !== null && $data[$targetKey] !== '') {
                return $data[$targetKey];
            }
        }

        foreach ($data as $value) {
            if (is_array($value)) {
                $found = $this->searchKeysRecursive($value, $targetKeys);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }

    /**
     * Chuẩn hóa handle không dấu, không khoảng trắng, không ký tự @
     */
    public function normalizeHandle(?string $handle): string
    {
        if (empty($handle)) {
            return '';
        }

        return strtolower(trim(ltrim(trim($handle), '@')));
    }

    /**
     * Xác định Tier theo số lượng follower
     */
    public function determineTier(int $followers): string
    {
        return match (true) {
            $followers >= 1_000_000 => 'mega',
            $followers >= 100_000 => 'macro',
            $followers >= 10_000 => 'micro',
            default => 'nano',
        };
    }

    /**
     * Xây dựng Profile URL chuẩn theo nền tảng
     */
    protected function buildProfileUrl(string $platform, string $handle): string
    {
        if (empty($handle)) {
            return '';
        }

        return match ($platform) {
            'tiktok' => "https://www.tiktok.com/@{$handle}",
            'shopee' => "https://shopee.vn/shop/{$handle}",
            'youtube' => "https://www.youtube.com/@{$handle}",
            'facebook' => "https://www.facebook.com/{$handle}",
            'instagram' => "https://www.instagram.com/{$handle}",
            default => "https://{$platform}.com/@{$handle}",
        };
    }

    /**
     * Chuyển đổi tên platform thành chuỗi enum chuẩn
     */
    protected function resolvePlatformEnumString(string $platform): string
    {
        $platform = strtolower(trim($platform));
        if (in_array($platform, ['tiktok', 'shopee', 'facebook', 'instagram', 'youtube', 'zalo'], true)) {
            return $platform;
        }

        return 'tiktok';
    }
}
