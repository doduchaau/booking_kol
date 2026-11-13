<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Modules\Campaign\Models\CampaignCreator;

class DeadlineUrgencyNotification extends Notification
{
    use Queueable;

    public function __construct(
        public CampaignCreator $campaignCreator,
        public string $urgencyLevel = 'warning', // 'warning' | 'overdue'
        public int $daysLeft = 0
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $creatorName = $this->campaignCreator->creator?->name ?? 'Creator';
        $campaignName = $this->campaignCreator->campaign?->name ?? 'Chiến dịch';
        $campaignId = $this->campaignCreator->campaign_id;

        $isOverdue = $this->urgencyLevel === 'overdue';
        $title = $isOverdue
            ? "QUÁ HẠN: KOC {$creatorName} chưa đăng video"
            : "SẮP HẠN: KOC {$creatorName} còn {$this->daysLeft} ngày để đăng video";

        $message = $isOverdue
            ? "Chiến dịch \"{$campaignName}\": Đã quá hạn deadline nộp video. Vui lòng liên hệ KOC để thúc đẩy tiến độ ngay."
            : "Chiến dịch \"{$campaignName}\": KOC sắp đến hạn nộp video (còn {$this->daysLeft} ngày). Vui lòng gửi tin nhắn Zalo nhắc việc.";

        return [
            'title' => $title,
            'message' => $message,
            'category' => 'deadline',
            'icon' => $isOverdue ? 'AlertTriangle' : 'Clock',
            'url' => route('campaigns.show', ['id' => $campaignId]) . "?focus_koc={$this->campaignCreator->id}&stage=production",
            'campaign_id' => $campaignId,
            'campaign_creator_id' => $this->campaignCreator->id,
            'creator_name' => $creatorName,
            'campaign_name' => $campaignName,
            'urgency_level' => $this->urgencyLevel,
        ];
    }
}

