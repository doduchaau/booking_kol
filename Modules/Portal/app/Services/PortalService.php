<?php

namespace Modules\Portal\Services;

use Exception;
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
            ->with(['campaign', 'creator.accounts'])
            ->first();

        if (!$campaignCreator) {
            throw new Exception('Đường link Portal không tồn tại hoặc đã bị thu hồi.');
        }

        if ($campaignCreator->portal_token_expires_at && $campaignCreator->portal_token_expires_at->isPast()) {
            throw new Exception('Đường link Portal này đã hết hạn truy cập. Vui lòng liên hệ nhân viên phụ trách để nhận link mới.');
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
        ]);

        // Cập nhật trạng thái Pipeline sang "address_confirmed" nếu chưa sang các bước sau
        $currentStatus = $campaignCreator->status;
        if (in_array($currentStatus, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED, PipelineStatusEnum::AGREED])) {
            $campaignCreator->update([
                'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
                'address_confirmed_at' => now(),
            ]);
        }

        return $campaignCreator;
    }

    /**
     * Bước 2: Bấm 1-chạm báo đã nhận được sản phẩm
     */
    public function confirmReceipt(CampaignCreator $campaignCreator): CampaignCreator
    {
        $campaignCreator->update([
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => now(),
        ]);

        return $campaignCreator;
    }

    /**
     * Bước 3: Creator nộp link bài đăng video
     */
    public function submitVideo(CampaignCreator $campaignCreator, array $data): ContentPost
    {
        // Tạo bản ghi bài đăng trong content_posts
        $post = ContentPost::create([
            'campaign_creator_id' => $campaignCreator->id,
            'platform' => $data['platform'] ?? 'tiktok',
            'post_url' => $data['post_url'],
            'video_title' => $data['video_title'] ?? null,
            'posted_at' => now(),
            'status' => 'pending_approval',
        ]);

        // Chuyển trạng thái Pipeline sang "posted"
        $campaignCreator->update([
            'status' => PipelineStatusEnum::POSTED,
            'posted_at' => now(),
        ]);

        return $post;
    }
}
