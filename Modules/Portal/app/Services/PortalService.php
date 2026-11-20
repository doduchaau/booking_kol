<?php

namespace Modules\Portal\Services;

use App\Models\User;
use App\Notifications\KocAddressConfirmedNotification;
use App\Notifications\KocVideoSubmittedNotification;
use Exception;
use Illuminate\Support\Facades\Log;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Services\CreatorNormalizationService;

class PortalService
{
    /**
     * Xác thực và nạp dữ liệu bằng chuỗi portal_token
     *
     * @throws Exception
     */
    public function getValidCampaignCreator(string $token): CampaignCreator
    {
        $campaignCreator = CampaignCreator::where('portal_token', $token)
            ->with(['campaign.products', 'creator.accounts', 'creatorProducts.campaignProduct'])
            ->first();

        if (!$campaignCreator) {
            throw new Exception('Đường link Portal không tồn tại hoặc đã bị thu hồi.');
        }

        if ($campaignCreator->portal_token_expires_at && $campaignCreator->portal_token_expires_at->isPast()) {
            $customMsg = class_exists(\Modules\Settings\Models\Setting::class)
                ? \Modules\Settings\Models\Setting::get('portal_expired_custom_message', '')
                : '';
            $message = !empty($customMsg)
                ? $customMsg
                : 'Đường link Portal này đã hết hạn truy cập. Vui lòng liên hệ nhân viên phụ trách để nhận link mới.';
            throw new Exception($message);
        }

        return $campaignCreator;
    }

    /**
     * Bước 1: Creator xác nhận / điền địa chỉ nhận mẫu
     */
    public function updateShippingAddress(CampaignCreator $campaignCreator, array $data): CampaignCreator
    {
        $creator = $campaignCreator->creator;

        // Chuẩn hóa SĐT nếu có cập nhật
        $phone = !empty($data['phone'])
            ? CreatorNormalizationService::normalizePhone($data['phone'])
            : $creator->phone;

        $creator->update([
            'phone' => $phone,
            'shipping_address' => $data['shipping_address'],
            'city_province' => $data['city_province'] ?? $creator->city_province,
            'district' => $data['district'] ?? $creator->district,
            'ward' => $data['ward'] ?? $creator->ward,
        ]);

        // Cập nhật trạng thái Pipeline sang "address_confirmed" nếu chưa sang các bước sau
        $currentStatus = $campaignCreator->status;
        if (in_array($currentStatus, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED, PipelineStatusEnum::AGREED])) {
            $campaignCreator->update([
                'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
                'address_confirmed_at' => now(),
            ]);

            // Gửi thông báo cho Staff phụ trách hoặc Quản lý
            try {
                $campaignCreator->loadMissing(['assignee', 'campaign', 'creator']);
                $recipient = $campaignCreator->assignee;
                if (!$recipient) {
                    $recipient = User::whereHas('roles', fn($q) => $q->where('name', 'Admin'))->first() ?? User::first();
                }
                if ($recipient) {
                    $recipient->notify(new KocAddressConfirmedNotification($campaignCreator));
                }
            } catch (\Throwable $e) {
                Log::warning('Lỗi gửi thông báo xác nhận địa chỉ: ' . $e->getMessage());
            }

            if (class_exists(\App\Services\SystemCacheService::class)) {
                \App\Services\SystemCacheService::flushDashboardCache();
                \App\Services\SystemCacheService::flushWorkspaceCache();
            }
        }

        return $campaignCreator;
    }

    /**
     * Bước 2: Bấm 1-chạm báo đã nhận được sản phẩm
     */
    public function confirmReceipt(CampaignCreator $campaignCreator): CampaignCreator
    {
        $isSent = !is_null($campaignCreator->sample_sent_at) || $campaignCreator->status === PipelineStatusEnum::SAMPLE_SENT;
        if (!$isSent) {
            throw new Exception('Sản phẩm mẫu chưa được gửi đi. Vui lòng liên hệ nhân viên phụ trách.');
        }

        $campaignCreator->update([
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => now(),
        ]);

        // Đánh dấu tất cả sản phẩm mẫu của KOC này sang trạng thái "received"
        $campaignCreator->loadMissing('creatorProducts');
        foreach ($campaignCreator->creatorProducts as $cp) {
            $cp->update([
                'sample_status' => \Modules\Campaign\Enums\SampleStatusEnum::RECEIVED,
                'received_at' => now(),
            ]);
        }

        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushDashboardCache();
            \App\Services\SystemCacheService::flushWorkspaceCache();
        }

        return $campaignCreator;
    }

    /**
     * Bước 3: Creator nộp link bài đăng video
     */
    public function submitVideo(CampaignCreator $campaignCreator, array $data): ContentPost
    {
        $isSent = !is_null($campaignCreator->sample_sent_at) || in_array($campaignCreator->status, [
            PipelineStatusEnum::SAMPLE_SENT,
            PipelineStatusEnum::SAMPLE_RECEIVED,
            PipelineStatusEnum::POSTED,
            PipelineStatusEnum::COMPLETED,
        ]);

        if (!$isSent) {
            throw new Exception('Chưa thể nộp link video khi chưa gửi mẫu sản phẩm.');
        }

        // Tạo bản ghi bài đăng trong content_posts
        $post = ContentPost::create([
            'campaign_creator_id' => $campaignCreator->id,
            'platform' => $data['platform'] ?? 'tiktok',
            'post_url' => $data['post_url'],
            'video_title' => $data['video_title'] ?? null,
            'posted_at' => now(),
            'status' => 'pending_approval',
        ]);

        // Tự động kiểm tra và chấm điểm tuân thủ ngay khi nộp
        try {
            if (class_exists(\Modules\Content\Services\VideoComplianceService::class)) {
                app(\Modules\Content\Services\VideoComplianceService::class)->evaluatePost($post);
            }
        } catch (\Throwable $e) {
            Log::warning('Lỗi tự động kiểm tra tuân thủ khi KOC nộp video: ' . $e->getMessage());
        }

        // Chuyển trạng thái Pipeline sang "posted"
        $campaignCreator->update([
            'status' => PipelineStatusEnum::POSTED,
            'posted_at' => now(),
        ]);

        // Gửi thông báo nộp video cho Staff phụ trách hoặc Quản lý
        try {
            $campaignCreator->loadMissing(['assignee', 'campaign', 'creator']);
            $recipient = $campaignCreator->assignee;
            if (!$recipient) {
                $recipient = User::whereHas('roles', fn($q) => $q->where('name', 'Admin'))->first() ?? User::first();
            }
            if ($recipient) {
                $recipient->notify(new KocVideoSubmittedNotification($campaignCreator, $post));
            }
        } catch (\Throwable $e) {
            Log::warning('Lỗi gửi thông báo nộp video: ' . $e->getMessage());
        }

        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushDashboardCache();
            \App\Services\SystemCacheService::flushWorkspaceCache();
        }

        return $post;
    }

    /**
     * Pre-check kiểm tra video trước khi KOC bấm nộp
     */
    public function precheckVideo(CampaignCreator $campaignCreator, array $data): array
    {
        $platform = $data['platform'] ?? 'tiktok';
        $postUrl = $data['post_url'] ?? '';

        $campaignCreator->loadMissing(['campaign', 'creator.accounts', 'creatorProducts.campaignProduct']);
        $campaign = $campaignCreator->campaign;
        $creator = $campaignCreator->creator;

        $extractor = app(\Modules\Content\Services\VideoMetadataExtractorService::class);
        $complianceService = app(\Modules\Content\Services\VideoComplianceService::class);

        $metadata = $extractor->extract($platform, $postUrl);

        return $complianceService->evaluate(
            platform: $platform,
            url: $postUrl,
            metadata: $metadata,
            campaign: $campaign,
            creator: $creator,
            campaignCreator: $campaignCreator
        );
    }
}
