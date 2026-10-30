<?php

namespace Modules\Creator\Connectors;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorRateCard;
use Modules\Creator\Services\CreatorDeduplicationService;
use Modules\Creator\Services\CreatorNormalizationService;

class ChromeExtensionConnector implements CreatorDataConnectorInterface
{
    public function __construct(
        protected CreatorDeduplicationService $dedupService
    ) {}

    /**
     * Chuyển đổi payload thô nhận từ Chrome Extension
     */
    public function parse(mixed $payload): array
    {
        $data = is_array($payload) ? $payload : (json_decode($payload, true) ?? []);

        $name = trim($data['name'] ?? '');
        $handle = CreatorNormalizationService::normalizeHandle($data['handle'] ?? '');
        if (empty($name) && !empty($handle)) {
            $name = $handle;
        }

        $platformStr = strtolower(trim($data['platform'] ?? 'tiktok'));
        $platform = PlatformEnum::tryFrom($platformStr) ?? PlatformEnum::TIKTOK;

        $rawPhone = $data['phone'] ?? null;
        $phone = CreatorNormalizationService::normalizePhone($rawPhone);

        $email = !empty($data['email']) ? strtolower(trim($data['email'])) : null;
        $followers = max((int) ($data['followers_count'] ?? 0), 0);
        $tier = !empty($data['tier'])
            ? (CreatorTierEnum::tryFrom(strtolower(trim($data['tier']))) ?? CreatorNormalizationService::determineTier($followers))
            : CreatorNormalizationService::determineTier($followers);

        $url = trim($data['url'] ?? '');
        if (empty($url) && !empty($handle)) {
            $url = match ($platform) {
                PlatformEnum::TIKTOK => "https://www.tiktok.com/@{$handle}",
                PlatformEnum::FACEBOOK => "https://www.facebook.com/{$handle}",
                PlatformEnum::INSTAGRAM => "https://www.instagram.com/{$handle}",
                PlatformEnum::YOUTUBE => "https://www.youtube.com/@{$handle}",
                default => "https://{$platform->value}.com/{$handle}",
            };
        }

        $bio = trim($data['bio'] ?? '');
        $notes = trim($data['notes'] ?? '');
        $combinedNotes = $notes;
        if (!empty($bio)) {
            $combinedNotes = $combinedNotes ? ($combinedNotes . " | Bio: " . $bio) : ("Bio: " . $bio);
        }

        return [
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'platform' => $platform,
            'handle' => $handle,
            'url' => $url,
            'followers_count' => $followers,
            'tier' => $tier,
            'niche' => !empty($data['niche']) ? trim($data['niche']) : 'general',
            'city_province' => $data['city_province'] ?? null,
            'district' => $data['district'] ?? null,
            'shipping_address' => $data['shipping_address'] ?? null,
            'notes' => $combinedNotes ?: null,
            'rate_price' => !empty($data['rate_price']) ? (float) $data['rate_price'] : 0,
        ];
    }

    /**
     * Xác thực dữ liệu cơ bản
     */
    public function validate(array $record): bool
    {
        return !empty($record['name']) && !empty($record['handle']);
    }

    /**
     * Kiểm tra nhanh xem hồ sơ Creator đã tồn tại trong CRM chưa
     */
    public function checkExists(string $platform, string $handle): ?Creator
    {
        $normalizedHandle = CreatorNormalizationService::normalizeHandle($handle);
        return $this->dedupService->findExistingMatch(
            platform: $platform,
            handle: $normalizedHandle
        );
    }

    /**
     * Lưu bản ghi vào CRM (Thêm mới hoặc Cập nhật thông tin nếu đã tồn tại)
     */
    public function save(array $record, ?User $user = null): array
    {
        if (!$this->validate($record)) {
            throw new \InvalidArgumentException('Tên Creator và @handle mạng xã hội không được để trống.');
        }

        return DB::transaction(function () use ($record, $user) {
            /** @var PlatformEnum $platform */
            $platform = $record['platform'];
            $handle = $record['handle'];
            $phone = $record['phone'];
            $email = $record['email'];

            // 1. Kiểm tra trùng
            $existingCreator = $this->dedupService->findExistingMatch(
                phone: $phone,
                email: $email,
                platform: $platform->value,
                handle: $handle
            );

            if ($existingCreator) {
                // Cập nhật thông tin bổ sung nếu trước đó còn trống
                $updates = [];
                if (empty($existingCreator->phone) && !empty($phone)) {
                    $updates['phone'] = $phone;
                }
                if (empty($existingCreator->email) && !empty($email)) {
                    $updates['email'] = $email;
                }
                if (empty($existingCreator->city_province) && !empty($record['city_province'])) {
                    $updates['city_province'] = $record['city_province'];
                }
                if ($existingCreator->niche === 'general' && !empty($record['niche']) && $record['niche'] !== 'general') {
                    $updates['niche'] = $record['niche'];
                }
                if (!empty($record['notes'])) {
                    $updates['notes'] = $existingCreator->notes
                        ? ($existingCreator->notes . ' | ' . $record['notes'])
                        : $record['notes'];
                }
                $updates['updated_by'] = $user?->id;

                $existingCreator->update($updates);

                // Cập nhật hoặc tạo tài khoản Social
                CreatorAccount::updateOrCreate(
                    [
                        'creator_id' => $existingCreator->id,
                        'platform' => $platform->value,
                        'handle' => $handle,
                    ],
                    [
                        'url' => $record['url'],
                        'followers_count' => $record['followers_count'],
                        'data_source' => 'extension',
                        'last_metrics_updated_at' => now(),
                    ]
                );

                return [
                    'action' => 'updated',
                    'message' => "Đã đồng bộ và cập nhật thông tin cho Creator #{$existingCreator->id} ({$existingCreator->name}) từ Chrome Extension.",
                    'creator' => $existingCreator->load(['accounts', 'rateCards']),
                ];
            }

            // 2. Tạo mới Creator
            $creator = Creator::create([
                'name' => $record['name'],
                'phone' => $phone,
                'email' => $email,
                'shipping_address' => $record['shipping_address'] ?? null,
                'city_province' => $record['city_province'] ?? null,
                'district' => $record['district'] ?? null,
                'niche' => $record['niche'] ?? 'general',
                'tier' => $record['tier'],
                'trust_score' => 100,
                'notes' => $record['notes'] ?? null,
                'created_by' => $user?->id,
            ]);

            // Tạo tài khoản Social
            CreatorAccount::create([
                'creator_id' => $creator->id,
                'platform' => $platform->value,
                'handle' => $handle,
                'url' => $record['url'],
                'followers_count' => $record['followers_count'],
                'data_source' => 'extension',
                'last_metrics_updated_at' => now(),
            ]);

            // Thêm Rate card nếu có giá
            if (!empty($record['rate_price']) && $record['rate_price'] > 0) {
                $contentType = match ($platform) {
                    PlatformEnum::TIKTOK => 'tiktok_video',
                    PlatformEnum::FACEBOOK => 'facebook_post',
                    PlatformEnum::YOUTUBE => 'youtube_video',
                    PlatformEnum::SHOPEE => 'shopee_video',
                    default => 'tiktok_video',
                };

                CreatorRateCard::create([
                    'creator_id' => $creator->id,
                    'content_type' => $contentType,
                    'price' => $record['rate_price'],
                    'currency' => 'VND',
                    'notes' => 'Giá khởi điểm ghi nhận từ Chrome Extension',
                    'is_active' => true,
                ]);
            }

            return [
                'action' => 'created',
                'message' => "Đã thêm mới Creator #{$creator->id} ({$creator->name}) vào CRM thành công!",
                'creator' => $creator->load(['accounts', 'rateCards']),
            ];
        });
    }
}
