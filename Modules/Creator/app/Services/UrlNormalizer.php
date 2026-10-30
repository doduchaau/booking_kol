<?php

namespace Modules\Creator\Services;

use Illuminate\Support\Facades\Http;
use Modules\Creator\Enums\PlatformEnum;

class UrlNormalizer
{
    /**
     * Phân tích một URL đơn lẻ và trả về Platform, Handle và URL chuẩn
     */
    public static function parse(string $url): ?array
    {
        $url = trim($url);
        if (empty($url)) {
            return null;
        }

        // Bỏ query parameters và trailing slash
        $cleanUrl = strtok($url, '?');
        $cleanUrl = rtrim($cleanUrl, '/');

        // 1. TikTok Shortlinks (vt.tiktok.com, vm.tiktok.com)
        if (preg_match('/(?:vt|vm)\.tiktok\.com\/([a-zA-Z0-9]+)/i', $url, $matches)) {
            try {
                $response = Http::timeout(4)->withoutRedirecting()->get($url);
                $location = $response->header('Location');
                if ($location && preg_match('/tiktok\.com\/@([a-zA-Z0-9._-]+)/i', $location, $finalMatches)) {
                    $handle = CreatorNormalizationService::normalizeHandle($finalMatches[1]);
                    return [
                        'platform' => PlatformEnum::TIKTOK,
                        'handle' => $handle,
                        'url' => "https://www.tiktok.com/@{$handle}",
                    ];
                }
            } catch (\Throwable) {
                // fallback
            }

            $shortCode = strtolower($matches[1]);
            return [
                'platform' => PlatformEnum::TIKTOK,
                'handle' => "tiktok_{$shortCode}",
                'url' => $url,
            ];
        }

        // 2. TikTok Standard Profile hoặc Video Link: tiktok.com/@username/...
        if (preg_match('/tiktok\.com\/@([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            return [
                'platform' => PlatformEnum::TIKTOK,
                'handle' => $handle,
                'url' => "https://www.tiktok.com/@{$handle}",
            ];
        }

        // 3. TikTok không có ký tự @ (ví dụ tiktok.com/username)
        if (preg_match('/tiktok\.com\/([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            if (!in_array($handle, ['tag', 'discover', 'live', 'explore', 'upload', 'about', 'legal', 'business'])) {
                return [
                    'platform' => PlatformEnum::TIKTOK,
                    'handle' => $handle,
                    'url' => "https://www.tiktok.com/@{$handle}",
                ];
            }
        }

        // 4. YouTube (@handle, /c/, /channel/, /user/)
        if (preg_match('/youtube\.com\/(?:@|c\/|channel\/|user\/)?([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            if (!in_array($handle, ['watch', 'shorts', 'feed', 'results', 'premium'])) {
                return [
                    'platform' => PlatformEnum::YOUTUBE,
                    'handle' => $handle,
                    'url' => "https://www.youtube.com/@{$handle}",
                ];
            }
        }

        // 5. Instagram
        if (preg_match('/instagram\.com\/([a-zA-Z0-9._]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            if (!in_array($handle, ['p', 'reel', 'stories', 'explore', 'direct'])) {
                return [
                    'platform' => PlatformEnum::INSTAGRAM,
                    'handle' => $handle,
                    'url' => "https://www.instagram.com/{$handle}",
                ];
            }
        }

        // 6. Facebook Profile / Fanpage
        if (preg_match('/facebook\.com\/profile\.php/i', $url) && preg_match('/[?&]id=([0-9]+)/i', $url, $matches)) {
            $handle = $matches[1];
            return [
                'platform' => PlatformEnum::FACEBOOK,
                'handle' => $handle,
                'url' => "https://www.facebook.com/profile.php?id={$handle}",
            ];
        } elseif (preg_match('/facebook\.com\/([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            if (!in_array($handle, ['groups', 'watch', 'pages', 'share', 'events', 'photo', 'posts', 'reel'])) {
                return [
                    'platform' => PlatformEnum::FACEBOOK,
                    'handle' => $handle,
                    'url' => "https://www.facebook.com/{$handle}",
                ];
            }
        }

        // 7. Shopee Video / Shop
        if (preg_match('/shopee\.vn\/universal-link\/video\/([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)
            || preg_match('/shopee\.vn\/shop\/([0-9]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            return [
                'platform' => PlatformEnum::SHOPEE,
                'handle' => $handle,
                'url' => $cleanUrl,
            ];
        }

        // 8. Hỗ trợ nhập trực tiếp @handle
        if (str_starts_with($url, '@')) {
            $handle = CreatorNormalizationService::normalizeHandle($url);
            return [
                'platform' => PlatformEnum::TIKTOK,
                'handle' => $handle,
                'url' => "https://www.tiktok.com/@{$handle}",
            ];
        }

        return null;
    }

    /**
     * Phân giải một khối văn bản chứa nhiều dòng URL (Batch URLs)
     */
    public static function parseBatch(string $batchText): array
    {
        $lines = preg_split('/[\r\n,]+/', $batchText);
        $results = [];
        $seen = [];

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if (empty($trimmed)) {
                continue;
            }

            if (isset($seen[$trimmed])) {
                continue;
            }
            $seen[$trimmed] = true;

            $parsed = self::parse($trimmed);
            if ($parsed) {
                $results[] = [
                    'raw_input' => $trimmed,
                    'is_valid' => true,
                    'platform' => $parsed['platform']->value,
                    'handle' => $parsed['handle'],
                    'url' => $parsed['url'],
                    'error' => null,
                ];
            } else {
                $results[] = [
                    'raw_input' => $trimmed,
                    'is_valid' => false,
                    'platform' => null,
                    'handle' => null,
                    'url' => null,
                    'error' => 'Định dạng liên kết mạng xã hội không hợp lệ',
                ];
            }
        }

        return $results;
    }
}
