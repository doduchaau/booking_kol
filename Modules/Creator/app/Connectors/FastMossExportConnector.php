<?php

namespace Modules\Creator\Connectors;

use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Services\CreatorNormalizationService;

class FastMossExportConnector implements CreatorDataConnectorInterface
{
    /**
     * Chuyển đổi một dòng dữ liệu từ file xuất FastMoss thành mảng chuẩn hóa
     */
    public function parse(mixed $payload): array
    {
        $row = is_array($payload) ? $payload : (array) $payload;

        // Chuẩn hóa key thành chữ thường không dấu cách để linh hoạt bắt cột
        $normalizedRow = [];
        foreach ($row as $k => $v) {
            $cleanKey = strtolower(trim(str_replace(['_', '-', '.', ' '], '', (string) $k)));
            $normalizedRow[$cleanKey] = $v;
        }

        // 1. Tên và Handle
        $name = trim($this->findValue($normalizedRow, ['influencer', 'bloggername', 'creator', 'name']) ?? '');
        $rawHandle = $this->findValue($normalizedRow, ['tiktokid', 'uniqueid', 'username', 'tiktokhandle', 'tiktokaccount', 'handle', 'account']);
        $handle = CreatorNormalizationService::normalizeHandle($rawHandle);

        if (empty($name) && !empty($handle)) {
            $name = $handle;
        }

        // 2. Chỉ số Followers, GMV, Engagement Rate, Average Views
        $rawFollowers = $this->findValue($normalizedRow, ['followercount', 'followers', 'fans', 'fanstotal']);
        $followers = CreatorNormalizationService::parseMetricNumber($rawFollowers);
        $tier = CreatorNormalizationService::determineTier($followers);

        $rawGmv = $this->findValue($normalizedRow, ['totalgmv', 'gmv', 'sales', 'salesvnd', 'totalsales']);
        $gmvEstimate = CreatorNormalizationService::parseGmv($rawGmv);

        $rawEr = $this->findValue($normalizedRow, ['engagement', 'engagementrate', 'interactionrate', 'er']);
        $engagementRate = CreatorNormalizationService::parsePercentage($rawEr);

        $rawAvgViews = $this->findValue($normalizedRow, ['avgviews', 'medianviews', 'views', 'averageviews']);
        $averageViews = CreatorNormalizationService::parseMetricNumber($rawAvgViews);

        // 3. Ngành hàng (Category/Niche)
        $rawNiche = $this->findValue($normalizedRow, ['maincategory', 'category', 'niche', 'industry']);
        $niche = !empty($rawNiche) ? strtolower(trim($rawNiche)) : 'general';

        // 4. Thông tin liên hệ (Phone, Email)
        $rawContact = $this->findValue($normalizedRow, ['contactinfo', 'contact', 'email', 'phone', 'whatsapp', 'intro']);
        $contact = CreatorNormalizationService::extractContactInfo($rawContact);
        $phone = $contact['phone'];
        $email = $contact['email'];

        // Cột riêng nếu có
        $specificPhone = $this->findValue($normalizedRow, ['phonenumber', 'mobile', 'tel']);
        if ($specificPhone) {
            $phone = CreatorNormalizationService::normalizePhone($specificPhone) ?? $phone;
        }

        $specificEmail = $this->findValue($normalizedRow, ['mail']);
        if ($specificEmail) {
            $email = strtolower(trim($specificEmail)) ?? $email;
        }

        // 5. URL
        $rawUrl = $this->findValue($normalizedRow, ['homepageurl', 'profilelink', 'url', 'link']);
        $url = !empty($rawUrl) ? trim($rawUrl) : ($handle ? "https://www.tiktok.com/@{$handle}" : '');

        // 6. Ghi chú nguồn FastMoss
        $notesArr = [];
        if ($gmvEstimate > 0) {
            $notesArr[] = 'GMV FastMoss: ' . number_format($gmvEstimate, 0, ',', '.') . ' đ';
        }
        if ($engagementRate > 0) {
            $notesArr[] = 'ER: ' . $engagementRate . '%';
        }
        if ($averageViews > 0) {
            $notesArr[] = 'Avg Views: ' . number_format($averageViews, 0, ',', '.');
        }
        $notes = implode(' | ', $notesArr);

        return [
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'platform' => PlatformEnum::TIKTOK,
            'handle' => $handle,
            'url' => $url,
            'followers_count' => $followers,
            'engagement_rate' => $engagementRate,
            'average_views' => $averageViews,
            'gmv_estimate' => $gmvEstimate,
            'tier' => $tier,
            'niche' => $niche,
            'shipping_address' => null,
            'city_province' => null,
            'district' => null,
            'notes' => $notes ?: 'Nhập từ file phân tích FastMoss',
            'rate_price' => 0.0,
            'data_source' => 'fastmoss',
        ];
    }

    /**
     * Xác thực dữ liệu cơ bản
     */
    public function validate(array $record): bool
    {
        return !empty($record['name']) || !empty($record['handle']);
    }

    /**
     * Tìm giá trị trong mảng row với nhiều biến thể tên cột
     */
    protected function findValue(array $row, array $possibleKeys): mixed
    {
        foreach ($possibleKeys as $key) {
            if (isset($row[$key]) && $row[$key] !== '') {
                return $row[$key];
            }
        }
        return null;
    }
}
