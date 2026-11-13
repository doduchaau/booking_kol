<?php

namespace Modules\Content\Console;

use Illuminate\Console\Command;
use Modules\Content\Services\VideoHealthMonitorService;

class CheckVideoHealthCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'content:check-video-health {--days=45 : Số ngày gần nhất để kiểm tra}';

    /**
     * The console command description.
     */
    protected $description = 'Kiểm tra tính sống còn và khả dụng của các video đã nghiệm thu (phát hiện video bị xóa, ẩn hoặc lỗi)';

    /**
     * Execute the console command.
     */
    public function handle(VideoHealthMonitorService $monitorService): int
    {
        $days = (int) $this->option('days') ?: 45;
        $this->info("Bắt đầu quét kiểm tra sức khỏe video trong {$days} ngày gần nhất...");

        $stats = $monitorService->scanActiveApprovedVideos($days);

        $this->info("Đã kiểm tra tổng cộng: {$stats['total_checked']} video.");
        $this->info("- Hoạt động bình thường: {$stats['healthy_count']}");

        if ($stats['issues_detected'] > 0) {
            $this->warn("- Phát hiện bất thường / Không truy cập được: {$stats['issues_detected']}");
            foreach ($stats['details'] as $detail) {
                $this->error("  * [Post #{$detail['post_id']}] {$detail['creator']} ({$detail['campaign']}): {$detail['error']}");
            }
        } else {
            $this->info("- Không có video nào bị lỗi.");
        }

        return Command::SUCCESS;
    }
}

