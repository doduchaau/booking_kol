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

        // 6. Facebook (Profile, Fanpage, Reels, Videos, Shortlinks)
        if (preg_match('/fb\.watch\/([a-zA-Z0-9_-]+)/i', $url, $matches)) {
            $shortCode = $matches[1];
            try {
                $response = Http::timeout(4)->withoutRedirecting()->get($url);
                $location = $response->header('Location');
                if ($location) {
                    $cleanLoc = strtok($location, '?');
                    if (preg_match('/facebook\.com\/([a-zA-Z0-9._-]+)\/videos\/([0-9]+)/i', $cleanLoc, $m)) {
                        $handle = CreatorNormalizationService::normalizeHandle($m[1]);
                        return [
                            'platform' => PlatformEnum::FACEBOOK,
                            'handle' => $handle,
                            'url' => $location,
                        ];
                    }
                }
            } catch (\Throwable) {
                // fallback
            }
            return [
                'platform' => PlatformEnum::FACEBOOK,
                'handle' => "fb_watch_{$shortCode}",
                'url' => $url,
            ];
        }

        if (preg_match('/facebook\.com\/share\/r\/([a-zA-Z0-9_-]+)/i', $url, $matches)) {
            return [
                'platform' => PlatformEnum::FACEBOOK,
                'handle' => "fb_reel_{$matches[1]}",
                'url' => $cleanUrl,
            ];
        }

        if (preg_match('/facebook\.com\/reel\/([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)) {
            return [
                'platform' => PlatformEnum::FACEBOOK,
                'handle' => "fb_reel_{$matches[1]}",
                'url' => "https://www.facebook.com/reel/{$matches[1]}",
            ];
        }

        if (preg_match('/facebook\.com\/([a-zA-Z0-9._-]+)\/videos\/([0-9]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            return [
                'platform' => PlatformEnum::FACEBOOK,
                'handle' => $handle,
                'url' => "https://www.facebook.com/{$handle}",
            ];
        }

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

        // 7. Shopee Video / Shop / Shortlinks (vn.shp.ee & shopee.vn)
        if (preg_match('/vn\.shp\.ee\/(?:video\/)?([a-zA-Z0-9._-]+)/i', $url, $matches)) {
            $shortCode = $matches[1];
            try {
                $response = Http::timeout(4)->withoutRedirecting()->get($url);
                $location = $response->header('Location');
                if ($location) {
                    $cleanLoc = strtok($location, '?');
                    if (preg_match('/shopee\.vn\/(?:universal-link\/video|video|feed\/video)\/([a-zA-Z0-9._-]+)/i', $cleanLoc, $m)) {
                        return [
                            'platform' => PlatformEnum::SHOPEE,
                            'handle' => "shopee_video_{$m[1]}",
                            'url' => $location,
                        ];
                    }
                }
            } catch (\Throwable) {
                // fallback
            }

            return [
                'platform' => PlatformEnum::SHOPEE,
                'handle' => "shopee_video_{$shortCode}",
                'url' => $url,
            ];
        }

        if (preg_match('/shopee\.vn\/(?:universal-link\/video|video|feed\/video)\/([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)) {
            $videoId = $matches[1];
            return [
                'platform' => PlatformEnum::SHOPEE,
                'handle' => "shopee_video_{$videoId}",
                'url' => "https://shopee.vn/universal-link/video/{$videoId}",
            ];
        }

        if (preg_match('/shopee\.vn\/shop\/([0-9]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            return [
                'platform' => PlatformEnum::SHOPEE,
                'handle' => $handle,
                'url' => "https://shopee.vn/shop/{$handle}",
            ];
        }

        if (preg_match('/shopee\.vn\/([a-zA-Z0-9._-]+)/i', $cleanUrl, $matches)) {
            $handle = CreatorNormalizationService::normalizeHandle($matches[1]);
            $excludedShopeeKeywords = [
                'buyer', 'cart', 'search', 'flash_sale', 'portal', 'api', 'product',
                'm', 'universal-link', 'video', 'feed', 'affiliate', 'seller',
                'daily_discover', 'user', 'help', 'mall'
            ];
            if (!in_array($handle, $excludedShopeeKeywords)) {
                return [
                    'platform' => PlatformEnum::SHOPEE,
                    'handle' => $handle,
                    'url' => "https://shopee.vn/{$handle}",
                ];
            }
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
