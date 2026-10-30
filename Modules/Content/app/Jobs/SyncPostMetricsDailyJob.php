<?php

namespace Modules\Content\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Modules\Content\Services\ContentMetricsSyncService;

class SyncPostMetricsDailyJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct() {}

    /**
     * Execute the job.
     */
    public function handle(ContentMetricsSyncService $syncService): void
    {
        Log::info('[SyncPostMetricsDailyJob] Bắt đầu quét đồng bộ chỉ số video hàng ngày...');

        $syncedCount = $syncService->syncAllActivePosts();

        Log::info("[SyncPostMetricsDailyJob] Đã hoàn thành đồng bộ chỉ số cho {$syncedCount} video.");
    }
}
