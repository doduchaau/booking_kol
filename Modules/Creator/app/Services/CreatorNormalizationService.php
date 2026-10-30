<?php

namespace Modules\Creator\Services;

use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;

class CreatorNormalizationService
{
    /**
     * Chuẩn hóa số điện thoại Việt Nam về định dạng 10 số (bắt đầu bằng 0)
     * Tự động khôi phục số 0 ở đầu bị Excel làm mất khi format ô là Number/General
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        // Bỏ mọi ký tự không phải số (khoảng trắng, dấu chấm, dấu gạch nối, dấu cộng, ngoặc)
        $clean = preg_replace('/[^\d]/', '', (string) $phone);

        // Khôi phục số 0 ở đầu bị Excel làm mất: 9 chữ số bắt đầu bằng 3, 5, 7, 8, 9
        if (strlen($clean) === 9 && in_array($clean[0], ['3', '5', '7', '8', '9'], true)) {
            $clean = '0' . $clean;
        }

        // Xử lý mã quốc gia +84 hoặc 84 (chuỗi 11 số bắt đầu bằng 84)
        if (str_starts_with($clean, '84') && strlen($clean) === 11) {
            $clean = '0' . substr($clean, 2);
        }

        // Nếu hợp lệ 10 số và bắt đầu bằng 0
        if (strlen($clean) === 10 && str_starts_with($clean, '0')) {
            return $clean;
        }

        return $clean ?: null;
    }

    /**
     * Chuẩn hóa username / handle mạng xã hội
     */
    public static function normalizeHandle(?string $handle): string
    {
        if (empty($handle)) {
            return '';
        }

        // Bỏ ký tự @ ở đầu, chuyển chữ thường và cắt khoảng trắng
        return strtolower(trim(ltrim(trim($handle), '@')));
    }

    /**
     * Tự động xác định Tier dựa trên số lượng người theo dõi (followers)
     */
    public static function determineTier(int $followers): CreatorTierEnum
    {
        return match (true) {
            $followers >= 1_000_000 => CreatorTierEnum::MEGA,
            $followers >= 100_000 => CreatorTierEnum::MACRO,
            $followers >= 10_000 => CreatorTierEnum::MICRO,
            default => CreatorTierEnum::NANO,
        };
    }

    /**
     * Chuyển đổi chuỗi chỉ số / tiền tệ thành số nguyên
     * Hỗ trợ viết tắt kẹp giữa: 4tr5, 1m2, 500k, 3 củ, 1.25M, 1.250.000
     */
    public static function parseMetricNumber(mixed $val): int
    {
        if (is_numeric($val)) {
            return max((int) round((float) $val), 0);
        }

        if (empty($val) || !is_string($val)) {
            return 0;
        }

        $clean = trim($val);
        $normalized = self::removeVietnameseAccents(mb_strtolower($clean));

        // Nếu là text ghi chú thương lượng, liên hệ
        if (preg_match('/^(lien he|tang kem|thuong luong|n\/a|none|-|--)$/i', $normalized)) {
            return 0;
        }

        // Xử lý viết tắt kẹp giữa tiếng Việt: "4tr5" -> 4.5 * 1M; "1m2" -> 1.2 * 1M; "1k5" -> 1.5 * 1K
        if (preg_match('/^(\d+)\s*(tr|m|trieu|cu)\s*(\d+)$/i', $normalized, $m)) {
            $integerPart = (float) $m[1];
            $decimalPart = (float) ('0.' . $m[3]);
            return (int) round(($integerPart + $decimalPart) * 1_000_000);
        }

        if (preg_match('/^(\d+)\s*(k|n|nghin|ngan)\s*(\d+)$/i', $normalized, $m)) {
            $integerPart = (float) $m[1];
            $decimalPart = (float) ('0.' . $m[3]);
            return (int) round(($integerPart + $decimalPart) * 1_000);
        }

        if (preg_match('/^(\d+)\s*(b|ty)\s*(\d+)$/i', $normalized, $m)) {
            $integerPart = (float) $m[1];
            $decimalPart = (float) ('0.' . $m[3]);
            return (int) round(($integerPart + $decimalPart) * 1_000_000_000);
        }

        // Kiểm tra hậu tố
        $multiplier = 1;
        if (preg_match('/(b|ty|ti)(\b|$)/i', $normalized)) {
            $multiplier = 1_000_000_000;
        } elseif (preg_match('/(m|tr|trieu|cu)(\b|$)/i', $normalized)) {
            $multiplier = 1_000_000;
        } elseif (preg_match('/(k|n|nghin|ngan)(\b|$)/i', $normalized)) {
            $multiplier = 1_000;
        }

        // Chuẩn hóa chuỗi số:
        // Phân biệt "1.25M" (thập phân) vs "1.250.000" (dấu chấm hàng nghìn)
        $numStr = preg_replace('/[^\d.,]/', '', $clean);

        if ($multiplier > 1) {
            // Khi có hậu tố M/K/B: dấu chấm hoặc phẩy là dấu thập phân (1.25M hoặc 1,25M)
            $numStr = str_replace(',', '.', $numStr);
            $num = (float) $numStr;
            return (int) round($num * $multiplier);
        }

        // Khi không có hậu tố: xử lý dấu phân cách hàng nghìn
        // Nếu có nhiều hơn 1 dấu chấm hoặc phẩy, chắc chắn là phân cách hàng nghìn
        if (substr_count($numStr, '.') > 1 || substr_count($numStr, ',') > 1) {
            $numStr = str_replace(['.', ','], '', $numStr);
        } elseif (preg_match('/^\d{1,3}[.,]\d{3}$/', $numStr)) {
            // Dạng 1.000 hoặc 1,000 -> hàng nghìn
            $numStr = str_replace(['.', ','], '', $numStr);
        } elseif (str_contains($numStr, ',')) {
            // Nếu có 1 dấu phẩy đơn lẻ có thể là thập phân
            $numStr = str_replace(',', '.', $numStr);
        }

        return max((int) round((float) $numStr), 0);
    }

    /**
     * Phân giải giá booking và ghi chú giá đi kèm
     * Ví dụ: "4tr5" -> price: 4500000; "Liên hệ" -> price: 0, note: "Liên hệ"
     */
    public static function parseRatePrice(mixed $val): array
    {
        if ($val === null || $val === '') {
            return ['price' => 0.0, 'note' => null];
        }

        if (is_numeric($val)) {
            return ['price' => max((float) $val, 0.0), 'note' => null];
        }

        $str = trim((string) $val);
        $normalized = self::removeVietnameseAccents(mb_strtolower($str));

        if (preg_match('/^(lien he|tang kem|thuong luong|n\/a|none|-|--|deal)$/i', $normalized)) {
            return [
                'price' => 0.0,
                'note' => $str,
            ];
        }

        $price = (float) self::parseMetricNumber($str);

        return [
            'price' => $price,
            'note' => $price === 0.0 ? $str : null,
        ];
    }

    /**
     * Chuyển đổi tỷ lệ phần trăm (e.g. "4.5%", "3,85%", 0.045) thành số float hiển thị % (e.g. 4.50)
     */
    public static function parsePercentage(mixed $val, string $columnName = ''): float
    {
        $cleanCol = self::removeVietnameseAccents(mb_strtolower(trim($columnName)));

        if (is_numeric($val)) {
            $num = (float) $val;
            // Nếu giá trị nằm trong khoảng (0, 1), Excel đã tự chia cho 100 khi format dạng %
            // hoặc tên cột có từ khóa ER/tương tác/% -> nhân 100 để lưu giá trị hiển thị phần trăm
            if ($num > 0 && $num < 1 && (empty($columnName) || str_contains($cleanCol, '%') || str_contains($cleanCol, 'er') || str_contains($cleanCol, 'tuong tac') || str_contains($cleanCol, 'interaction'))) {
                return round($num * 100, 2);
            }
            return round($num, 2);
        }

        if (empty($val) || !is_string($val)) {
            return 0.0;
        }

        $clean = trim(str_replace(['%', ' '], '', $val));
        $clean = str_replace(',', '.', $clean);

        if (!is_numeric($clean)) {
            return 0.0;
        }

        $num = (float) $clean;
        if ($num > 0 && $num < 1 && (str_contains($val, '%') || str_contains($cleanCol, '%') || str_contains($cleanCol, 'er') || str_contains($cleanCol, 'tuong tac'))) {
            return round($num * 100, 2);
        }

        return round($num, 2);
    }

    /**
     * Chuyển đổi GMV ước tính từ chuỗi tiền tệ (VND, USD) thành số nguyên VND
     */
    public static function parseGmv(mixed $val): int
    {
        if (is_numeric($val)) {
            return max((int) round((float) $val), 0);
        }

        if (empty($val) || !is_string($val)) {
            return 0;
        }

        $isUsd = str_contains($val, '$') || str_contains(strtoupper($val), 'USD');
        $clean = preg_replace('/[^\d.,]/', '', str_replace(',', '', $val));
        $num = (float) $clean;

        // Nếu là tiền USD, tạm tính tỷ giá 25.000 VND/$
        if ($isUsd) {
            $num *= 25_000;
        }

        return (int) round($num);
    }

    /**
     * Trích xuất số điện thoại và email từ chuỗi thông tin liên hệ / bio
     */
    public static function extractContactInfo(?string $text): array
    {
        if (empty($text)) {
            return ['phone' => null, 'email' => null];
        }

        // Tìm SĐT di động Việt Nam
        $phone = null;
        if (preg_match('/(?:(?:\+84|84|0)[3|5|7|8|9][0-9]{8})/', $text, $matches)) {
            $phone = self::normalizePhone($matches[0]);
        }

        // Tìm Email
        $email = null;
        if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $text, $matches)) {
            $email = strtolower(trim($matches[0]));
        }

        return [
            'phone' => $phone,
            'email' => $email,
        ];
    }

    /**
     * Suy luận chéo giữa Profile URL, Platform và Handle
     */
    public static function inferPlatformAndHandle(?string $url, ?string $handle = null, ?string $platform = null): array
    {
        $resolvedUrl = trim((string) $url);
        $resolvedHandle = self::normalizeHandle($handle);
        $resolvedPlatform = $platform ? strtolower(trim($platform)) : null;

        if (!empty($resolvedUrl)) {
            $parsed = UrlNormalizer::parse($resolvedUrl);
            if ($parsed && !empty($parsed['handle'])) {
                $resolvedHandle = $resolvedHandle ?: $parsed['handle'];
                $resolvedPlatform = $resolvedPlatform ?: ($parsed['platform'] instanceof PlatformEnum ? $parsed['platform']->value : (string) $parsed['platform']);
                $resolvedUrl = $parsed['url'];
            }
        }

        if (!$resolvedPlatform) {
            $resolvedPlatform = 'tiktok';
        }

        if (empty($resolvedUrl) && !empty($resolvedHandle)) {
            $resolvedUrl = match ($resolvedPlatform) {
                'tiktok' => "https://www.tiktok.com/@{$resolvedHandle}",
                'facebook' => "https://www.facebook.com/{$resolvedHandle}",
                'instagram' => "https://www.instagram.com/{$resolvedHandle}",
                'youtube' => "https://www.youtube.com/@{$resolvedHandle}",
                'shopee' => "https://shopee.vn/shop/{$resolvedHandle}",
                default => "https://{$resolvedPlatform}.com/@{$resolvedHandle}",
            };
        }

        return [
            'url' => $resolvedUrl,
            'handle' => $resolvedHandle,
            'platform' => $resolvedPlatform,
        ];
    }

    /**
     * Xóa dấu tiếng Việt, chuyển chữ thường và lọc ký tự đặc biệt
     */
    public static function removeVietnameseAccents(string $str): string
    {
        $str = mb_strtolower($str, 'UTF-8');
        
        $patterns = [
            '/[àáạảãâầấậẩẫăằắặẳẵ]/u' => 'a',
            '/[èéẹẻẽêềếệểễ]/u' => 'e',
            '/[ìíịỉĩ]/u' => 'i',
            '/[òóọỏõôồốộổỗơờớợởỡ]/u' => 'o',
            '/[ùúụủũưừứựửữ]/u' => 'u',
            '/[ỳýỵỷỹ]/u' => 'y',
            '/đ/u' => 'd',
        ];

        return preg_replace(array_keys($patterns), array_values($patterns), $str);
    }
}
