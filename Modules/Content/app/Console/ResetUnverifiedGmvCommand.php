<?php

namespace Modules\Content\Console;

use Illuminate\Console\Command;
use Modules\Content\Models\ContentPost;
use Modules\Content\Models\ContentPostMetric;
use Modules\Report\Services\ReportCalculationService;

class ResetUnverifiedGmvCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'content:reset-unverified-gmv {--force : Thực hiện trực tiếp không cần hỏi xác nhận}';

    /**
     * The console command description.
     */
    protected $description = 'Dọn dẹp sạch toàn bộ số liệu GMV và đơn hàng ảo/chưa đối soát để tránh gây rối báo cáo';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (!$this->option('force') && !$this->confirm('Hành động này sẽ thiết lập lại GMV và đơn hàng về 0 cho tất cả video chưa có chứng từ đối soát thật. Bạn có muốn tiếp tục?')) {
            $this->info('Đã hủy thao tác.');
            return 0;
        }

        $this->info('Đang tiến hành dọn dẹp số liệu GMV & đơn hàng...');

        // 1. Cập nhật bảng content_posts (chỉ có cột gmv_amount)
        $postsUpdated = ContentPost::query()
            ->where('gmv_amount', '>', 0)
            ->update([
                'gmv_amount' => 0.00,
            ]);

        // 2. Cập nhật bảng snapshot lịch sử content_post_metrics (có cả gmv_amount và orders_count)
        $metricsUpdated = ContentPostMetric::query()
            ->where(function ($query) {
                $query->where('gmv_amount', '>', 0)
                    ->orWhere('orders_count', '>', 0);
            })
            ->update([
                'gmv_amount' => 0.00,
                'orders_count' => 0,
            ]);

        // 3. Xóa cache báo cáo
        if (class_exists(ReportCalculationService::class)) {
            ReportCalculationService::flushReportCache();
        }

        $this->info("Thành công! Đã reset GMV về 0 cho {$postsUpdated} video và {$metricsUpdated} bản ghi snapshot lịch sử.");

        return 0;
    }
}
