<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Modules\Campaign\Models\CampaignCreator;

class KocAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public CampaignCreator $campaignCreator,
        public string $assignerName = 'Leader'
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

        return [
            'title' => "Bạn được phân công phụ trách KOC {$creatorName}",
            'message' => "Quản lý {$this->assignerName} đã phân công bạn phụ trách KOC này trong chiến dịch \"{$campaignName}\".",
            'category' => 'assignment',
            'icon' => 'UserCheck',
            'url' => route('campaigns.show', ['id' => $campaignId]) . "?focus_koc={$this->campaignCreator->id}",
            'campaign_id' => $campaignId,
            'campaign_creator_id' => $this->campaignCreator->id,
            'creator_name' => $creatorName,
            'campaign_name' => $campaignName,
        ];
    }
}

