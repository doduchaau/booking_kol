<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Modules\Campaign\Models\CampaignCreator;

class KocNoShowAlertNotification extends Notification
{
    use Queueable;

    public function __construct(
        public CampaignCreator $campaignCreator
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
            'title' => "CẢNH BÁO BOM HÀNG: KOC {$creatorName}",
            'message' => "Chiến dịch \"{$campaignName}\": KOC đã nhận mẫu nhưng không lên video và mất liên lạc. Điểm uy tín đã bị trừ 30 điểm.",
            'category' => 'risk',
            'icon' => 'ShieldAlert',
            'url' => route('campaigns.show', ['id' => $campaignId]) . "?focus_koc={$this->campaignCreator->id}&stage=completion",
            'campaign_id' => $campaignId,
            'campaign_creator_id' => $this->campaignCreator->id,
            'creator_name' => $creatorName,
            'creator_id' => $this->campaignCreator->creator_id,
            'campaign_name' => $campaignName,
        ];
    }
}

