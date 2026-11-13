<?php

namespace Modules\Creator\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Modules\Creator\Connectors\ConnectorFactory;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Jobs\SyncCreatorMetricsJob;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorImportJob;
use Modules\Creator\Models\CreatorMetricsHistory;
use Modules\Creator\Models\CreatorRateCard;
use Modules\Creator\Services\Support\ChunkReadFilter;
use Modules\Creator\Services\Support\PreviewReadFilter;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CreatorImportService
{
    public function __construct(
        protected CreatorDeduplicationService $dedupService,
        protected SmartSchemaMapperService $schemaMapper
    ) {}

    /**
     * Phân tích file tải lên để trả về Schema Mapping, Header phát hiện và Preview dữ liệu mẫu
     * Tối ưu hóa bộ nhớ: chỉ đọc tối đa 35 dòng đầu phục vụ nhận diện và preview
     */
    public function analyzeFile(UploadedFile|string $file, ?User $user = null): array
    {
        $isUploaded = $file instanceof UploadedFile;
        $originalName = $isUploaded ? $file->getClientOriginalName() : basename($file);
        $extension = strtolower($isUploaded
            ? ($file->getClientOriginalExtension() ?: pathinfo($originalName, PATHINFO_EXTENSION))
            : pathinfo($file, PATHINFO_EXTENSION)
        );

        // Lưu file tạm vào storage/app/temp_imports để dùng cho bước Confirm mà không cần upload lại
        $token = Str::random(40);
        $tempDir = storage_path('app/temp_imports');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        $targetPath = $tempDir . DIRECTORY_SEPARATOR . $token . '.' . $extension;
        $sourcePath = $isUploaded ? $file->getRealPath() : $file;
        copy($sourcePath, $targetPath);

        // Đọc tối đa 35 dòng đầu phục vụ Preview & Header Locator
        $previewRawRows = $this->readPreviewRows($targetPath, $extension, 35);
        $schema = $this->schemaMapper->detectSchema($previewRawRows);

        $headerRowIndex = $schema['header_row_index'];
        $headers = $schema['headers'];
        $mappings = $schema['mappings'];
        $extraColumns = $schema['extra_columns'];
        $unmappedColumns = $schema['unmapped_columns'];

        // Đếm tổng số dòng dữ liệu thực tế siêu tốc không tốn RAM
        $delimiter = $this->detectCsvDelimiter($targetPath);
        $totalDataRows = $this->countTotalDataRows($targetPath, $extension, $headerRowIndex, $delimiter);

        // Lấy 5 dòng dữ liệu mẫu sau dòng header để sinh Live Preview
        $previewRows = [];
        $dataStartIndex = $headerRowIndex + 1;
        $totalRawPreview = count($previewRawRows);

        for ($i = $dataStartIndex; $i < $totalRawPreview && count($previewRows) < 5; $i++) {
            $row = $previewRawRows[$i] ?? [];
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

        // Lưu bản ghi CreatorImportJob
        $importJob = CreatorImportJob::create([
            'user_id' => $user?->id,
            'file_name' => $originalName,
            'file_token' => $token,
            'file_path' => $targetPath,
            'file_format' => $extension,
            'total_rows' => $totalDataRows,
            'header_row_index' => $headerRowIndex,
            'headers' => $headers,
            'status' => 'pending',
        ]);

        return [
            'file_token' => $token,
            'file_name' => $originalName,
            'job_id' => $importJob->id,
            'header_row_index' => $headerRowIndex,
            'total_rows' => $totalDataRows,
            'columns_review' => $columnsReview,
            'preview_rows' => $previewRows,
            'unmapped_count' => count($unmappedColumns),
        ];
    }

    /**
     * Xử lý một Chunk dữ liệu được gọi tuần tự từ Frontend (Streaming Chunk API)
     */
    public function processChunk(
        string $fileToken,
        int $chunkIndex,
        int $chunkSize = 200,
        ?array $customMapping = null,
        bool $autoEnrich = true,
        ?User $user = null
    ): array {
        $job = CreatorImportJob::where('file_token', $fileToken)->first();
        if (!$job) {
            throw new \InvalidArgumentException("Không tìm thấy phiên import với mã file: {$fileToken}");
        }

        if ($job->status === 'cancelled') {
            return [
                'is_cancelled' => true,
                'status' => 'cancelled',
                'message' => 'Phiên import đã bị hủy.',
            ];
        }

        if ($job->status === 'pending') {
            $job->update([
                'status' => 'processing',
                'custom_mapping' => $customMapping,
                'auto_enrich' => $autoEnrich,
            ]);
        }

        $filePath = $job->file_path;
        $extension = $job->file_format;
        $headerRowIndex = $job->header_row_index;
        $headers = $job->headers ?: [];

        // Xác định mappings & extraColumns
        $mappings = [];
        $extraColumns = [];
        if (!empty($customMapping)) {
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
        } else {
            // Dò lại schema từ preview nếu người dùng không tùy biến
            $previewRows = $this->readPreviewRows($filePath, $extension, 35);
            $schema = $this->schemaMapper->detectSchema($previewRows);
            $mappings = $schema['mappings'];
            $extraColumns = $schema['extra_columns'];
        }

        // Tính toán dòng bắt đầu trong file (1-based index)
        $dataStartIndex = $headerRowIndex + 1;
        $startRowInFile = $dataStartIndex + ($chunkIndex * $chunkSize) + 1;

        $delimiter = $this->detectCsvDelimiter($filePath);
        $chunkRows = $this->readRowsChunk($filePath, $startRowInFile, $chunkSize, $extension, $delimiter);

        $imported = 0;
        $updated = 0;
        $skipped = 0;
        $enriched = 0;
        $errors = [];

        if (!empty($chunkRows)) {
            $this->processBatchRows(
                batchRows: $chunkRows,
                headers: $headers,
                mappings: $mappings,
                extraColumns: $extraColumns,
                user: $user,
                autoEnrich: $autoEnrich,
                errors: $errors,
                imported: $imported,
                updated: $updated,
                skipped: $skipped,
                enrichedCount: $enriched,
                baseLineNumber: $startRowInFile
            );
        }

        $processedInChunk = count($chunkRows);
        $job->increment('processed_rows', $processedInChunk);
        $job->increment('imported_count', $imported);
        $job->increment('updated_count', $updated);
        $job->increment('skipped_count', $skipped);

        if (!empty($errors)) {
            $existingErrors = $job->errors ?: [];
            $job->update(['errors' => array_slice(array_merge($existingErrors, $errors), -100)]);
        }

        $job->refresh();

        $isFinished = ($processedInChunk < $chunkSize) || ($job->processed_rows >= $job->total_rows);

        if ($isFinished) {
            $job->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }

        return [
            'success' => true,
            'file_token' => $fileToken,
            'chunk_index' => $chunkIndex,
            'processed_in_chunk' => $processedInChunk,
            'imported_in_chunk' => $imported,
            'updated_in_chunk' => $updated,
            'skipped_in_chunk' => $skipped,
            'total_processed' => $job->processed_rows,
            'total_rows' => $job->total_rows,
            'imported_total' => $job->imported_count,
            'updated_total' => $job->updated_count,
            'skipped_total' => $job->skipped_count,
            'progress_percent' => $job->progress_percent,
            'is_finished' => $isFinished,
            'errors' => $errors,
        ];
    }

    /**
     * Xử lý toàn bộ các Chunks trong một Queue Job ngầm
     */
    public function processAllChunks(CreatorImportJob $job, int $chunkSize = 250): array
    {
        $chunkIndex = 0;
        $totalImported = 0;
        $totalUpdated = 0;
        $totalSkipped = 0;
        $allErrors = [];

        while (true) {
            $result = $this->processChunk(
                fileToken: $job->file_token,
                chunkIndex: $chunkIndex,
                chunkSize: $chunkSize,
                customMapping: $job->custom_mapping,
                autoEnrich: $job->auto_enrich,
                user: $job->user
            );

            if (!empty($result['is_cancelled'])) {
                break;
            }

            $totalImported += $result['imported_in_chunk'];
            $totalUpdated += $result['updated_in_chunk'];
            $totalSkipped += $result['skipped_in_chunk'];

            if (!empty($result['errors'])) {
                $allErrors = array_merge($allErrors, $result['errors']);
            }

            if ($result['is_finished']) {
                break;
            }

            $chunkIndex++;
        }

        return [
            'total_rows' => $job->total_rows,
            'imported' => $totalImported,
            'updated' => $totalUpdated,
            'skipped' => $totalSkipped,
            'errors' => $allErrors,
        ];
    }

    /**
     * Xử lý một mảng bản ghi theo Batch với In-Memory Pre-fetching siêu tốc
     */
    public function processBatchRows(
        array $batchRows,
        array $headers,
        array $mappings,
        array $extraColumns,
        ?User $user,
        bool $autoEnrich,
        array &$errors,
        int &$imported,
        int &$updated,
        int &$skipped,
        int &$enrichedCount,
        int $baseLineNumber = 1,
        string $dataSource = 'smart_import'
    ): void {
        if (empty($batchRows)) {
            return;
        }

        $parsedItems = [];
        $phones = [];
        $emails = [];
        $handles = [];

        foreach ($batchRows as $idx => $row) {
            $lineNum = $baseLineNumber + $idx;
            $parsed = $this->extractRowWithMapping($row, $headers, $mappings, $extraColumns);

            if (empty($parsed['name']) && empty($parsed['handle'])) {
                $errors[] = "Dòng {$lineNum}: Thiếu tên Creator và không tìm thấy @handle/URL nhận diện.";
                $skipped++;
                continue;
            }

            $parsedItems[] = [
                'line_num' => $lineNum,
                'data' => $parsed,
            ];

            if (!empty($parsed['phone'])) {
                $phones[] = $parsed['phone'];
            }
            if (!empty($parsed['email'])) {
                $emails[] = $parsed['email'];
            }
            if (!empty($parsed['handle'])) {
                $handles[] = $parsed['handle'];
            }
        }

        if (empty($parsedItems)) {
            return;
        }

        // Pre-fetching tập trung từ Database (In-Memory Pre-fetching)
        $uniquePhones = array_values(array_filter(array_unique($phones)));
        $uniqueEmails = array_values(array_filter(array_unique(array_map('strtolower', $emails))));
        $uniqueHandles = array_values(array_filter(array_unique(array_map([CreatorNormalizationService::class, 'normalizeHandle'], $handles))));

        $existingByPhone = !empty($uniquePhones)
            ? Creator::whereIn('phone', $uniquePhones)->get()->keyBy('phone')
            : collect();

        $existingByEmail = !empty($uniqueEmails)
            ? Creator::whereIn('email', $uniqueEmails)->get()->keyBy(fn ($c) => strtolower($c->email))
            : collect();

        $existingAccounts = !empty($uniqueHandles)
            ? CreatorAccount::whereIn('handle', $uniqueHandles)
                ->with('creator')
                ->get()
                ->keyBy(fn ($acc) => $acc->platform . ':' . $acc->handle)
            : collect();

        // Thực hiện Upsert trong một Transaction duy nhất cho toàn bộ Batch
        DB::transaction(function () use (
            $parsedItems,
            $user,
            $dataSource,
            $autoEnrich,
            &$existingByPhone,
            &$existingByEmail,
            &$existingAccounts,
            &$imported,
            &$updated,
            &$skipped,
            &$enrichedCount,
            &$errors
        ) {
            foreach ($parsedItems as $item) {
                $lineNum = $item['line_num'];
                $parsed = $item['data'];

                $name = $parsed['name'] ?: ($parsed['handle'] ?? 'Chưa rõ');
                $phone = $parsed['phone'];
                $email = $parsed['email'];
                $platform = $parsed['platform'] instanceof PlatformEnum
                    ? $parsed['platform']
                    : (PlatformEnum::tryFrom($parsed['platform']) ?? PlatformEnum::TIKTOK);
                $handle = $parsed['handle'];
                $followers = $parsed['followers_count'];
                $tier = $parsed['tier'] instanceof CreatorTierEnum
                    ? $parsed['tier']
                    : (CreatorTierEnum::tryFrom((string) $parsed['tier']) ?? CreatorNormalizationService::determineTier($followers));

                try {
                    // So khớp hồ sơ trong Pre-fetch Cache
                    $existingCreator = null;
                    if (!empty($phone) && $existingByPhone->has($phone)) {
                        $existingCreator = $existingByPhone->get($phone);
                    } elseif (!empty($handle) && $existingAccounts->has($platform->value . ':' . $handle)) {
                        $existingCreator = $existingAccounts->get($platform->value . ':' . $handle)->creator;
                    } elseif (!empty($email) && $existingByEmail->has(strtolower($email))) {
                        $existingCreator = $existingByEmail->get(strtolower($email));
                    }

                    if ($existingCreator) {
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
                            $account = CreatorAccount::updateOrCreate(
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
                            $existingAccounts->put($platform->value . ':' . $handle, $account);
                        }

                        $updated++;
                        $creatorTarget = $existingCreator;
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

                        if (!empty($phone)) {
                            $existingByPhone->put($phone, $creator);
                        }
                        if (!empty($email)) {
                            $existingByEmail->put(strtolower($email), $creator);
                        }

                        if (!empty($handle)) {
                            $account = CreatorAccount::create([
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
                            $account->setRelation('creator', $creator);
                            $existingAccounts->put($platform->value . ':' . $handle, $account);
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
                        $creatorTarget = $creator;
                    }

                    // Auto-Enrichment Trigger
                    if ($autoEnrich && !empty($handle) && ($followers === 0 || ($parsed['average_views'] ?? 0) === 0)) {
                        SyncCreatorMetricsJob::dispatch(
                            $handle,
                            $platform,
                            $creatorTarget->id
                        )->delay(now()->addMilliseconds($enrichedCount * 200));
                        $enrichedCount++;
                    }
                } catch (\Throwable $e) {
                    $errors[] = "Dòng {$lineNum}: Lỗi - " . $e->getMessage();
                    $skipped++;
                }
            }
        });
    }

    /**
     * Nhập danh sách Creator từ file CSV hoặc Excel (Backward-Compatible Fast Path)
     */
    public function importFile(
        UploadedFile|string $file,
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

        // Nếu là format chuyên biệt Kalodata/FastMoss được chọn rõ ràng hoặc nhận diện từ Header
        $firstRowHeaders = array_map(fn ($h) => trim(mb_strtolower((string) $h)), $rawRows[0] ?? []);
        $detectedConnector = ConnectorFactory::make($format, $firstRowHeaders);
        $isSpecialized = ($detectedConnector instanceof \Modules\Creator\Connectors\KalodataExportConnector
            || $detectedConnector instanceof \Modules\Creator\Connectors\FastMossExportConnector);

        if ($isSpecialized) {
            $headers = $firstRowHeaders;
            $connector = $detectedConnector;
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
        $dataRows = array_slice($rawRows, $dataStartIndex);

        // Chia khối 200 dòng để xử lý batch siêu tốc
        $chunks = array_chunk($dataRows, 200);
        foreach ($chunks as $chunkIdx => $chunk) {
            $this->processBatchRows(
                batchRows: $chunk,
                headers: $headers,
                mappings: $mappings,
                extraColumns: $extraColumns,
                user: $user,
                autoEnrich: $autoEnrich,
                errors: $errors,
                imported: $imported,
                updated: $updated,
                skipped: $skipped,
                enrichedCount: $enrichedCount,
                baseLineNumber: $dataStartIndex + ($chunkIdx * 200) + 1
            );
        }

        return [
            'total_rows' => count($dataRows),
            'imported' => $imported,
            'updated' => $updated,
            'skipped' => $skipped,
            'enriched' => $enrichedCount,
            'errors' => $errors,
            'connector' => 'SmartSchemaMapper',
        ];
    }

    /**
     * Đọc tối đa số dòng Preview phục vụ việc dò tìm Schema và Live Preview
     */
    public function readPreviewRows(string $filePath, string $extension, int $limit = 35): array
    {
        $rows = [];
        if (in_array($extension, ['xlsx', 'xls'])) {
            try {
                $reader = IOFactory::createReaderForFile($filePath);
                $reader->setReadDataOnly(true);
                $reader->setReadFilter(new PreviewReadFilter($limit));
                $spreadsheet = $reader->load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                $highestRow = min($worksheet->getHighestRow(), $limit);
                $highestColumn = $worksheet->getHighestColumn();

                if ($highestRow >= 1) {
                    $raw = $worksheet->rangeToArray("A1:{$highestColumn}{$highestRow}", null, false, false, false);
                    foreach ($raw as $data) {
                        if (!empty(array_filter($data, fn ($cell) => $cell !== null && trim((string) $cell) !== ''))) {
                            $rows[] = array_map([$this, 'cleanCellValue'], $data);
                        }
                    }
                }
                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);
                gc_collect_cycles();
                return $rows;
            } catch (\Throwable $e) {
                Log::warning("readPreviewRows XLSX error: " . $e->getMessage());
                throw new \RuntimeException("Không thể đọc file Excel ({$extension}): " . $e->getMessage(), 0, $e);
            }
        }

        // CSV Stream
        $delimiter = $this->detectCsvDelimiter($filePath);
        if (($handle = fopen($filePath, 'r')) !== false) {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }
            while (count($rows) < $limit && ($data = fgetcsv($handle, 0, $delimiter)) !== false) {
                if (!empty(array_filter($data, fn ($cell) => trim((string) $cell) !== ''))) {
                    $rows[] = array_map([$this, 'cleanCellValue'], $data);
                }
            }
            fclose($handle);
        }

        return $rows;
    }

    /**
     * Đọc một Chunk dữ liệu cố định từ file Excel / CSV
     */
    public function readRowsChunk(
        string $filePath,
        int $startRow,
        int $chunkSize,
        string $extension,
        string $delimiter = ','
    ): array {
        $rows = [];
        if (in_array($extension, ['xlsx', 'xls'])) {
            try {
                $reader = IOFactory::createReaderForFile($filePath);
                $reader->setReadDataOnly(true);
                $chunkFilter = new ChunkReadFilter();
                $chunkFilter->setRows($startRow, $chunkSize);
                $reader->setReadFilter($chunkFilter);
                $spreadsheet = $reader->load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                $highestRow = $worksheet->getHighestRow();
                $highestColumn = $worksheet->getHighestColumn();
                $endRow = min($highestRow, $startRow + $chunkSize - 1);

                if ($startRow <= $endRow) {
                    $raw = $worksheet->rangeToArray("A{$startRow}:{$highestColumn}{$endRow}", null, false, false, false);
                    foreach ($raw as $data) {
                        if (!empty(array_filter($data, fn ($cell) => $cell !== null && trim((string) $cell) !== ''))) {
                            $rows[] = array_map([$this, 'cleanCellValue'], $data);
                        }
                    }
                }
                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);
                gc_collect_cycles();
                return $rows;
            } catch (\Throwable $e) {
                Log::warning("readRowsChunk XLSX error: " . $e->getMessage());
                throw new \RuntimeException("Không thể đọc khối dữ liệu Excel ({$extension}): " . $e->getMessage(), 0, $e);
            }
        }

        // CSV
        if (($handle = fopen($filePath, 'r')) !== false) {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }
            $currentRow = 1;
            while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
                if ($currentRow >= $startRow && $currentRow < $startRow + $chunkSize) {
                    if (!empty(array_filter($data, fn ($cell) => trim((string) $cell) !== ''))) {
                        $rows[] = array_map([$this, 'cleanCellValue'], $data);
                    }
                }
                if ($currentRow >= $startRow + $chunkSize) {
                    break;
                }
                $currentRow++;
            }
            fclose($handle);
        }

        return $rows;
    }

    /**
     * Đếm tổng số dòng dữ liệu thực tế không nạp tế bào vào RAM
     */
    public function countTotalDataRows(string $filePath, string $extension, int $headerRowIndex, string $delimiter = ','): int
    {
        if (in_array($extension, ['xlsx', 'xls'])) {
            try {
                $reader = IOFactory::createReaderForFile($filePath);
                $info = $reader->listWorksheetInfo($filePath);
                $totalRows = (int) ($info[0]['totalRows'] ?? 0);
                return max(0, $totalRows - ($headerRowIndex + 1));
            } catch (\Throwable $e) {
                Log::warning("countTotalDataRows listWorksheetInfo error: " . $e->getMessage());
                return 0;
            }
        }

        // CSV line count
        $lineCount = 0;
        if (($handle = fopen($filePath, 'r')) !== false) {
            while (!feof($handle)) {
                $buffer = fread($handle, 65536);
                $lineCount += substr_count($buffer, "\n");
            }
            fclose($handle);
        }
        return max(0, $lineCount - ($headerRowIndex + 1));
    }

    /**
     * Nhận diện dấu phân cách CSV thông minh dựa trên 5 dòng đầu tiên
     */
    public function detectCsvDelimiter(string $filePath): string
    {
        $delimiter = ',';
        if (!file_exists($filePath)) {
            return $delimiter;
        }

        if (($handle = fopen($filePath, 'r')) !== false) {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            $commaCount = 0;
            $semiCount = 0;
            $tabCount = 0;

            for ($i = 0; $i < 5; $i++) {
                $line = fgets($handle);
                if ($line === false) break;
                $commaCount += substr_count($line, ',');
                $semiCount += substr_count($line, ';');
                $tabCount += substr_count($line, "\t");
            }
            fclose($handle);

            if ($semiCount > $commaCount && $semiCount > $tabCount) {
                $delimiter = ';';
            } elseif ($tabCount > $commaCount && $tabCount > $semiCount) {
                $delimiter = "\t";
            }
        }

        return $delimiter;
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
     * Nhập file theo Connector truyền thống (dành cho FastMoss/Kalodata)
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

                if ($autoEnrich && !empty($handle) && $followers === 0) {
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

            $existingAccount = CreatorAccount::where('creator_id', $creator->id)
                ->where('platform', $platformVal)
                ->where('handle', $handle)
                ->first();

            $newFollowers = max((int) ($transformed['followers_count'] ?? 0), 0);
            if ($existingAccount && $existingAccount->followers_count > 0 && in_array($existingAccount->data_source, ['fastmoss', 'kalodata', 'smart_import'])) {
                $newFollowers = $existingAccount->followers_count;
            }

            $newGmv = (int) ($transformed['gmv_estimate'] ?? 0);
            if ($newGmv === 0 && $existingAccount && $existingAccount->gmv_estimate > 0) {
                $newGmv = $existingAccount->gmv_estimate;
            }

            $dataSource = $transformed['data_source'] ?? 'automated_sync';
            if ($existingAccount && in_array($existingAccount->data_source, ['fastmoss', 'kalodata', 'smart_import'])) {
                $dataSource = $existingAccount->data_source;
            }

            $account = CreatorAccount::updateOrCreate(
                [
                    'creator_id' => $creator->id,
                    'platform' => $platformVal,
                    'handle' => $handle,
                ],
                [
                    'url' => $transformed['url'] ?? "https://{$platformVal}.com/@{$handle}",
                    'followers_count' => $newFollowers,
                    'average_views' => (int) ($metrics['avg_views'] ?? ($transformed['average_views'] ?? 0)),
                    'average_likes' => (int) ($metrics['avg_likes'] ?? ($transformed['average_likes'] ?? 0)),
                    'average_comments' => (int) ($metrics['avg_comments'] ?? ($transformed['average_comments'] ?? 0)),
                    'average_shares' => (int) ($metrics['avg_shares'] ?? ($transformed['average_shares'] ?? 0)),
                    'engagement_rate' => (float) ($metrics['engagement_rate'] ?? ($transformed['engagement_rate'] ?? 0.0)),
                    'view_engagement_rate' => (float) ($metrics['view_engagement_rate'] ?? ($transformed['view_engagement_rate'] ?? 0.0)),
                    'posts_sample_count' => (int) ($transformed['posts_sample_count'] ?? 0),
                    'gmv_estimate' => $newGmv,
                    'raw_metrics' => $transformed['raw_metrics'] ?? null,
                    'data_source' => $dataSource,
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
     * Đọc toàn bộ các dòng thô từ file CSV hoặc Excel không bỏ sót dòng tiêu đề/logo (Tối ưu RAM)
     */
    public function parseRawRows(UploadedFile|string $file): array
    {
        $path = $file instanceof UploadedFile ? $file->getRealPath() : $file;
        $extension = strtolower(
            $file instanceof UploadedFile
                ? ($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION))
                : pathinfo($path, PATHINFO_EXTENSION)
        );
        $rows = [];

        if (in_array($extension, ['xlsx', 'xls'])) {
            try {
                $reader = IOFactory::createReaderForFile($path);
                $reader->setReadDataOnly(true);
                $spreadsheet = $reader->load($path);
                $worksheet = $spreadsheet->getActiveSheet();
                $highestRow = $worksheet->getHighestRow();
                $highestColumn = $worksheet->getHighestColumn();

                if ($highestRow >= 1) {
                    $rawRange = $worksheet->rangeToArray("A1:{$highestColumn}{$highestRow}", null, false, false, false);
                    foreach ($rawRange as $data) {
                        if (!empty(array_filter($data, fn ($cell) => $cell !== null && trim((string) $cell) !== ''))) {
                            $rows[] = array_map([$this, 'cleanCellValue'], $data);
                        }
                    }
                }
                $spreadsheet->disconnectWorksheets();
                unset($spreadsheet);
                gc_collect_cycles();
                return $rows;
            } catch (\Throwable $e) {
                Log::warning("parseRawRows Excel reading failed: " . $e->getMessage());
                throw new \RuntimeException("Không thể đọc file Excel ({$extension}): " . $e->getMessage(), 0, $e);
            }
        }

        $delimiter = $this->detectCsvDelimiter($path);
        if (($handle = fopen($path, 'r')) !== false) {
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
                if (!empty(array_filter($data, fn ($cell) => trim((string) $cell) !== ''))) {
                    $rows[] = array_map([$this, 'cleanCellValue'], $data);
                }
            }
            fclose($handle);
        }

        return $rows;
    }

    /**
     * Chuẩn hóa và làm sạch chuỗi ô dữ liệu về định dạng UTF-8 hợp lệ
     */
    public function cleanCellValue(mixed $cell): string
    {
        if ($cell === null) {
            return '';
        }
        $str = trim((string) $cell);
        if ($str === '') {
            return '';
        }
        if (mb_check_encoding($str, 'UTF-8')) {
            return $str;
        }
        $converted = @mb_convert_encoding($str, 'UTF-8', ['UTF-8', 'Windows-1252', 'ISO-8859-1']);
        if (mb_check_encoding($converted, 'UTF-8')) {
            return $converted;
        }
        return iconv('UTF-8', 'UTF-8//IGNORE', $str) ?: '';
    }
}
