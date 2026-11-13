<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Modules\Campaign\Models\CampaignCreator;

class KocAddressConfirmedNotification extends Notification
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
            'title' => "KOC {$creatorName} đã xác nhận địa chỉ",
            'message' => "Chiến dịch \"{$campaignName}\": Creator đã cập nhật thông tin nhận mẫu. Vui lòng kiểm tra và gửi sản phẩm trải nghiệm.",
            'category' => 'shipment',
            'icon' => 'Truck',
            'url' => route('campaigns.show', ['id' => $campaignId]) . "?focus_koc={$this->campaignCreator->id}&stage=shipping",
            'campaign_id' => $campaignId,
            'campaign_creator_id' => $this->campaignCreator->id,
            'creator_name' => $creatorName,
            'campaign_name' => $campaignName,
        ];
    }
}

