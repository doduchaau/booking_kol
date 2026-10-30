<?php

namespace Modules\Creator\Services;

use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;

class KolDataAdapter
{
    /**
     * Chuẩn hóa payload từ Data Provider thành dữ liệu hồ sơ và chỉ số phân tích chuẩn mực
     */
    public function transform(array $rawPayload, PlatformEnum $platform): array
    {
        $bio = $rawPayload['bio'] ?? ($rawPayload['description'] ?? '');
        $followers = (int) ($rawPayload['followers_count'] ?? ($rawPayload['follower_count'] ?? 0));
        
        // 1. Tự động bóc tách SĐT và Email từ Bio qua Regex
        $extractedPhone = $this->extractPhone($bio);
        $extractedEmail = $this->extractEmail($bio);

        // 2. Lọc bỏ bài đăng ghim và lấy tối đa 15 bài gần nhất
        $rawPosts = $rawPayload['recent_posts'] ?? ($rawPayload['videos'] ?? []);
        $cleanPosts = array_values(array_filter($rawPosts, function ($post) {
            $isTop = !empty($post['is_top']) && ($post['is_top'] == 1 || $post['is_top'] === true);
            $isPinned = !empty($post['is_pinned']) && ($post['is_pinned'] === true || $post['is_pinned'] == 1);
            $pinned = !empty($post['pinned']) && ($post['pinned'] === true || $post['pinned'] == 1);
            return !$isTop && !$isPinned && !$pinned;
        }));
        
        $samplePosts = array_slice($cleanPosts, 0, 15);
        $metrics = $this->calculateMetrics($samplePosts, $followers);

        $name = trim($rawPayload['name'] ?? ($rawPayload['nickname'] ?? ($rawPayload['handle'] ?? '')));
        $handle = CreatorNormalizationService::normalizeHandle($rawPayload['handle'] ?? '');
        if (empty($name) && !empty($handle)) {
            $name = $handle;
        }

        $url = trim($rawPayload['url'] ?? '');
        if (empty($url) && !empty($handle)) {
            $url = match ($platform) {
                PlatformEnum::TIKTOK => "https://www.tiktok.com/@{$handle}",
                PlatformEnum::YOUTUBE => "https://www.youtube.com/@{$handle}",
                PlatformEnum::INSTAGRAM => "https://www.instagram.com/{$handle}",
                PlatformEnum::FACEBOOK => "https://www.facebook.com/{$handle}",
                PlatformEnum::SHOPEE => "https://shopee.vn/shop/{$handle}",
                default => "https://{$platform->value}.com/{$handle}",
            };
        }

        return [
            'name' => $name,
            'handle' => $handle,
            'platform' => $platform,
            'url' => $url,
            'avatar_url' => $rawPayload['avatar_url'] ?? null,
            'bio' => $bio,
            'phone' => $extractedPhone,
            'email' => $extractedEmail,
            'followers_count' => $followers,
            'tier' => CreatorNormalizationService::determineTier($followers),
            'metrics' => $metrics,
            'posts_sample_count' => count($samplePosts),
            'raw_posts' => $samplePosts,
        ];
    }

    /**
     * Tính toán các chỉ số trung bình và tỷ lệ tương tác (ER%)
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
            ];
        }

        $totalViews = 0;
        $totalLikes = 0;
        $totalComments = 0;
        $totalShares = 0;

        foreach ($posts as $post) {
            $totalViews += (int) ($post['views'] ?? ($post['play_count'] ?? 0));
            $totalLikes += (int) ($post['likes'] ?? ($post['digg_count'] ?? 0));
            $totalComments += (int) ($post['comments'] ?? ($post['comment_count'] ?? 0));
            $totalShares += (int) ($post['shares'] ?? ($post['share_count'] ?? 0));
        }

        $avgViews = (int) round($totalViews / $count);
        $avgLikes = (int) round($totalLikes / $count);
        $avgComments = (int) round($totalComments / $count);
        $avgShares = (int) round($totalShares / $count);

        $avgInteractions = $avgLikes + $avgComments + $avgShares;

        // ER trên Followers (%) = (avgInteractions / followers) * 100
        $erFollowers = $followers > 0 ? round(($avgInteractions / $followers) * 100, 2) : 0.0;
        // ER trên Views (%) = (avgInteractions / avgViews) * 100
        $erViews = $avgViews > 0 ? round(($avgInteractions / $avgViews) * 100, 2) : 0.0;

        return [
            'avg_views' => $avgViews,
            'avg_likes' => $avgLikes,
            'avg_comments' => $avgComments,
            'avg_shares' => $avgShares,
            'engagement_rate' => $erFollowers,
            'view_engagement_rate' => $erViews,
        ];
    }

    /**
     * Bóc tách số điện thoại Việt Nam từ văn bản Bio và chuẩn hóa về 10 chữ số
     */
    public function extractPhone(?string $bio): ?string
    {
        if (empty($bio)) {
            return null;
        }

        // Bắt các định dạng: 0912345678, 0912.345.678, 0912 345 678, +84912345678, 84912345678, 0084...
        if (preg_match('/(?:(?:\+|00)?84|0)\s*[35789]\s*(?:[0-9][\s.\-_]*){8}/', $bio, $matches)) {
            return CreatorNormalizationService::normalizePhone($matches[0]);
        }

        return null;
    }

    /**
     * Bóc tách Email từ văn bản Bio
     */
    public function extractEmail(?string $bio): ?string
    {
        if (empty($bio)) {
            return null;
        }

        if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i', $bio, $matches)) {
            return strtolower(trim($matches[0]));
        }

        return null;
    }
}
