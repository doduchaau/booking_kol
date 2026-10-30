<?php

namespace Modules\Creator\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Modules\Creator\Connectors\DataProviderConnector;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Services\CreatorImportService;
use Modules\Creator\Services\KolDataAdapter;

class SyncCreatorMetricsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;
    public array $backoff = [2, 8, 32];

    public function __construct(
        public string $handle,
        public PlatformEnum $platform,
        public ?int $creatorId = null,
        public bool $forceRefresh = false
    ) {
        $this->onQueue('kol-sync');
    }

    /**
     * Rate Limiter Middleware qua Redis
     */
    public function middleware(): array
    {
        return [new RateLimited('social-data-provider')];
    }

    public function handle(
        DataProviderConnector $connector,
        KolDataAdapter $adapter,
        CreatorImportService $importService
    ): void {
        $cacheKey = "kol_raw_cache:{$this->platform->value}:{$this->handle}";

        // Đánh dấu trạng thái đang đồng bộ nếu tài khoản đã tồn tại
        CreatorAccount::where('platform', $this->platform)
            ->where('handle', $this->handle)
            ->update([
                'sync_status' => 'syncing',
                'sync_error_message' => null,
            ]);

        try {
            // 1. Kiểm tra Cache 24h (trừ khi có cờ forceRefresh)
            if (!$this->forceRefresh && Cache::has($cacheKey)) {
                $rawPayload = Cache::get($cacheKey);
            } else {
                // 2. Gọi Data Provider thông qua Connector
                $rawPayload = $connector->fetchProfileWithPosts($this->handle, $this->platform);

                // Lưu cache 24 giờ
                Cache::put($cacheKey, $rawPayload, now()->addHours(24));
            }

            // 3. Chuẩn hóa & Tính toán chỉ số qua Adapter
            $transformed = $adapter->transform($rawPayload, $this->platform);

            // 4. Upsert vào Database, cập nhật Creator, Account & Lưu lịch sử
            $importService->upsertSyncedCreator($transformed, $this->creatorId);

            Log::channel('kol_sync')->info("Đồng bộ thành công Creator [{$this->platform->value}]: @{$this->handle}");
        } catch (\Throwable $e) {
            Log::channel('kol_sync')->error("Thất bại khi đồng bộ @{$this->handle}: " . $e->getMessage());

            // Ghi nhận trạng thái lỗi
            CreatorAccount::where('platform', $this->platform)
                ->where('handle', $this->handle)
                ->update([
                    'sync_status' => 'failed',
                    'sync_error_message' => substr($e->getMessage(), 0, 500),
                ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::channel('kol_sync')->error("Job đồng bộ thất bại hoàn toàn sau {$this->tries} lần thử cho @{$this->handle}: " . $exception->getMessage());
    }
}
