<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Kol;
use App\Services\Kol\KolDataAdapter;
use App\Services\Kol\PlaywrightNetworkConnector;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Services\CreatorImportService;
use Throwable;

class SyncKolProfileJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Trạng thái đồng bộ theo chuẩn số & chữ
     */
    public const STATUS_PENDING = 0;       // 'pending'
    public const STATUS_PROCESSING = 1;    // 'processing' / 'syncing'
    public const STATUS_COMPLETED = 2;     // 'completed' / 'success'
    public const STATUS_FAILED = 3;        // 'failed'

    /**
     * Số lần thử lại tối đa
     */
    public int $tries = 3;

    /**
     * Thời gian chờ giữa các lần retry (giây): 15s -> 45s -> 90s
     */
    public array $backoff = [15, 45, 90];

    /**
     * Giới hạn thời gian thực thi job (giây)
     */
    public int $timeout = 120;

    /**
     * Khởi tạo Job đồng bộ dữ liệu KOL
     *
     * @param string $url URL trang cá nhân hoặc kênh
     * @param string $platform Nền tảng (tiktok, shopee, kalodata)
     * @param int|null $kolId ID của Creator/Kol nếu đã có trong DB
     * @param bool $force Có bỏ qua cache đồng bộ hay không
     */
    public function __construct(
        public string $url,
        public string $platform = 'tiktok',
        public ?int $kolId = null,
        public bool $force = false
    ) {
        // Chỉ định queue riêng biệt cho Network Interception
        $this->onQueue('kol-network-sync');
    }

    /**
     * Xử lý thực thi Job
     */
    public function handle(
        PlaywrightNetworkConnector $connector,
        KolDataAdapter $adapter,
        CreatorImportService $importService
    ): void {
        $cleanPlatform = strtolower(trim($this->platform));
        $this->logInfo("Bắt đầu xử lý SyncKolProfileJob cho URL: {$this->url} [{$cleanPlatform}]");

        // 1. Cập nhật trạng thái bắt đầu xử lý: 1 (processing)
        $this->updateSyncStatus(self::STATUS_PROCESSING, 'processing');

        try {
            // 2. Thu thập telemetry qua Playwright Process Network Interception
            $telemetry = $connector->fetchKolTelemetry($this->url, $cleanPlatform);

            // 3. Chuẩn hóa & tính toán chỉ số tương tác, lọc bài ghim, bóc tách bio qua Adapter
            $transformed = $adapter->transform($telemetry, $cleanPlatform);

            // 4. Lưu / Cập nhật vào DB qua Service
            $result = $importService->upsertSyncedCreator($transformed, $this->kolId);

            /** @var Creator|Kol $creator */
            $creator = $result['creator'] ?? null;
            /** @var CreatorAccount $account */
            $account = $result['account'] ?? null;

            if ($account) {
                // Cập nhật trạng thái hoàn thành: 2 (completed) và thời gian đồng bộ
                $account->update([
                    'sync_status' => 'completed',
                    'last_synced_at' => now(),
                    'sync_error_message' => null,
                ]);
            }

            $creatorName = $creator?->name ?? ($transformed['name'] ?? $this->url);
            $this->logInfo("Đồng bộ thành công KOL: {$creatorName} (@{$transformed['handle']})", [
                'followers' => $transformed['followers_count'],
                'avg_views' => $transformed['average_views'],
                'er_views' => $transformed['engagement_rate'],
                'phone' => $transformed['phone'],
                'email' => $transformed['email'],
            ]);
        } catch (Throwable $e) {
            $this->logError("Lỗi trong quá trình handle SyncKolProfileJob cho {$this->url}: {$e->getMessage()}", [
                'attempt' => $this->attempts(),
                'exception' => $e,
            ]);

            // Cập nhật trạng thái thất bại: 3 (failed)
            $this->updateSyncStatus(self::STATUS_FAILED, 'failed', $e->getMessage());

            // Ném lỗi để Laravel Queue kích hoạt retry theo $backoff
            throw $e;
        }
    }

    /**
     * Xử lý khi Job thất bại hoàn toàn sau các lần retry
     */
    public function failed(Throwable $exception): void
    {
        $this->logError("Job SyncKolProfileJob thất bại hoàn toàn sau {$this->tries} lần thử: {$this->url}", [
            'error' => $exception->getMessage(),
        ]);

        $this->updateSyncStatus(self::STATUS_FAILED, 'failed', $exception->getMessage());
    }

    /**
     * Cập nhật trạng thái đồng bộ vào bảng creator_accounts
     */
    protected function updateSyncStatus(int $statusCode, string $statusText, ?string $errorMessage = null): void
    {
        try {
            if ($this->kolId) {
                CreatorAccount::where('creator_id', $this->kolId)
                    ->where('platform', $this->platform)
                    ->update([
                        'sync_status' => $statusText,
                        'sync_error_message' => $errorMessage,
                        'last_synced_at' => ($statusCode === self::STATUS_COMPLETED) ? now() : null,
                    ]);
            } else {
                CreatorAccount::where('url', $this->url)
                    ->update([
                        'sync_status' => $statusText,
                        'sync_error_message' => $errorMessage,
                    ]);
            }
        } catch (Throwable $e) {
            $this->logWarning("Không thể cập nhật sync_status: {$e->getMessage()}");
        }
    }

    protected function logInfo(string $message, array $context = []): void
    {
        if (config()->has('logging.channels.kol_sync')) {
            Log::channel('kol_sync')->info("[SyncJob] {$message}", $context);
        } else {
            Log::info("[SyncJob] {$message}", $context);
        }
    }

    protected function logWarning(string $message, array $context = []): void
    {
        if (config()->has('logging.channels.kol_sync')) {
            Log::channel('kol_sync')->warning("[SyncJob] {$message}", $context);
        } else {
            Log::warning("[SyncJob] {$message}", $context);
        }
    }

    protected function logError(string $message, array $context = []): void
    {
        if (config()->has('logging.channels.kol_sync')) {
            Log::channel('kol_sync')->error("[SyncJob] {$message}", $context);
        } else {
            Log::error("[SyncJob] {$message}", $context);
        }
    }
}

