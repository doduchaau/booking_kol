<?php

namespace Modules\Outreach\Services;

use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Services\CreatorNormalizationService;
use Modules\Outreach\Models\GroupInvite;
use Modules\Outreach\Models\OptOut;
use Modules\Outreach\Models\OutreachMessage;
use Modules\Outreach\Models\OutreachTemplate;

class OutreachService
{
    public function __construct(
        protected CreatorNormalizationService $normalizationService
    ) {}

    /**
     * Kiểm tra xem số điện thoại hoặc email có nằm trong danh sách từ chối nhận tin hay không
     */
    public function isOptedOut(?string $phone, ?string $email = null): bool
    {
        $normalizedPhone = !empty($phone) ? $this->normalizationService->normalizePhone($phone) : null;

        return OptOut::query()
            ->where(function ($q) use ($normalizedPhone, $email) {
                if ($normalizedPhone) {
                    $q->where('phone', $normalizedPhone);
                }
                if ($email) {
                    $q->orWhere('email', strtolower(trim($email)));
                }
            })
            ->exists();
    }

    /**
     * Thêm một số điện thoại / email vào danh sách từ chối (Opt-out)
     */
    public function addOptOut(?string $phone, ?string $email = null, ?string $reason = null, string $channel = 'all'): OptOut
    {
        $normalizedPhone = !empty($phone) ? $this->normalizationService->normalizePhone($phone) : null;

        return OptOut::updateOrCreate(
            ['phone' => $normalizedPhone],
            [
                'email' => !empty($email) ? strtolower(trim($email)) : null,
                'reason' => $reason,
                'channel' => $channel,
                'requested_at' => now(),
            ]
        );
    }

    /**
     * Gỡ bỏ khỏi danh sách từ chối
     */
    public function removeOptOut(int $id): bool
    {
        return (bool) OptOut::where('id', $id)->delete();
    }

    /**
     * Render nội dung tin nhắn mẫu với dữ liệu thực tế của KOC và Chiến dịch
     */
    public function renderTemplate(string $templateContent, CampaignCreator $campaignCreator): string
    {
        $creator = $campaignCreator->creator;
        $campaign = $campaignCreator->campaign;

        // Đảm bảo KOC có portal_token để chèn link
        if (empty($campaignCreator->portal_token)) {
            $campaignCreator->generatePortalToken();
            $campaignCreator->refresh();
        }

        $portalLink = url('/portal/' . $campaignCreator->portal_token);
        $rateFormatted = number_format((float) ($campaignCreator->booking_fee ?: 0), 0, ',', '.') . ' đ';

        // Lấy handle mạng xã hội nếu có
        $creator->loadMissing('accounts');
        $primaryAccount = $creator?->accounts?->first();
        $rawHandle = $primaryAccount?->handle;
        $cleanHandle = $rawHandle ? ltrim($rawHandle, '@') : null;
        $handleDisplay = $cleanHandle ? ('@' . $cleanHandle) : ($creator->name ?? 'bạn');

        $replacements = [
            '{creator_name}' => $creator->name ?? 'bạn',
            '{handle}' => $handleDisplay,
            '{creator_handle}' => $handleDisplay,
            '{product_name}' => $campaign->product_name ?? 'sản phẩm',
            '{campaign_name}' => $campaign->name ?? 'chiến dịch',
            '{rate}' => $rateFormatted,
            '{budget}' => $rateFormatted,
            '{portal_link}' => $portalLink,
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $templateContent);
    }

    /**
     * Tạo deep-link Zalo cá nhân mở thẳng khung chat: https://zalo.me/<phone>
     */
    public function generateZaloDeepLink(?string $phone): ?string
    {
        if (empty($phone)) {
            return null;
        }

        $normalized = $this->normalizationService->normalizePhone($phone);
        if (!$normalized) {
            return null;
        }

        return 'https://zalo.me/' . $normalized;
    }

    /**
     * Ghi nhận một tin nhắn tiếp cận đã gửi cho KOC
     * Tự động kiểm tra opt-out và tự động cập nhật Pipeline sang `contacted`
     */
    public function recordOutreachMessage(
        CampaignCreator $campaignCreator,
        string $channel,
        string $content,
        int $senderId,
        ?int $templateId = null,
        string $status = 'sent'
    ): OutreachMessage {
        $creator = $campaignCreator->creator;

        // 1. Kiểm tra an toàn: Tuyệt đối không gửi tin cho số đã opt-out
        if ($this->isOptedOut($creator->phone, $creator->email)) {
            throw new Exception("Không thể thực hiện gửi tin: Creator {$creator->name} ({$creator->phone}) đã nằm trong danh sách từ chối nhận tin (Opt-out).");
        }

        // 2. Tạo bản ghi nhật ký tin nhắn
        $message = OutreachMessage::create([
            'campaign_creator_id' => $campaignCreator->id,
            'channel' => $channel,
            'sender_id' => $senderId,
            'template_id' => $templateId,
            'sent_content' => $content,
            'status' => $status,
            'sent_at' => now(),
        ]);

        // 3. Tự động chuyển trạng thái Pipeline sang 'contacted' nếu đang là 'new'
        if ($campaignCreator->status === PipelineStatusEnum::NEW) {
            $campaignCreator->update([
                'status' => PipelineStatusEnum::CONTACTED,
                'contacted_at' => $campaignCreator->contacted_at ?? now(),
            ]);
        }

        return $message;
    }

    /**
     * Tạo hoặc cập nhật lời mời KOC vào nhóm Zalo chiến dịch
     */
    public function updateGroupInvite(
        CampaignCreator $campaignCreator,
        string $groupName,
        ?string $groupLink = null,
        string $status = 'invited',
        ?int $verifiedBy = null,
        ?string $notes = null
    ): GroupInvite {
        return GroupInvite::updateOrCreate(
            ['campaign_creator_id' => $campaignCreator->id],
            [
                'group_name' => $groupName,
                'group_link' => $groupLink,
                'status' => $status,
                'invited_at' => now(),
                'verified_at' => $status === 'joined' ? now() : null,
                'verified_by' => $verifiedBy,
                'notes' => $notes,
            ]
        );
    }
}

