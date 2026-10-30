<?php

namespace Modules\Creator\Connectors;

use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Services\CreatorNormalizationService;

class KalodataExportConnector implements CreatorDataConnectorInterface
{
    /**
     * Chuyển đổi một dòng dữ liệu từ file xuất Kalodata thành mảng chuẩn hóa
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
        $name = trim($this->findValue($normalizedRow, ['creator', 'creatorname', 'nickname', 'kolname', 'name']) ?? '');
        $rawHandle = $this->findValue($normalizedRow, ['username', 'tiktokhandle', 'tiktokaccount', 'handle', 'account', 'tiktokid', 'userid']);
        $handle = CreatorNormalizationService::normalizeHandle($rawHandle);

        if (empty($name) && !empty($handle)) {
            $name = $handle;
        }

        // 2. Chỉ số Followers, GMV, Engagement Rate, Average Views
        $rawFollowers = $this->findValue($normalizedRow, ['followers', 'fans', 'fancount', 'followerscount']);
        $followers = CreatorNormalizationService::parseMetricNumber($rawFollowers);
        $tier = CreatorNormalizationService::determineTier($followers);

        $rawGmv = $this->findValue($normalizedRow, ['revenue', 'revenuevnd', 'revenueusd', 'gmv', 'totalsales', 'sales']);
        $gmvEstimate = CreatorNormalizationService::parseGmv($rawGmv);

        $rawEr = $this->findValue($normalizedRow, ['engagementrate', 'interactionrate', 'engrate', 'er', 'engagement']);
        $engagementRate = CreatorNormalizationService::parsePercentage($rawEr);

        $rawAvgViews = $this->findValue($normalizedRow, ['averageviews', 'avgviews', 'medianviews', 'videoviews', 'views']);
        $averageViews = CreatorNormalizationService::parseMetricNumber($rawAvgViews);

        // 3. Ngành hàng (Niche)
        $rawNiche = $this->findValue($normalizedRow, ['category', 'niche', 'primarycategory', 'industry', 'maincategory']);
        $niche = !empty($rawNiche) ? strtolower(trim($rawNiche)) : 'general';

        // 4. Thông tin liên hệ (Phone, Email)
        $rawContact = $this->findValue($normalizedRow, ['contact', 'whatsapp', 'phone', 'email', 'contactinfo', 'bio']);
        $contact = CreatorNormalizationService::extractContactInfo($rawContact);
        $phone = $contact['phone'];
        $email = $contact['email'];

        // Nếu có cột riêng cho phone hoặc email
        $specificPhone = $this->findValue($normalizedRow, ['phonenumber', 'mobile', 'tel']);
        if ($specificPhone) {
            $phone = CreatorNormalizationService::normalizePhone($specificPhone) ?? $phone;
        }

        $specificEmail = $this->findValue($normalizedRow, ['mail']);
        if ($specificEmail) {
            $email = strtolower(trim($specificEmail)) ?? $email;
        }

        // 5. URL
        $rawUrl = $this->findValue($normalizedRow, ['profileurl', 'homepage', 'link', 'url', 'tiktokurl']);
        $url = !empty($rawUrl) ? trim($rawUrl) : ($handle ? "https://www.tiktok.com/@{$handle}" : '');

        // 6. Ghi chú nguồn Kalodata
        $notesArr = [];
        if ($gmvEstimate > 0) {
            $notesArr[] = 'GMV Kalodata: ' . number_format($gmvEstimate, 0, ',', '.') . ' đ';
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
            'notes' => $notes ?: 'Nhập từ file phân tích Kalodata',
            'rate_price' => 0.0,
            'data_source' => 'kalodata',
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
