<?php

namespace Modules\Creator\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Modules\Creator\Models\CreatorImportJob;
use Modules\Creator\Services\CreatorImportService;

class ImportCreatorsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Số lần thử lại tối đa khi gặp lỗi
     */
    public int $tries = 2;

    /**
     * Thời gian timeout của Job (giây)
     */
    public int $timeout = 600;

    public function __construct(
        public int $importJobId,
        public int $chunkSize = 250
    ) {}

    public function handle(CreatorImportService $importService): void
    {
        $jobRecord = CreatorImportJob::find($this->importJobId);

        if (!$jobRecord) {
            Log::channel('kol_sync')->error("ImportCreatorsJob: Không tìm thấy bản ghi CreatorImportJob #{$this->importJobId}");
            return;
        }

        if ($jobRecord->status === 'cancelled') {
            Log::channel('kol_sync')->info("ImportCreatorsJob: Tác vụ #{$this->importJobId} đã bị hủy bởi người dùng.");
            return;
        }

        try {
            $jobRecord->update(['status' => 'processing']);

            $result = $importService->processAllChunks($jobRecord, $this->chunkSize);

            $jobRecord->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            Log::channel('kol_sync')->info("ImportCreatorsJob #{$this->importJobId} hoàn tất: Thêm mới {$result['imported']}, Cập nhật {$result['updated']}, Bỏ qua {$result['skipped']}");
        } catch (\Throwable $e) {
            $jobRecord->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::channel('kol_sync')->error("ImportCreatorsJob #{$this->importJobId} thất bại: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }
}

