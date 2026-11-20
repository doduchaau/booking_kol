<?php

namespace Modules\Campaign\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Services\CreatorDeduplicationService;
use Modules\Creator\Services\CreatorNormalizationService;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CampaignCreatorImportService
{
    public function __construct(
        protected CreatorDeduplicationService $dedupService
    ) {}

    /**
     * Phân tích và kiểm tra đối soát trùng trước khi Import (Preview & Scan)
     */
    public function previewImport(UploadedFile $file, Campaign $campaign, array $options = []): array
    {
        $realPath = $file->getRealPath();
        $spreadsheet = IOFactory::load($realPath);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $rows = [];
        for ($r = 2; $r <= $highestRow; $r++) {
            $name = trim((string) $sheet->getCell('A' . $r)->getValue());
            $phone = trim((string) $sheet->getCell('B' . $r)->getValue());
            $email = trim((string) $sheet->getCell('C' . $r)->getValue());

            $p1 = strtolower(trim((string) $sheet->getCell('D' . $r)->getValue()));
            $h1 = trim((string) $sheet->getCell('E' . $r)->getValue());
            $u1 = trim((string) $sheet->getCell('F' . $r)->getValue());
            $f1 = (int) $sheet->getCell('G' . $r)->getValue();

            $p2 = strtolower(trim((string) $sheet->getCell('H' . $r)->getValue()));
            $h2 = trim((string) $sheet->getCell('I' . $r)->getValue());
            $u2 = trim((string) $sheet->getCell('J' . $r)->getValue());
            $f2 = (int) $sheet->getCell('K' . $r)->getValue();

            $p3 = strtolower(trim((string) $sheet->getCell('L' . $r)->getValue()));
            $h3 = trim((string) $sheet->getCell('M' . $r)->getValue());
            $u3 = trim((string) $sheet->getCell('N' . $r)->getValue());
            $f3 = (int) $sheet->getCell('O' . $r)->getValue();

            $niche = strtolower(trim((string) $sheet->getCell('P' . $r)->getValue())) ?: 'general';
            $tier = strtolower(trim((string) $sheet->getCell('Q' . $r)->getValue()));
            $fee = (float) $sheet->getCell('R' . $r)->getValue();
            $address = trim((string) $sheet->getCell('S' . $r)->getValue());
            $notes = trim((string) $sheet->getCell('T' . $r)->getValue());

            // Bỏ qua dòng hoàn toàn rỗng
            if (empty($name) && empty($phone) && empty($h1) && empty($h2) && empty($h3)) {
                continue;
            }

            $rows[] = [
                'row_index' => $r,
                'name' => $name,
                'phone' => CreatorNormalizationService::normalizePhone($phone),
                'email' => !empty($email) ? strtolower($email) : null,
                'accounts' => $this->extractAccountsFromRow([
                    ['platform' => $p1, 'handle' => $h1, 'url' => $u1, 'followers' => $f1],
                    ['platform' => $p2, 'handle' => $h2, 'url' => $u2, 'followers' => $f2],
                    ['platform' => $p3, 'handle' => $h3, 'url' => $u3, 'followers' => $f3],
                ]),
                'niche' => $niche,
                'tier' => $tier,
                'fee' => $fee,
                'shipping_address' => $address,
                'notes' => $notes,
            ];
        }

        // Hợp nhất các dòng có cùng Số điện thoại hoặc cùng Tên (Hỗ trợ nhập dọc)
        $groupedKocs = $this->groupAndMergeRows($rows);

        // Đối soát với Database (CRM & Campaign)
        $newKocs = [];
        $crmDuplicates = [];
        $campaignDuplicates = [];
        $invalidRows = [];

        // Lấy danh sách ID KOC đã có trong chiến dịch này
        $existingInCampaign = CampaignCreator::where('campaign_id', $campaign->id)
            ->with('creator')
            ->get()
            ->keyBy('creator_id');

        foreach ($groupedKocs as $itemKey => $item) {
            if (empty($item['name']) && empty($item['primary_handle'])) {
                $invalidRows[] = [
                    'key' => $itemKey,
                    'name' => $item['name'] ?: 'Chưa có tên',
                    'reason' => 'Thiếu cả Họ tên và Handle kênh nhận diện.',
                    'source_rows' => $item['source_rows'],
                ];
                continue;
            }

            // Tìm KOC tương ứng trong CRM
            $primaryAccount = $item['accounts'][0] ?? null;
            $matchedCreator = $this->dedupService->findExistingMatch(
                phone: $item['phone'],
                email: $item['email'],
                platform: $primaryAccount['platform'] ?? null,
                handle: $primaryAccount['handle'] ?? null
            );

            // Tự động suy ra Tier nếu chưa có
            $totalFollowers = array_sum(array_column($item['accounts'], 'followers'));
            $tier = !empty($item['tier']) && in_array($item['tier'], ['nano', 'micro', 'macro', 'mega'])
                ? $item['tier']
                : CreatorNormalizationService::determineTier($totalFollowers)->value;

            $item['calculated_tier'] = $tier;

            if ($matchedCreator) {
                // Kiểm tra xem đã có trong chiến dịch này chưa
                if ($existingInCampaign->has($matchedCreator->id)) {
                    $campaignCreator = $existingInCampaign->get($matchedCreator->id);
                    $campaignDuplicates[] = [
                        'key' => $itemKey,
                        'name' => $matchedCreator->name,
                        'phone' => $matchedCreator->phone ?: $item['phone'],
                        'creator_id' => $matchedCreator->id,
                        'campaign_creator_id' => $campaignCreator->id,
                        'current_status' => $campaignCreator->status,
                        'current_fee' => $campaignCreator->booking_fee,
                        'current_platforms' => $campaignCreator->booking_platforms,
                        'imported_data' => $item,
                        'suggested_action' => 'skip',
                    ];
                } else {
                    // Đã có trong CRM nhưng CHƯA có trong chiến dịch
                    $crmDuplicates[] = [
                        'key' => $itemKey,
                        'name' => $matchedCreator->name,
                        'phone' => $matchedCreator->phone ?: $item['phone'],
                        'creator_id' => $matchedCreator->id,
                        'existing_accounts' => $matchedCreator->accounts->map(fn ($acc) => [
                            'platform' => $acc->platform instanceof PlatformEnum ? $acc->platform->value : $acc->platform,
                            'handle' => $acc->handle,
                        ])->toArray(),
                        'new_accounts' => $item['accounts'],
                        'imported_data' => $item,
                        'suggested_action' => 'update_and_assign',
                    ];
                }
            } else {
                // Hoàn toàn mới trong CRM và Chiến dịch
                $newKocs[] = [
                    'key' => $itemKey,
                    'name' => $item['name'] ?: ($item['primary_handle'] ?? 'Chưa rõ'),
                    'phone' => $item['phone'],
                    'email' => $item['email'],
                    'accounts' => $item['accounts'],
                    'tier' => $tier,
                    'niche' => $item['niche'],
                    'fee' => $item['fee'],
                    'shipping_address' => $item['shipping_address'],
                    'notes' => $item['notes'],
                    'source_rows' => $item['source_rows'],
                    'suggested_action' => 'create_and_assign',
                ];
            }
        }

        // Tạo token lưu cache trong 2 giờ phục vụ bước Confirm
        $token = Str::random(40);
        $payload = [
            'campaign_id' => $campaign->id,
            'new_kocs' => $newKocs,
            'crm_duplicates' => $crmDuplicates,
            'campaign_duplicates' => $campaignDuplicates,
            'invalid_rows' => $invalidRows,
            'total_rows' => count($rows),
        ];

        Cache::put("campaign_import_preview_{$token}", $payload, now()->addHours(2));

        return [
            'token' => $token,
            'file_name' => $file->getClientOriginalName(),
            'summary' => [
                'total_rows' => count($rows),
                'total_kocs' => count($groupedKocs),
                'new_count' => count($newKocs),
                'crm_duplicate_count' => count($crmDuplicates),
                'campaign_duplicate_count' => count($campaignDuplicates),
                'invalid_count' => count($invalidRows),
            ],
            'new_kocs' => $newKocs,
            'crm_duplicates' => $crmDuplicates,
            'campaign_duplicates' => $campaignDuplicates,
            'invalid_rows' => $invalidRows,
        ];
    }

    /**
     * Xác nhận thực hiện Import & Đồng bộ vào CRM + Chiến dịch (Execute)
     */
    public function confirmImport(
        Campaign $campaign,
        string $token,
        array $resolutions = [],
        ?int $assignedTo = null,
        float $defaultBookingFee = 0.0,
        array $defaultPlatforms = ['tiktok'],
        ?User $user = null
    ): array {
        $cached = Cache::get("campaign_import_preview_{$token}");
        if (!$cached || ($cached['campaign_id'] ?? null) !== $campaign->id) {
            throw new \InvalidArgumentException('Phiên import đã hết hạn hoặc không hợp lệ. Vui lòng tải lại file.');
        }

        $newKocs = $cached['new_kocs'] ?? [];
        $crmDuplicates = $cached['crm_duplicates'] ?? [];
        $campaignDuplicates = $cached['campaign_duplicates'] ?? [];

        $createdCrmCount = 0;
        $updatedCrmCount = 0;
        $assignedCampaignCount = 0;
        $skippedCount = 0;

        DB::transaction(function () use (
            $campaign,
            $newKocs,
            $crmDuplicates,
            $campaignDuplicates,
            $resolutions,
            $assignedTo,
            $defaultBookingFee,
            $defaultPlatforms,
            $user,
            &$createdCrmCount,
            &$updatedCrmCount,
            &$assignedCampaignCount,
            &$skippedCount
        ) {
            $now = now();
            $expireDays = class_exists(\Modules\Settings\Models\Setting::class)
                ? (int) \Modules\Settings\Models\Setting::get('portal_token_expire_days', 30)
                : 30;
            $expiresAt = $expireDays > 0 ? $now->copy()->addDays($expireDays) : null;

            // 1. XỬ LÝ NHÓM KOC MỚI HOÀN TOÀN
            foreach ($newKocs as $item) {
                $key = $item['key'];
                $action = $resolutions[$key] ?? 'create_and_assign';

                if ($action === 'skip') {
                    $skippedCount++;
                    continue;
                }

                // Tạo KOC trong CRM
                $creator = Creator::create([
                    'name' => $item['name'],
                    'phone' => $item['phone'],
                    'email' => $item['email'],
                    'niche' => $item['niche'] ?: 'general',
                    'tier' => $item['tier'] ?: 'nano',
                    'shipping_address' => $item['shipping_address'] ?: null,
                    'notes' => $item['notes'] ?: null,
                    'created_by' => $user?->id,
                ]);

                // Lưu các tài khoản mạng xã hội
                $bookingPlatforms = [];
                foreach ($item['accounts'] as $acc) {
                    $plat = $acc['platform'];
                    $handle = $acc['handle'];
                    if (empty($plat) || empty($handle)) continue;

                    CreatorAccount::create([
                        'creator_id' => $creator->id,
                        'platform' => $plat,
                        'handle' => $handle,
                        'url' => $acc['url'] ?: "https://{$plat}.com/@{$handle}",
                        'followers_count' => $acc['followers'] ?: 0,
                        'data_source' => 'campaign_import',
                        'last_metrics_updated_at' => $now,
                    ]);

                    $bookingPlatforms[] = $plat;
                }

                $effectivePlatforms = !empty($bookingPlatforms)
                    ? array_values(array_unique($bookingPlatforms))
                    : $defaultPlatforms;

                $effectiveFee = $item['fee'] > 0 ? $item['fee'] : $defaultBookingFee;

                // Gán vào Chiến dịch
                CampaignCreator::create([
                    'campaign_id' => $campaign->id,
                    'creator_id' => $creator->id,
                    'assigned_to' => $assignedTo,
                    'status' => PipelineStatusEnum::NEW->value,
                    'collaboration_type' => 'video',
                    'booking_platforms' => $effectivePlatforms,
                    'booking_fee' => $effectiveFee,
                    'portal_token' => Str::random(64),
                    'portal_token_expires_at' => $expiresAt,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $createdCrmCount++;
                $assignedCampaignCount++;
            }

            // 2. XỬ LÝ NHÓM KOC TRÙNG CRM (CHƯA CÓ TRONG CHIẾN DỊCH)
            foreach ($crmDuplicates as $item) {
                $key = $item['key'];
                $action = $resolutions[$key] ?? 'update_and_assign';

                if ($action === 'skip') {
                    $skippedCount++;
                    continue;
                }

                $creator = Creator::find($item['creator_id']);
                if (!$creator) {
                    $skippedCount++;
                    continue;
                }

                $imp = $item['imported_data'];

                if ($action === 'update_and_assign') {
                    $updates = [];
                    if (empty($creator->phone) && !empty($imp['phone'])) {
                        $updates['phone'] = $imp['phone'];
                    }
                    if (empty($creator->email) && !empty($imp['email'])) {
                        $updates['email'] = $imp['email'];
                    }
                    if (empty($creator->shipping_address) && !empty($imp['shipping_address'])) {
                        $updates['shipping_address'] = $imp['shipping_address'];
                    }
                    if ($creator->niche === 'general' && !empty($imp['niche']) && $imp['niche'] !== 'general') {
                        $updates['niche'] = $imp['niche'];
                    }
                    if (!empty($imp['notes'])) {
                        $updates['notes'] = $creator->notes
                            ? ($creator->notes . ' | ' . $imp['notes'])
                            : $imp['notes'];
                    }
                    if (!empty($updates)) {
                        $creator->update($updates);
                    }

                    // Bổ sung hoặc cập nhật các kênh mạng xã hội mới
                    foreach ($imp['accounts'] as $acc) {
                        $plat = $acc['platform'];
                        $handle = $acc['handle'];
                        if (empty($plat) || empty($handle)) continue;

                        CreatorAccount::updateOrCreate(
                            [
                                'creator_id' => $creator->id,
                                'platform' => $plat,
                                'handle' => $handle,
                            ],
                            [
                                'url' => $acc['url'] ?: "https://{$plat}.com/@{$handle}",
                                'followers_count' => $acc['followers'] ?: 0,
                                'data_source' => 'campaign_import',
                                'last_metrics_updated_at' => $now,
                            ]
                        );
                    }

                    $updatedCrmCount++;
                }

                // Gán vào Chiến dịch
                $collectedPlatforms = array_filter(array_column($imp['accounts'], 'platform'));
                $effectivePlatforms = !empty($collectedPlatforms)
                    ? array_values(array_unique($collectedPlatforms))
                    : $defaultPlatforms;

                $effectiveFee = $imp['fee'] > 0 ? $imp['fee'] : $defaultBookingFee;

                CampaignCreator::create([
                    'campaign_id' => $campaign->id,
                    'creator_id' => $creator->id,
                    'assigned_to' => $assignedTo,
                    'status' => PipelineStatusEnum::NEW->value,
                    'collaboration_type' => 'video',
                    'booking_platforms' => $effectivePlatforms,
                    'booking_fee' => $effectiveFee,
                    'portal_token' => Str::random(64),
                    'portal_token_expires_at' => $expiresAt,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $assignedCampaignCount++;
            }

            // 3. XỬ LÝ NHÓM KOC ĐÃ CÓ SẴN TRONG CHIẾN DỊCH
            foreach ($campaignDuplicates as $item) {
                $key = $item['key'];
                $action = $resolutions[$key] ?? 'skip';

                if ($action === 'skip') {
                    $skippedCount++;
                    continue;
                }

                if ($action === 'override_campaign') {
                    $campaignCreator = CampaignCreator::find($item['campaign_creator_id']);
                    if ($campaignCreator) {
                        $imp = $item['imported_data'];
                        $updates = [];
                        if ($imp['fee'] > 0) {
                            $updates['booking_fee'] = $imp['fee'];
                        }
                        $collectedPlatforms = array_filter(array_column($imp['accounts'], 'platform'));
                        if (!empty($collectedPlatforms)) {
                            $updates['booking_platforms'] = array_values(array_unique(array_merge($campaignCreator->booking_platforms ?: [], $collectedPlatforms)));
                        }
                        if (!empty($updates)) {
                            $campaignCreator->update($updates);
                        }
                    }
                }
            }
        });

        // Xóa cache sau khi thực hiện xong
        Cache::forget("campaign_import_preview_{$token}");

        return [
            'created_crm' => $createdCrmCount,
            'updated_crm' => $updatedCrmCount,
            'assigned_campaign' => $assignedCampaignCount,
            'skipped' => $skippedCount,
        ];
    }

    /**
     * Trích xuất danh sách tài khoản hợp lệ từ các cột
     */
    protected function extractAccountsFromRow(array $rawAccounts): array
    {
        $validAccounts = [];
        $allowedPlatforms = ['tiktok', 'shopee', 'facebook', 'youtube', 'instagram'];

        foreach ($rawAccounts as $raw) {
            $platform = strtolower(trim((string) ($raw['platform'] ?? '')));
            $handle = CreatorNormalizationService::normalizeHandle($raw['handle'] ?? '');
            $url = trim((string) ($raw['url'] ?? ''));
            $followers = (int) ($raw['followers'] ?? 0);

            if (empty($platform) && !empty($url)) {
                $inferred = CreatorNormalizationService::inferPlatformAndHandle($url);
                $platform = $inferred['platform'] ?? '';
                if (empty($handle)) {
                    $handle = $inferred['handle'] ?? '';
                }
            }

            if (!empty($platform) && in_array($platform, $allowedPlatforms) && !empty($handle)) {
                $validAccounts[] = [
                    'platform' => $platform,
                    'handle' => $handle,
                    'url' => $url ?: "https://{$platform}.com/@{$handle}",
                    'followers' => max($followers, 0),
                ];
            }
        }

        return $validAccounts;
    }

    /**
     * Gom nhóm các dòng có cùng Số điện thoại hoặc cùng Tên để hỗ trợ nhập dọc
     */
    protected function groupAndMergeRows(array $rows): array
    {
        $grouped = [];

        foreach ($rows as $row) {
            $key = null;
            if (!empty($row['phone'])) {
                $key = 'phone:' . $row['phone'];
            } elseif (!empty($row['name'])) {
                $key = 'name:' . Str::slug($row['name']);
            } elseif (!empty($row['accounts'][0]['handle'])) {
                $key = 'handle:' . $row['accounts'][0]['platform'] . ':' . $row['accounts'][0]['handle'];
            } else {
                $key = 'row:' . $row['row_index'];
            }

            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'name' => $row['name'],
                    'phone' => $row['phone'],
                    'email' => $row['email'],
                    'accounts' => $row['accounts'],
                    'niche' => $row['niche'],
                    'tier' => $row['tier'],
                    'fee' => $row['fee'],
                    'shipping_address' => $row['shipping_address'],
                    'notes' => $row['notes'],
                    'source_rows' => [$row['row_index']],
                    'primary_handle' => $row['accounts'][0]['handle'] ?? null,
                ];
            } else {
                // Hợp nhất tài khoản mới
                $existingAccs = $grouped[$key]['accounts'];
                foreach ($row['accounts'] as $newAcc) {
                    $found = false;
                    foreach ($existingAccs as $cur) {
                        if ($cur['platform'] === $newAcc['platform'] && $cur['handle'] === $newAcc['handle']) {
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $existingAccs[] = $newAcc;
                    }
                }
                $grouped[$key]['accounts'] = $existingAccs;

                // Cập nhật các trường còn trống
                if (empty($grouped[$key]['phone']) && !empty($row['phone'])) {
                    $grouped[$key]['phone'] = $row['phone'];
                }
                if (empty($grouped[$key]['email']) && !empty($row['email'])) {
                    $grouped[$key]['email'] = $row['email'];
                }
                if (empty($grouped[$key]['shipping_address']) && !empty($row['shipping_address'])) {
                    $grouped[$key]['shipping_address'] = $row['shipping_address'];
                }
                if ($grouped[$key]['fee'] <= 0 && $row['fee'] > 0) {
                    $grouped[$key]['fee'] = $row['fee'];
                }
                $grouped[$key]['source_rows'][] = $row['row_index'];
            }
        }

        return $grouped;
    }
}
