<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;

class KocVideoSubmittedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public CampaignCreator $campaignCreator,
        public ?ContentPost $contentPost = null
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
        $platform = ucfirst($this->contentPost?->platform ?? 'video');

        return [
            'title' => "KOC {$creatorName} đã nộp video {$platform}",
            'message' => "Chiến dịch \"{$campaignName}\": Video nghiệm thu mới vừa được đăng tải. Vui lòng kiểm duyệt nội dung bài đăng.",
            'category' => 'video',
            'icon' => 'Video',
            'url' => route('campaigns.show', ['id' => $campaignId]) . "?focus_koc={$this->campaignCreator->id}&stage=production",
            'campaign_id' => $campaignId,
            'campaign_creator_id' => $this->campaignCreator->id,
            'creator_name' => $creatorName,
            'campaign_name' => $campaignName,
            'post_url' => $this->contentPost?->post_url,
        ];
    }
}

