<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\DeadlineUrgencyNotification;
use Illuminate\Console\Command;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\PipelineService;

class CheckCampaignDeadlinesCommand extends Command
{
    /**
     * Tên và chữ ký của console command
     *
     * @var string
     */
    protected $signature = 'campaigns:check-deadlines';

    /**
     * Mô tả console command
     *
     * @var string
     */
    protected $description = 'Quét và gửi thông báo cảnh báo deadline nộp video cho KOC';

    /**
     * Thực thi console command
     */
    public function handle(PipelineService $pipelineService): int
    {
        $this->info('Bắt đầu quét deadline nộp video của KOC...');

        $kocs = CampaignCreator::query()
            ->whereNotNull('sample_received_at')
            ->whereNotIn('status', [
                PipelineStatusEnum::POSTED,
                PipelineStatusEnum::COMPLETED,
                PipelineStatusEnum::NO_SHOW,
                PipelineStatusEnum::DECLINED,
            ])
            ->with(['campaign', 'creator', 'assignee'])
            ->get();

        $alertsCount = 0;

        foreach ($kocs as $item) {
            $deadline = $pipelineService->calculateDeadline($item);
            if (!$deadline || !in_array($deadline['status'], ['warning', 'overdue'])) {
                continue;
            }

            $recipient = $item->assignee;
            if (!$recipient) {
                $recipient = User::whereHas('roles', fn($q) => $q->where('name', 'Admin'))->first() ?? User::first();
            }

            if ($recipient) {
                try {
                    $recipient->notify(new DeadlineUrgencyNotification(
                        campaignCreator: $item,
                        urgencyLevel: $deadline['status'],
                        daysLeft: (int) ($deadline['days'] ?? 0)
                    ));
                    $alertsCount++;
                } catch (\Throwable $e) {
                    $this->warn("Lỗi gửi thông báo cho KOC ID {$item->id}: " . $e->getMessage());
                }
            }
        }

        $this->info("Đã quét hoàn tất: Gửi thành công {$alertsCount} thông báo cảnh báo deadline.");

        return Command::SUCCESS;
    }
}

