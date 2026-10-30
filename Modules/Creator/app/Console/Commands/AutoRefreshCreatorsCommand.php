<?php

namespace Modules\Creator\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Modules\Creator\Jobs\SyncCreatorMetricsJob;
use Modules\Creator\Models\CreatorAccount;

class AutoRefreshCreatorsCommand extends Command
{
    /**
     * Tên và chữ ký dòng lệnh
     */
    protected $signature = 'kol:auto-refresh 
                            {--days=7 : Số ngày hết hạn đồng bộ số liệu} 
                            {--limit=100 : Giới hạn tối đa số tài khoản mỗi đợt quét}';

    /**
     * Mô tả lệnh
     */
    protected $description = 'Tự động quét và đẩy các tài khoản Creator quá hạn đồng bộ vào hàng đợi (Queue)';

    /**
     * Thực thi lệnh
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $limit = (int) $this->option('limit');
        $threshold = now()->subDays($days);

        $this->info("Bắt đầu quét tài khoản Creator có last_synced_at <= {$threshold->toDateString()} hoặc chưa từng đồng bộ...");

        // Quét tài khoản chưa đồng bộ hoặc quá hạn $days ngày, ưu tiên KOC đang trong chiến dịch active
        $accounts = CreatorAccount::query()
            ->where(function ($query) use ($threshold) {
                $query->whereNull('last_synced_at')
                    ->orWhere('last_synced_at', '<=', $threshold);
            })
            ->select('creator_accounts.*')
            ->selectSub(function ($query) {
                $query->from('campaign_creators')
                    ->join('campaigns', 'campaigns.id', '=', 'campaign_creators.campaign_id')
                    ->whereColumn('campaign_creators.creator_id', 'creator_accounts.creator_id')
                    ->where('campaigns.status', 'active')
                    ->whereNull('campaign_creators.deleted_at')
                    ->whereNull('campaigns.deleted_at')
                    ->selectRaw('COUNT(*)');
            }, 'active_campaign_count')
            ->orderByDesc('active_campaign_count')
            ->orderByRaw('last_synced_at IS NULL DESC, last_synced_at ASC')
            ->limit($limit)
            ->get();

        if ($accounts->isEmpty()) {
            $this->info("Không có tài khoản nào cần làm mới dữ liệu.");
            return self::SUCCESS;
        }

        $this->info("Tìm thấy {$accounts->count()} tài khoản. Đang đẩy vào hàng đợi [kol-refresh] với Staggered Delay (500ms - 1500ms)...");

        $dispatched = 0;
        $cumulativeDelayMs = 0;

        foreach ($accounts as $index => $account) {
            // Đánh dấu pending
            $account->update([
                'sync_status' => 'pending',
                'sync_error_message' => null,
            ]);

            // Staggered Delay cách nhau 500ms - 1500ms để chống nghẽn và tránh HTTP 429
            $stepDelay = rand(500, 1500);
            $cumulativeDelayMs += $stepDelay;

            SyncCreatorMetricsJob::dispatch(
                $account->handle,
                $account->platform,
                $account->creator_id,
                true // forceRefresh để bỏ qua cache 24h
            )->onQueue('kol-refresh')
             ->delay(now()->addMilliseconds($cumulativeDelayMs));

            $dispatched++;
        }

        $msg = "Đã lên lịch đồng bộ thành công {$dispatched} tài khoản Creator vào hàng đợi kol-refresh.";
        $this->info($msg);
        Log::channel('kol_sync')->info($msg);

        return self::SUCCESS;
    }
}
