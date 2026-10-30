<?php

namespace Modules\Creator\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Modules\Creator\Connectors\ConnectorFactory;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Jobs\SyncCreatorMetricsJob;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorMetricsHistory;
use Modules\Creator\Models\CreatorRateCard;

class CreatorImportService
{
    public function __construct(
        protected CreatorDeduplicationService $dedupService,
        protected SmartSchemaMapperService $schemaMapper
    ) {}

    /**
     * Phân tích file tải lên để trả về Schema Mapping, Header phát hiện và Preview dữ liệu mẫu
     */
    public function analyzeFile(UploadedFile $file): array
    {
        $rawRows = $this->parseRawRows($file);
        $schema = $this->schemaMapper->detectSchema($rawRows);

        $headerRowIndex = $schema['header_row_index'];
        $headers = $schema['headers'];
        $mappings = $schema['mappings'];
        $extraColumns = $schema['extra_columns'];
        $unmappedColumns = $schema['unmapped_columns'];

        // Lấy 5 dòng dữ liệu mẫu sau dòng header để sinh Preview
        $previewRows = [];
        $dataStartIndex = $headerRowIndex + 1;
        $totalRawRows = count($rawRows);
        $totalDataRows = max(0, $totalRawRows - $dataStartIndex);

        for ($i = $dataStartIndex; $i < $totalRawRows && count($previewRows) < 5; $i++) {
            $row = $rawRows[$i] ?? [];
            if (empty(array_filter($row, fn ($cell) => trim((string) $cell) !== ''))) {
                continue;
            }

            $parsed = $this->extractRowWithMapping($row, $headers, $mappings, $extraColumns);
            if (!empty($parsed['name']) || !empty($parsed['handle'])) {
                $previewRows[] = [
                    'original_row_number' => $i + 1,
                    'name' => $parsed['name'] ?: ($parsed['handle'] ?? 'Chưa rõ'),
                    'phone' => $parsed['phone'],
                    'email' => $parsed['email'],
                    'platform' => $parsed['platform'] instanceof PlatformEnum ? $parsed['platform']->value : $parsed['platform'],
                    'handle' => $parsed['handle'],
                    'profile_url' => $parsed['url'],
                    'followers_count' => $parsed['followers_count'],
                    'average_views' => $parsed['average_views'],
                    'engagement_rate' => $parsed['engagement_rate'],
                    'rate_price' => $parsed['rate_price'],
                    'gmv_estimate' => $parsed['gmv_estimate'],
                    'niche' => $parsed['niche'],
                    'tier' => $parsed['tier'] instanceof CreatorTierEnum ? $parsed['tier']->value : $parsed['tier'],
                    'shipping_address' => $parsed['shipping_address'],
                    'city_province' => $parsed['city_province'],
                    'notes' => $parsed['notes'],
                    'extra_attributes' => $parsed['extra_attributes'] ?? [],
                ];
            }
        }

        // Định dạng danh sách mapping trả về cho frontend
        $columnsReview = [];
        foreach ($headers as $colIdx => $colName) {
            $map = $mappings[$colIdx] ?? null;
            $extra = $extraColumns[$colIdx] ?? null;

            $columnsReview[] = [
                'index' => $colIdx,
                'header_name' => $colName,
                'target_field' => $map['field'] ?? ($extra ? 'extra_attributes' : null),
                'confidence' => $map['confidence'] ?? ($extra ? 85 : 0),
                'source' => $map['source'] ?? ($extra ? 'extra_dictionary' : 'unmapped'),
                'extra_key' => $extra['attribute_key'] ?? null,
            ];
        }

        return [
            'header_row_index' => $headerRowIndex,
            'total_rows' => $totalDataRows,
            'columns_review' => $columnsReview,
            'preview_rows' => $previewRows,
            'unmapped_count' => count($unmappedColumns),
        ];
    }

    /**
     * Nhập danh sách Creator từ file CSV hoặc Excel hỗ trợ Smart Schema Mapping & Value Normalization
     */
    public function importFile(
        UploadedFile $file,
        ?User $user = null,
        string $format = 'auto',
        ?array $customMapping = null,
        bool $autoEnrich = true
    ): array {
        $rawRows = $this->parseRawRows($file);

        if (empty($rawRows)) {
            return [
                'total_rows' => 0,
                'imported' => 0,
                'updated' => 0,
                'skipped' => 0,
                'enriched' => 0,
                'errors' => ['File không chứa dữ liệu hoặc không đọc được nội dung.'],
                'connector' => 'SmartSchemaMapper',
            ];
        }

        // Nếu là format chuyên biệt Kalodata/FastMoss được chọn rõ ràng
        if (in_array(strtolower($format), ['kalodata', 'fastmoss'], true)) {
            $headers = array_map(fn ($h) => trim(mb_strtolower((string) $h)), $rawRows[0] ?? []);
            $connector = ConnectorFactory::make($format, $headers);
            $rowsData = [];
            for ($i = 1; $i < count($rawRows); $i++) {
                $row = $rawRows[$i] ?? [];
                if (empty(array_filter($row, fn ($cell) => trim((string) $cell) !== ''))) {
                    continue;
                }
                $padded = array_pad(array_slice($row, 0, count($headers)), count($headers), '');
                $rowsData[] = array_combine($headers, $padded);
            }
            return $this->importWithConnector($rowsData, $connector, $user, $autoEnrich);
        }

        // Sử dụng Smart Schema Mapping
        $schema = $this->schemaMapper->detectSchema($rawRows);
        $headerRowIndex = $schema['header_row_index'];
        $headers = $schema['headers'];
        $mappings = $schema['mappings'];
        $extraColumns = $schema['extra_columns'];

        // Nếu người dùng cung cấp custom mapping từ giao diện
        if (!empty($customMapping)) {
            $mappings = [];
            $extraColumns = [];
            foreach ($customMapping as $colIdx => $target) {
                if (empty($target)) continue;
                if (str_starts_with($target, 'extra_')) {
                    $extraColumns[$colIdx] = [
                        'attribute_key' => $target,
                        'column_name' => $headers[$colIdx] ?? "Cột {$colIdx}",
                    ];
                } else {
                    $mappings[$colIdx] = [
                        'field' => $target,
                        'confidence' => 100,
                        'source' => 'user_confirmed',
                        'column_name' => $headers[$colIdx] ?? "Cột {$colIdx}",
                    ];
                }
            }
        }

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $enrichedCount = 0;
        $errors = [];

        $dataStartIndex = $headerRowIndex + 1;
        $totalRawRows = count($rawRows);

        for ($i = $dataStartIndex; $i < $totalRawRows; $i++) {
            $lineNum = $i + 1;
            $row = $rawRows[$i] ?? [];

            if (empty(array_filter($row, fn ($cell) => trim((string) $cell) !== ''))) {
                continue;
            }

            $parsed = $this->extractRowWithMapping($row, $headers, $mappings, $extraColumns);

            if (empty($parsed['name']) && empty($parsed['handle'])) {
                $errors[] = "Dòng {$lineNum}: Thiếu tên Creator và không tìm thấy @handle/URL nhận diện.";
                $skipped++;
                continue;
            }

            $name = $parsed['name'] ?: ($parsed['handle'] ?? 'Chưa rõ');
            $phone = $parsed['phone'];
            $email = $parsed['email'];
            /** @var PlatformEnum $platform */
            $platform = $parsed['platform'] instanceof PlatformEnum
                ? $parsed['platform']
                : (PlatformEnum::tryFrom($parsed['platform']) ?? PlatformEnum::TIKTOK);
            $handle = $parsed['handle'];
            $followers = $parsed['followers_count'];
            $tier = $parsed['tier'] instanceof CreatorTierEnum
                ? $parsed['tier']
                : (CreatorTierEnum::tryFrom((string) $parsed['tier']) ?? CreatorNormalizationService::determineTier($followers));
            $dataSource = 'smart_import';

            try {
                $upsertResult = DB::transaction(function () use (
                    $parsed,
                    $name,
                    $phone,
                    $email,
                    $platform,
                    $handle,
                    $followers,
                    $tier,
                    $dataSource,
                    $user,
                    &$imported,
                    &$updated
                ) {
                    $existingCreator = $this->dedupService->findExistingMatch(
                        phone: $phone,
                        email: $email,
                        platform: $platform->value,
                        handle: $handle
                    );

                    $isNew = false;
                    $creator = null;

                    if ($existingCreator) {
                        $creator = $existingCreator;
                        $updates = [];
                        if (empty($existingCreator->phone) && !empty($phone)) {
                            $updates['phone'] = $phone;
                        }
                        if (empty($existingCreator->email) && !empty($email)) {
                            $updates['email'] = $email;
                        }
                        if (empty($existingCreator->shipping_address) && !empty($parsed['shipping_address'])) {
                            $updates['shipping_address'] = $parsed['shipping_address'];
                        }
                        if (empty($existingCreator->city_province) && !empty($parsed['city_province'])) {
                            $updates['city_province'] = $parsed['city_province'];
                        }
                        if (empty($existingCreator->district) && !empty($parsed['district'])) {
                            $updates['district'] = $parsed['district'];
                        }
                        if ($existingCreator->niche === 'general' && !empty($parsed['niche']) && $parsed['niche'] !== 'general') {
                            $updates['niche'] = $parsed['niche'];
                        }
                        if (!empty($parsed['notes'])) {
                            $updates['notes'] = $existingCreator->notes
                                ? ($existingCreator->notes . ' | ' . $parsed['notes'])
                                : $parsed['notes'];
                        }
                        $updates['updated_by'] = $user?->id;

                        if (!empty($updates)) {
                            $existingCreator->update($updates);
                        }

                        if (!empty($handle)) {
                            CreatorAccount::updateOrCreate(
                                [
                                    'creator_id' => $existingCreator->id,
                                    'platform' => $platform->value,
                                    'handle' => $handle,
                                ],
                                [
                                    'url' => $parsed['url'] ?? "https://{$platform->value}.com/@{$handle}",
                                    'followers_count' => max($followers, 0),
                                    'engagement_rate' => $parsed['engagement_rate'] ?? 0.0,
                                    'average_views' => $parsed['average_views'] ?? 0,
                                    'gmv_estimate' => $parsed['gmv_estimate'] ?? 0,
                                    'raw_metrics' => !empty($parsed['extra_attributes']) ? $parsed['extra_attributes'] : null,
                                    'data_source' => $dataSource,
                                    'last_metrics_updated_at' => now(),
                                ]
                            );
                        }

                        $updated++;
                    } else {
                        $isNew = true;
                        $creator = Creator::create([
                            'name' => $name,
                            'phone' => $phone,
                            'email' => $email,
                            'shipping_address' => $parsed['shipping_address'] ?? null,
                            'city_province' => $parsed['city_province'] ?? null,
                            'district' => $parsed['district'] ?? null,
                            'niche' => !empty($parsed['niche']) ? trim($parsed['niche']) : 'general',
                            'tier' => $tier,
                            'trust_score' => 100,
                            'notes' => $parsed['notes'] ?? null,
                            'created_by' => $user?->id,
                        ]);

                        if (!empty($handle)) {
                            CreatorAccount::create([
                                'creator_id' => $creator->id,
                                'platform' => $platform->value,
                                'handle' => $handle,
                                'url' => $parsed['url'] ?? "https://{$platform->value}.com/@{$handle}",
                                'followers_count' => max($followers, 0),
                                'engagement_rate' => $parsed['engagement_rate'] ?? 0.0,
                                'average_views' => $parsed['average_views'] ?? 0,
                                'gmv_estimate' => $parsed['gmv_estimate'] ?? 0,
                                'raw_metrics' => !empty($parsed['extra_attributes']) ? $parsed['extra_attributes'] : null,
                                'data_source' => $dataSource,
                                'last_metrics_updated_at' => now(),
                            ]);
                        }

                        $ratePrice = (float) ($parsed['rate_price'] ?? 0);
                        if ($ratePrice > 0) {
                            CreatorRateCard::create([
                                'creator_id' => $creator->id,
                                'content_type' => 'tiktok_video',
                                'price' => $ratePrice,
                                'currency' => 'VND',
                                'is_active' => true,
                            ]);
                        }

                        $imported++;
                    }

                    return [
                        'creator' => $creator,
                        'is_new' => $isNew,
                    ];
                });

                // Auto-Enrichment Trigger: Nếu thiếu chỉ số, tự động đẩy Job vào Queue
                if ($autoEnrich && !empty($handle) && ($followers === 0 || ($parsed['average_views'] ?? 0) === 0)) {
                    SyncCreatorMetricsJob::dispatch(
                        $handle,
                        $platform,
                        $upsertResult['creator']?->id
                    )->delay(now()->addMilliseconds($enrichedCount * 200));
                    $enrichedCount++;
                }
            } catch (\Exception $e) {
                $errors[] = "Dòng {$lineNum}: Lỗi - " . $e->getMessage();
                $skipped++;
            }
        }

        return [
            'total_rows' => max(0, $totalRawRows - $dataStartIndex),
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'enriched' => $enrichedCount,
            'errors' => $errors,
            'connector' => 'SmartSchemaMapper',
        ];
    }

    /**
     * Trích xuất và chuẩn hóa giá trị của một dòng dựa trên Schema Mapping
     */
    protected function extractRowWithMapping(
        array $row,
        array $headers,
        array $mappings,
        array $extraColumns
    ): array {
        $extracted = [];
        $extraAttributes = [];

        foreach ($headers as $colIdx => $colName) {
            $rawVal = $row[$colIdx] ?? null;
            if ($rawVal === null || trim((string) $rawVal) === '') {
                continue;
            }

            if (isset($mappings[$colIdx])) {
                $field = $mappings[$colIdx]['field'];
                $extracted[$field] = is_string($rawVal) ? trim($rawVal) : $rawVal;
            } elseif (isset($extraColumns[$colIdx])) {
                $extraKey = $extraColumns[$colIdx]['attribute_key'];
                $extraAttributes[$extraKey] = is_string($rawVal) ? trim($rawVal) : $rawVal;
            } else {
                $cleanColName = preg_replace('/[^a-zA-Z0-9_]/', '_', mb_strtolower($colName));
                $extraAttributes[$cleanColName] = is_string($rawVal) ? trim($rawVal) : $rawVal;
            }
        }

        // Áp dụng Value Normalization Rules
        $name = trim((string) ($extracted['name'] ?? ''));
        $rawPhone = $extracted['phone'] ?? null;
        $phone = CreatorNormalizationService::normalizePhone($rawPhone);
        $rawEmail = $extracted['email'] ?? null;
        $email = !empty($rawEmail) ? strtolower(trim((string) $rawEmail)) : null;

        // Xử lý Profile URL, Platform & Handle
        $rawUrl = (string) ($extracted['profile_url'] ?? '');
        $rawHandle = (string) ($extracted['handle'] ?? '');
        $rawPlatform = (string) ($extracted['platform'] ?? '');

        $inferred = CreatorNormalizationService::inferPlatformAndHandle($rawUrl, $rawHandle, $rawPlatform);
        $url = $inferred['url'];
        $handle = $inferred['handle'];
        $platform = PlatformEnum::tryFrom($inferred['platform']) ?? PlatformEnum::TIKTOK;

        if (empty($name) && !empty($handle)) {
            $name = $handle;
        }

        $followers = CreatorNormalizationService::parseMetricNumber($extracted['followers_count'] ?? 0);
        $avgViews = CreatorNormalizationService::parseMetricNumber($extracted['average_views'] ?? 0);
        $gmv = CreatorNormalizationService::parseGmv($extracted['gmv_estimate'] ?? 0);

        $parsedPrice = CreatorNormalizationService::parseRatePrice($extracted['rate_price'] ?? null);
        $ratePrice = $parsedPrice['price'];

        $engagementRate = CreatorNormalizationService::parsePercentage($extracted['engagement_rate'] ?? 0, 'engagement_rate');

        $tier = !empty($extracted['tier'])
            ? (CreatorTierEnum::tryFrom(strtolower(trim((string) $extracted['tier']))) ?? CreatorNormalizationService::determineTier($followers))
            : CreatorNormalizationService::determineTier($followers);

        $niche = !empty($extracted['niche']) ? trim((string) $extracted['niche']) : 'general';

        $notes = $extracted['notes'] ?? null;
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
            'average_views' => $avgViews,
            'engagement_rate' => $engagementRate,
            'gmv_estimate' => $gmv,
            'rate_price' => $ratePrice,
            'tier' => $tier,
            'niche' => $niche,
            'shipping_address' => $extracted['shipping_address'] ?? null,
            'city_province' => $extracted['city_province'] ?? null,
            'district' => $extracted['district'] ?? null,
            'notes' => $notes,
            'extra_attributes' => $extraAttributes,
        ];
    }

    /**
     * Nhập file theo Connector truyền thống (dành cho FastMoss/Kalodata chọn chủ đích)
     */
    protected function importWithConnector(array $rows, $connector, ?User $user, bool $autoEnrich): array
    {
        $connectorName = class_basename($connector);
        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $enrichedCount = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2;
            $parsed = $connector->parse($row);

            if (!$connector->validate($parsed)) {
                $errors[] = "Dòng {$lineNum}: Thiếu tên Creator hoặc @handle nhận diện.";
                $skipped++;
                continue;
            }

            $name = $parsed['name'];
            $phone = $parsed['phone'];
            $email = $parsed['email'];
            /** @var PlatformEnum $platform */
            $platform = $parsed['platform'];
            $handle = $parsed['handle'];
            $followers = $parsed['followers_count'];
            $tier = $parsed['tier'];
            $dataSource = $parsed['data_source'] ?? 'excel_import';

            try {
                $upsertResult = DB::transaction(function () use (
                    $parsed,
                    $name,
                    $phone,
                    $email,
                    $platform,
                    $handle,
                    $followers,
                    $tier,
                    $dataSource,
                    $user,
                    &$imported,
                    &$updated
                ) {
                    $existingCreator = $this->dedupService->findExistingMatch(
                        phone: $phone,
                        email: $email,
                        platform: $platform->value,
                        handle: $handle
                    );

                    $creator = null;
                    if ($existingCreator) {
                        $creator = $existingCreator;
                        $updates = [];
                        if (empty($existingCreator->phone) && !empty($phone)) {
                            $updates['phone'] = $phone;
                        }
                        if (empty($existingCreator->email) && !empty($email)) {
                            $updates['email'] = $email;
                        }
                        if (empty($existingCreator->shipping_address) && !empty($parsed['shipping_address'])) {
                            $updates['shipping_address'] = $parsed['shipping_address'];
                        }
                        if (empty($existingCreator->city_province) && !empty($parsed['city_province'])) {
                            $updates['city_province'] = $parsed['city_province'];
                        }
                        if (empty($existingCreator->district) && !empty($parsed['district'])) {
                            $updates['district'] = $parsed['district'];
                        }
                        if ($existingCreator->niche === 'general' && !empty($parsed['niche']) && $parsed['niche'] !== 'general') {
                            $updates['niche'] = $parsed['niche'];
                        }
                        if (!empty($parsed['notes'])) {
                            $updates['notes'] = $existingCreator->notes
                                ? ($existingCreator->notes . ' | ' . $parsed['notes'])
                                : $parsed['notes'];
                        }
                        $updates['updated_by'] = $user?->id;

                        if (!empty($updates)) {
                            $existingCreator->update($updates);
                        }

                        if (!empty($handle)) {
                            CreatorAccount::updateOrCreate(
                                [
                                    'creator_id' => $existingCreator->id,
                                    'platform' => $platform->value,
                                    'handle' => $handle,
                                ],
                                [
                                    'url' => $parsed['url'] ?? "https://{$platform->value}.com/@{$handle}",
                                    'followers_count' => max($followers, 0),
                                    'engagement_rate' => $parsed['engagement_rate'] ?? 0.0,
                                    'average_views' => $parsed['average_views'] ?? 0,
                                    'gmv_estimate' => $parsed['gmv_estimate'] ?? 0,
                                    'data_source' => $dataSource,
                                    'last_metrics_updated_at' => now(),
                                ]
                            );
                        }

                        $updated++;
                    } else {
                        $creator = Creator::create([
                            'name' => $name,
                            'phone' => $phone,
                            'email' => $email,
                            'shipping_address' => $parsed['shipping_address'] ?? null,
                            'city_province' => $parsed['city_province'] ?? null,
                            'district' => $parsed['district'] ?? null,
                            'niche' => !empty($parsed['niche']) ? trim($parsed['niche']) : 'general',
                            'tier' => $tier,
                            'trust_score' => 100,
                            'notes' => $parsed['notes'] ?? null,
                            'created_by' => $user?->id,
                        ]);

                        if (!empty($handle)) {
                            CreatorAccount::create([
                                'creator_id' => $creator->id,
                                'platform' => $platform->value,
                                'handle' => $handle,
                                'url' => $parsed['url'] ?? "https://{$platform->value}.com/@{$handle}",
                                'followers_count' => $followers,
                                'engagement_rate' => $parsed['engagement_rate'] ?? 0.0,
                                'average_views' => $parsed['average_views'] ?? 0,
                                'gmv_estimate' => $parsed['gmv_estimate'] ?? 0,
                                'data_source' => $dataSource,
                                'last_metrics_updated_at' => now(),
                            ]);
                        }

                        $ratePrice = (float) ($parsed['rate_price'] ?? 0);
                        if ($ratePrice > 0) {
                            CreatorRateCard::create([
                                'creator_id' => $creator->id,
                                'content_type' => 'tiktok_video',
                                'price' => $ratePrice,
                                'currency' => 'VND',
                                'is_active' => true,
                            ]);
                        }

                        $imported++;
                    }

                    return $creator;
                });

                if ($autoEnrich && !empty($handle) && ($followers === 0 || ($parsed['average_views'] ?? 0) === 0)) {
                    SyncCreatorMetricsJob::dispatch(
                        $handle,
                        $platform,
                        $upsertResult?->id
                    )->delay(now()->addMilliseconds($enrichedCount * 200));
                    $enrichedCount++;
                }
            } catch (\Exception $e) {
                $errors[] = "Dòng {$lineNum}: Lỗi - " . $e->getMessage();
                $skipped++;
            }
        }

        return [
            'total_rows' => count($rows),
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'enriched' => $enrichedCount,
            'errors' => $errors,
            'connector' => $connectorName,
        ];
    }

    /**
     * Cập nhật hoặc thêm mới Creator và CreatorAccount từ kết quả đồng bộ tự động
     */
    public function upsertSyncedCreator(array $transformed, ?int $creatorId = null): array
    {
        return DB::transaction(function () use ($transformed, $creatorId) {
            $handle = $transformed['handle'];
            $platform = $transformed['platform'];
            $platformVal = $platform instanceof PlatformEnum ? $platform->value : $platform;
            $metrics = $transformed['metrics'] ?? [];

            $creator = null;
            if ($creatorId) {
                $creator = Creator::find($creatorId);
            }

            if (!$creator) {
                $creator = $this->dedupService->findExistingMatch(
                    phone: $transformed['phone'] ?? null,
                    email: $transformed['email'] ?? null,
                    platform: $platformVal,
                    handle: $handle
                );
            }

            if ($creator) {
                $updates = [];
                if (empty($creator->phone) && !empty($transformed['phone'])) {
                    $updates['phone'] = $transformed['phone'];
                }
                if (empty($creator->email) && !empty($transformed['email'])) {
                    $updates['email'] = $transformed['email'];
                }
                if (!empty($updates)) {
                    $creator->update($updates);
                }
            } else {
                $creator = Creator::create([
                    'name' => $transformed['name'] ?: $handle,
                    'phone' => $transformed['phone'] ?? null,
                    'email' => $transformed['email'] ?? null,
                    'niche' => 'general',
                    'tier' => $transformed['tier']->value ?? 'nano',
                    'notes' => !empty($transformed['bio']) ? "Bio: " . $transformed['bio'] : null,
                ]);
            }

            $account = CreatorAccount::updateOrCreate(
                [
                    'creator_id' => $creator->id,
                    'platform' => $platformVal,
                    'handle' => $handle,
                ],
                [
                    'url' => $transformed['url'] ?? "https://{$platformVal}.com/@{$handle}",
                    'followers_count' => max((int) ($transformed['followers_count'] ?? 0), 0),
                    'average_views' => (int) ($metrics['avg_views'] ?? ($transformed['average_views'] ?? 0)),
                    'average_likes' => (int) ($metrics['avg_likes'] ?? ($transformed['average_likes'] ?? 0)),
                    'average_comments' => (int) ($metrics['avg_comments'] ?? ($transformed['average_comments'] ?? 0)),
                    'average_shares' => (int) ($metrics['avg_shares'] ?? ($transformed['average_shares'] ?? 0)),
                    'engagement_rate' => (float) ($metrics['engagement_rate'] ?? ($transformed['engagement_rate'] ?? 0.0)),
                    'view_engagement_rate' => (float) ($metrics['view_engagement_rate'] ?? ($transformed['view_engagement_rate'] ?? 0.0)),
                    'posts_sample_count' => (int) ($transformed['posts_sample_count'] ?? 0),
                    'gmv_estimate' => (int) ($transformed['gmv_estimate'] ?? 0),
                    'raw_metrics' => $transformed['raw_metrics'] ?? null,
                    'data_source' => $transformed['data_source'] ?? 'automated_sync',
                    'last_metrics_updated_at' => now(),
                    'last_synced_at' => now(),
                    'sync_status' => 'success',
                    'sync_error_message' => null,
                ]
            );

            CreatorMetricsHistory::updateOrCreate(
                [
                    'creator_account_id' => $account->id,
                    'snapshot_date' => now()->toDateString(),
                ],
                [
                    'followers_count' => $account->followers_count,
                    'average_views' => $account->average_views,
                    'average_likes' => $account->average_likes,
                    'average_comments' => $account->average_comments,
                    'average_shares' => $account->average_shares,
                    'engagement_rate' => $account->engagement_rate,
                    'view_engagement_rate' => $account->view_engagement_rate,
                    'posts_sample_count' => $account->posts_sample_count,
                ]
            );

            return [
                'creator' => $creator,
                'account' => $account,
            ];
        });
    }

    /**
     * Đọc toàn bộ các dòng thô từ file CSV hoặc Excel không bỏ sót dòng tiêu đề/logo
     */
    public function parseRawRows(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        $extension = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
        $rows = [];

        if (in_array($extension, ['xlsx', 'xls'])) {
            try {
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
                $worksheet = $spreadsheet->getActiveSheet();
                $sheetData = $worksheet->toArray(null, true, true, false);

                if (!empty($sheetData)) {
                    foreach ($sheetData as $data) {
                        if (!empty(array_filter($data, fn ($cell) => $cell !== null && trim((string) $cell) !== ''))) {
                            $rows[] = array_map(fn ($cell) => $cell !== null ? trim((string) $cell) : '', $data);
                        }
                    }
                }
                return $rows;
            } catch (\Throwable $e) {
                // Fallback xuống CSV
            }
        }

        if (($handle = fopen($path, 'r')) !== false) {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            $firstLine = fgets($handle);
            rewind($handle);
            if ($bom === "\xEF\xBB\xBF") {
                fseek($handle, 3);
            }

            $delimiter = ',';
            if ($firstLine) {
                $commaCount = substr_count($firstLine, ',');
                $semiCount = substr_count($firstLine, ';');
                $tabCount = substr_count($firstLine, "\t");
                if ($semiCount > $commaCount && $semiCount > $tabCount) {
                    $delimiter = ';';
                } elseif ($tabCount > $commaCount && $tabCount > $semiCount) {
                    $delimiter = "\t";
                }
            }

            while (($data = fgetcsv($handle, 8000, $delimiter)) !== false) {
                if (!empty(array_filter($data, fn ($cell) => trim((string) $cell) !== ''))) {
                    $rows[] = array_map(fn ($cell) => trim((string) $cell), $data);
                }
            }
            fclose($handle);
        }

        return $rows;
    }
}
