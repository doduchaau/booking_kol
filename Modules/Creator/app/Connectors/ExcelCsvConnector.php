<?php

namespace Modules\Creator\Connectors;

use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Services\CreatorNormalizationService;
use Modules\Creator\Services\UrlNormalizer;

class ExcelCsvConnector implements CreatorDataConnectorInterface
{
    /**
     * Chuyển đổi một dòng dữ liệu từ file Excel / CSV mẫu chuẩn thành mảng chuẩn hóa
     */
    public function parse(mixed $payload): array
    {
        $raw = is_array($payload) ? $payload : (array) $payload;

        // Chuẩn hóa key thành chữ thường không khoảng trắng thừa
        $row = [];
        foreach ($raw as $k => $v) {
            $normalizedKey = trim(mb_strtolower((string) $k));
            $row[$normalizedKey] = is_string($v) ? trim($v) : $v;
        }

        // 1. Họ và tên / Nghệ danh
        $name = $this->resolveField($row, [
            'name', 'tên', 'họ và tên', 'họ tên', 'tên creator', 'tên koc', 'tên kol',
            'creator', 'koc', 'kol', 'influencer', 'full name', 'fullname', 'blogger',
        ], '');

        // 2. Số điện thoại (tự khôi phục số 0 bị mất)
        $rawPhone = $this->resolveField($row, [
            'phone', 'số điện thoại', 'sđt', 'điện thoại', 'so dien thoai', 'sdt', 'dien thoai',
            'tel', 'mobile', 'contact', 'zalo',
        ]);
        $phone = CreatorNormalizationService::normalizePhone($rawPhone);

        // 3. Email
        $rawEmail = $this->resolveField($row, [
            'email', 'thư điện tử', 'thu dien tu', 'mail', 'email liên hệ',
        ]);
        $email = !empty($rawEmail) ? strtolower(trim((string) $rawEmail)) : null;

        // 4. Kênh / Handle / Username / URL
        $rawHandle = (string) $this->resolveField($row, [
            'handle', 'username', 'tài khoản', 'kênh', 'kenh', 'id kênh', 'tiktok id',
            'channel', 'user', 'unique id', 'id',
        ], '');

        $rawUrl = (string) $this->resolveField($row, [
            'url', 'link', 'đường dẫn', 'link kênh', 'link profile', 'profile url',
        ], '');

        // 5. Nền tảng (Platform)
        $rawPlatform = (string) $this->resolveField($row, [
            'platform', 'nền tảng', 'nen tang', 'mạng xã hội', 'kênh mxh',
        ], '');

        // Suy luận chéo nền tảng, handle và URL
        $inferred = CreatorNormalizationService::inferPlatformAndHandle($rawUrl, $rawHandle, $rawPlatform);
        $url = $inferred['url'];
        $handle = $inferred['handle'];
        $platform = PlatformEnum::tryFrom($inferred['platform']) ?? PlatformEnum::TIKTOK;

        if (empty($name) && !empty($handle)) {
            $name = $handle;
        }

        // 6. Followers & Tier
        $rawFollowers = $this->resolveField($row, [
            'followers_count', 'followers', 'follower', 'người theo dõi', 'lượt theo dõi',
            'fans', 'subscribers', 'sub',
        ], 0);
        $followers = CreatorNormalizationService::parseMetricNumber($rawFollowers);

        $rawTier = $this->resolveField($row, [
            'tier', 'phân hạng', 'phan hang', 'hạng', 'level',
        ]);
        $tier = !empty($rawTier)
            ? (CreatorTierEnum::tryFrom(strtolower(trim((string) $rawTier))) ?? CreatorNormalizationService::determineTier($followers))
            : CreatorNormalizationService::determineTier($followers);

        // 7. Ngành hàng (Niche)
        $rawNiche = $this->resolveField($row, [
            'niche', 'ngành hàng', 'nganh hang', 'lĩnh vực', 'linh vuc', 'chủ đề', 'category',
        ], 'general');
        $niche = !empty($rawNiche) ? trim((string) $rawNiche) : 'general';

        // 8. Địa chỉ giao nhận hàng
        $shippingAddress = $this->resolveField($row, [
            'shipping_address', 'địa chỉ', 'dia chi', 'địa chỉ nhận hàng', 'address',
        ]);
        $cityProvince = $this->resolveField($row, [
            'city_province', 'tỉnh', 'thành phố', 'tỉnh/thành phố', 'tinh', 'thanh pho',
            'tỉnh/thành', 'city', 'province',
        ]);
        $district = $this->resolveField($row, [
            'district', 'quận', 'huyện', 'quận/huyện', 'quan', 'huyen', 'quan/huyen',
        ]);

        // 9. Báo giá & Ghi chú giá
        $rawRatePrice = $this->resolveField($row, [
            'rate_price', 'giá', 'báo giá', 'chi phí', 'giá video', 'price', 'rate', 'cost',
        ], 0);
        $parsedPrice = CreatorNormalizationService::parseRatePrice($rawRatePrice);
        $ratePrice = $parsedPrice['price'];

        $rawEr = $this->resolveField($row, [
            'engagement_rate', 'er', 'tỷ lệ tương tác', 'tuong tac',
        ], 0);
        $engagementRate = CreatorNormalizationService::parsePercentage($rawEr, 'engagement_rate');

        $rawViews = $this->resolveField($row, [
            'average_views', 'avg_views', 'views', 'lượt xem trung bình', 'view trung bình',
        ], 0);
        $averageViews = CreatorNormalizationService::parseMetricNumber($rawViews);

        $rawGmv = $this->resolveField($row, [
            'gmv_estimate', 'gmv', 'doanh số', 'doanh thu', 'revenue',
        ], 0);
        $gmvEstimate = CreatorNormalizationService::parseGmv($rawGmv);

        // 10. Ghi chú
        $notes = $this->resolveField($row, [
            'notes', 'ghi chú', 'ghi chu', 'lưu ý', 'note', 'comment',
        ]);

        if (!empty($parsedPrice['note'])) {
            $notes = $notes ? ($notes . " | Báo giá: " . $parsedPrice['note']) : ("Báo giá: " . $parsedPrice['note']);
        }

        return [
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'platform' => $platform,
            'handle' => $handle,
            'url' => $url,
            'followers_count' => $followers,
            'engagement_rate' => $engagementRate,
            'average_views' => $averageViews,
            'gmv_estimate' => $gmvEstimate,
            'tier' => $tier,
            'niche' => $niche,
            'shipping_address' => $shippingAddress,
            'city_province' => $cityProvince,
            'district' => $district,
            'notes' => $notes,
            'rate_price' => $ratePrice,
            'data_source' => 'excel_import',
        ];
    }

    /**
     * Xác thực bản ghi tối thiểu phải có Tên hoặc Handle
     */
    public function validate(array $record): bool
    {
        return !empty(trim($record['name'] ?? '')) || !empty(trim($record['handle'] ?? ''));
    }

    /**
     * Tìm trường phù hợp từ danh sách từ khóa đồng nghĩa
     */
    protected function resolveField(array $row, array $candidates, mixed $default = null): mixed
    {
        foreach ($candidates as $candidate) {
            $candidateKey = mb_strtolower(trim($candidate));
            if (array_key_exists($candidateKey, $row) && $row[$candidateKey] !== null && $row[$candidateKey] !== '') {
                return $row[$candidateKey];
            }
        }

        return $default;
    }
}
