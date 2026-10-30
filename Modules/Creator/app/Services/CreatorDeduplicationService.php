<?php

namespace Modules\Creator\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;

class CreatorDeduplicationService
{
    /**
     * Kiểm tra xem hồ sơ mới có trùng với hồ sơ đã có trong hệ thống không
     * Trùng khi: cùng số điện thoại (đã chuẩn hóa), cùng email, hoặc cùng (platform, handle)
     */
    public function findExistingMatch(
        ?string $phone = null,
        ?string $email = null,
        ?string $platform = null,
        ?string $handle = null
    ): ?Creator {
        $normalizedPhone = CreatorNormalizationService::normalizePhone($phone);
        $normalizedHandle = CreatorNormalizationService::normalizeHandle($handle);

        // 1. Kiểm tra trùng SĐT
        if (!empty($normalizedPhone)) {
            $match = Creator::where('phone', $normalizedPhone)->first();
            if ($match) {
                return $match;
            }
        }

        // 2. Kiểm tra trùng (platform, handle)
        if (!empty($platform) && !empty($normalizedHandle)) {
            $matchedAccount = CreatorAccount::where('platform', $platform)
                ->where('handle', $normalizedHandle)
                ->with('creator')
                ->first();

            if ($matchedAccount && $matchedAccount->creator) {
                return $matchedAccount->creator;
            }
        }

        // 3. Kiểm tra trùng Email
        if (!empty($email)) {
            $match = Creator::where('email', strtolower(trim($email)))->first();
            if ($match) {
                return $match;
            }
        }

        return null;
    }

    /**
     * Gộp hồ sơ trùng lặp vào hồ sơ gốc Master
     */
    public function mergeProfiles(Creator $master, Creator $duplicate, ?User $performedBy = null): bool
    {
        if ($master->id === $duplicate->id) {
            throw new \InvalidArgumentException('Không thể gộp một hồ sơ vào chính nó.');
        }

        return DB::transaction(function () use ($master, $duplicate, $performedBy) {
            // 1. Cập nhật các trường còn trống ở Master từ Duplicate
            $updates = [];
            foreach (['phone', 'email', 'shipping_address', 'city_province', 'district', 'ward'] as $field) {
                if (empty($master->{$field}) && !empty($duplicate->{$field})) {
                    $updates[$field] = $duplicate->{$field};
                }
            }
            if (!empty($updates)) {
                $master->update($updates);
            }

            // 2. Chuyển các tài khoản social của Duplicate sang Master
            foreach ($duplicate->accounts as $account) {
                $existingAccount = CreatorAccount::where('creator_id', $master->id)
                    ->where('platform', $account->platform)
                    ->where('handle', $account->handle)
                    ->first();

                if ($existingAccount) {
                    // Nếu đã có tài khoản này ở Master, cập nhật followers/engagement nếu lớn hơn
                    if ($account->followers_count > $existingAccount->followers_count) {
                        $existingAccount->update([
                            'followers_count' => $account->followers_count,
                            'engagement_rate' => $account->engagement_rate,
                            'average_views' => $account->average_views,
                            'gmv_estimate' => max($account->gmv_estimate, $existingAccount->gmv_estimate),
                        ]);
                    }
                    $account->delete();
                } else {
                    $account->update(['creator_id' => $master->id]);
                }
            }

            // 3. Chuyển rate cards nếu chưa có
            foreach ($duplicate->rateCards as $rateCard) {
                $hasCard = $master->rateCards()->where('content_type', $rateCard->content_type)->exists();
                if (!$hasCard) {
                    $rateCard->update(['creator_id' => $master->id]);
                } else {
                    $rateCard->delete();
                }
            }

            // 4. Đánh dấu duplicate đã bị gộp và soft delete
            $duplicate->update([
                'merged_into_creator_id' => $master->id,
                'updated_by' => $performedBy?->id,
            ]);
            $duplicate->delete();

            // 5. Ghi log kiểm toán nếu có bảng activity_logs
            if (SchemaHasTable('activity_logs')) {
                DB::table('activity_logs')->insert([
                    'subject_type' => Creator::class,
                    'subject_id' => $master->id,
                    'causer_id' => $performedBy?->id,
                    'event' => 'merged',
                    'description' => "Đã gộp hồ sơ #{$duplicate->id} ({$duplicate->name}) vào hồ sơ Master #{$master->id}",
                    'properties' => json_encode([
                        'duplicate_id' => $duplicate->id,
                        'master_id' => $master->id,
                    ]),
                    'created_at' => now(),
                ]);
            }

            return true;
        });
    }
}

function SchemaHasTable(string $table): bool
{
    return \Illuminate\Support\Facades\Schema::hasTable($table);
}
