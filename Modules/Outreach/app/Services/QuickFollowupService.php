<?php

namespace Modules\Outreach\Services;

use App\Models\User;
use Carbon\Carbon;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\PipelineService;
use Modules\Outreach\Models\OutreachMessage;
use Modules\Outreach\Models\OutreachTemplate;

class QuickFollowupService
{
    public function __construct(
        protected PipelineService $pipelineService
    ) {}

    /**
     * Sinh danh sách mẫu tin nhắn thông minh theo ngữ cảnh KOC
     * Ưu tiên đọc nội dung cấu hình tập trung từ bảng outreach_templates trong Database
     */
    public function generateTemplates(CampaignCreator $item, ?User $currentUser = null): array
    {
        $item->loadMissing(['creator.accounts', 'campaign', 'assignee']);

        $creatorName = $item->creator?->name ?? 'KOC';
        $creatorPhone = $item->creator?->phone ?? '';
        $primaryAccount = $item->creator?->accounts?->first();
        $creatorHandle = $primaryAccount?->handle ? ('@' . ltrim($primaryAccount->handle, '@')) : $creatorName;

        $campaignName = $item->campaign?->name ?? 'Chiến dịch';
        $productName = $item->campaign?->product_name ?? 'Sản phẩm';
        $staffName = $currentUser?->name ?? $item->assignee?->name ?? 'Team Booking';
        $hashtags = $item->campaign?->hashtags ?: '#bookingkol';
        $discountCode = $item->campaign?->discount_code ? "Mã giảm giá: {$item->campaign->discount_code}" : '';
        $rateFormatted = number_format((float) ($item->booking_fee ?: 0), 0, ',', '.') . ' đ';

        // Đảm bảo có portal link
        if (!$item->portal_token) {
            $item->generatePortalToken();
        }
        $portalLink = route('portal.show', $item->portal_token);

        // Tính toán deadline
        $deadlineInfo = $this->pipelineService->calculateDeadline($item);
        $status = $item->status instanceof PipelineStatusEnum ? $item->status : PipelineStatusEnum::tryFrom($item->status);

        // Chuẩn bị các biến ngữ cảnh
        $deadlineText = 'đang đến hạn hoàn thành';
        if ($deadlineInfo) {
            if ($deadlineInfo['status'] === 'overdue') {
                $deadlineText = "đã quá hạn {$deadlineInfo['days']} ngày (hạn chót: {$deadlineInfo['date']})";
            } elseif ($deadlineInfo['status'] === 'warning') {
                $deadlineText = "chỉ còn {$deadlineInfo['days']} ngày nữa là đến hạn (ngày {$deadlineInfo['date']})";
            } else {
                $deadlineText = "hạn chót là ngày {$deadlineInfo['date']} (còn {$deadlineInfo['days']} ngày)";
            }
        }

        $sentDateText = $item->sample_sent_at ? "từ ngày {$item->sample_sent_at->format('d/m/Y')}" : 'cách đây vài hôm';

        $variables = [
            '{creator_name}' => $creatorName,
            '{handle}' => $creatorHandle,
            '{creator_handle}' => $creatorHandle,
            '{staff_name}' => $staffName,
            '{campaign_name}' => $campaignName,
            '{product_name}' => $productName,
            '{deadline_text}' => $deadlineText,
            '{sent_date_text}' => $sentDateText,
            '{portal_link}' => $portalLink,
            '{hashtags}' => $hashtags,
            '{discount_code}' => $discountCode,
            '{rate}' => $rateFormatted,
            '{budget}' => $rateFormatted,
        ];

        // Đọc các mẫu tin nhắn được cài đặt tập trung trong database
        $dbTemplates = OutreachTemplate::query()
            ->where('is_active', true)
            ->whereIn('type', [
                OutreachTemplate::TYPE_REMIND_DEADLINE,
                OutreachTemplate::TYPE_REMIND_RECEIPT,
                OutreachTemplate::TYPE_BRIEF_OUTREACH,
                OutreachTemplate::TYPE_SHIPPING_NOTICE,
            ])
            ->get()
            ->keyBy('type');

        $templates = [];

        // 1. Mẫu Đôn Đốc Deadline Video
        $defaultDeadline = "Em chào chị {creator_name}, em là {staff_name} bên nhãn hàng {campaign_name} ạ.\n\nVideo trải nghiệm sản phẩm [{product_name}] của chị hiện {deadline_text}. Không biết kịch bản hoặc quá trình trải nghiệm sản phẩm có cần bên em hỗ trợ gì thêm không ạ?\n\nChị tranh thủ lên video sớm giúp nhãn hàng nhé ạ. Sau khi đăng, chị dán link video vào cổng này để bên em đối soát và nghiệm thu nha:\n{portal_link}\n\nCảm ơn chị nhiều ạ!";
        $rawDeadline = $dbTemplates->get(OutreachTemplate::TYPE_REMIND_DEADLINE)?->content_template ?: $defaultDeadline;
        $titleDeadline = $this->cleanTitle($dbTemplates->get(OutreachTemplate::TYPE_REMIND_DEADLINE)?->name, 'Đôn đốc Hạn nộp Video');

        $templates['remind_deadline'] = [
            'type' => 'remind_deadline',
            'title' => $titleDeadline,
            'badge' => $deadlineInfo && in_array($deadlineInfo['status'], ['overdue', 'warning']) ? 'Ưu tiên cao' : 'Tiêu chuẩn',
            'is_recommended' => $status === PipelineStatusEnum::SAMPLE_RECEIVED,
            'content' => $this->renderVariables($rawDeadline, $variables),
        ];

        // 2. Mẫu Nhắc Xác Nhận Nhận Hàng (Khi đã gửi mẫu)
        $defaultReceipt = "Em chào chị {creator_name}, gói hàng trải nghiệm [{product_name}] bên em gửi cho chị {sent_date_text} chắc đã đến nơi rồi ạ.\n\nChị kiểm tra xem đã nhận được kiện hàng chưa nhé. Nếu nhận được rồi, chị mở đường link bên dưới bấm 1 chạm 'Đã nhận được hàng' giúp em để hệ thống ghi nhận và đếm ngược ngày lên video nha:\n{portal_link}\n\nChúc chị một ngày làm việc tràn đầy năng lượng ạ!";
        $rawReceipt = $dbTemplates->get(OutreachTemplate::TYPE_REMIND_RECEIPT)?->content_template ?: $defaultReceipt;
        $titleReceipt = $this->cleanTitle($dbTemplates->get(OutreachTemplate::TYPE_REMIND_RECEIPT)?->name, 'Nhắc Xác Nhận Đã Nhận Mẫu');

        $templates['remind_receipt'] = [
            'type' => 'remind_receipt',
            'title' => $titleReceipt,
            'badge' => $status === PipelineStatusEnum::SAMPLE_SENT ? 'Khuyên dùng' : 'Tiêu chuẩn',
            'is_recommended' => $status === PipelineStatusEnum::SAMPLE_SENT,
            'content' => $this->renderVariables($rawReceipt, $variables),
        ];

        // 3. Mẫu Gửi Brief Kịch Bản & Tiếp Cận Chào Mời
        $defaultBrief = "Em chào chị {creator_name}, em là {staff_name} từ nhãn hàng {campaign_name} ạ.\n\nBên em đang có chiến dịch trải nghiệm sản phẩm [{product_name}] rất hợp với phong cách kênh của chị. Nhãn hàng xin gửi tặng chị 01 phần quà mẫu trải nghiệm kèm hoa hồng hấp dẫn.\n\nChị xem qua kịch bản & xác nhận địa chỉ nhận hàng tại đường link riêng này nhé:\n{portal_link}\n\nHashtag chiến dịch: {hashtags}" . ($discountCode ? "\n{discount_code}" : "") . "\n\nRất hy vọng có cơ hội hợp tác cùng chị!";
        $rawBrief = $dbTemplates->get(OutreachTemplate::TYPE_BRIEF_OUTREACH)?->content_template ?: $defaultBrief;
        $titleBrief = $this->cleanTitle($dbTemplates->get(OutreachTemplate::TYPE_BRIEF_OUTREACH)?->name, 'Gửi Brief Kịch Bản & Chào Mời');

        $templates['brief_outreach'] = [
            'type' => 'brief_outreach',
            'title' => $titleBrief,
            'badge' => in_array($status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED]) ? 'Khuyên dùng' : 'Tiêu chuẩn',
            'is_recommended' => in_array($status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED]),
            'content' => $this->renderVariables($rawBrief, $variables),
        ];

        // 4. Mẫu Báo Đã Chuyển Kho Gửi Mẫu
        $defaultShipping = "Em chào chị {creator_name}, bên em đã nhận được địa chỉ nhận hàng của chị rồi ạ. Bộ phận kho đang chuẩn bị gói hàng trải nghiệm [{product_name}] và chuyển đi cho chị sớm nhất.\n\nKhi nào nhận được kiện hàng, chị mở lại link này bấm xác nhận giúp em nhé:\n{portal_link}\n\nEm cảm ơn chị nhiều ạ!";
        $rawShipping = $dbTemplates->get(OutreachTemplate::TYPE_SHIPPING_NOTICE)?->content_template ?: $defaultShipping;
        $titleShipping = $this->cleanTitle($dbTemplates->get(OutreachTemplate::TYPE_SHIPPING_NOTICE)?->name, 'Thông Báo Đã Chuyển Đơn Gửi Mẫu');

        $templates['shipping_notice'] = [
            'type' => 'shipping_notice',
            'title' => $titleShipping,
            'badge' => $status === PipelineStatusEnum::ADDRESS_CONFIRMED ? 'Khuyên dùng' : 'Tiêu chuẩn',
            'is_recommended' => $status === PipelineStatusEnum::ADDRESS_CONFIRMED,
            'content' => $this->renderVariables($rawShipping, $variables),
        ];

        // Thêm các mẫu tùy biến chung nếu có (tối đa 3 mẫu active khác)
        $customTemplates = OutreachTemplate::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('type')
                  ->orWhere('type', OutreachTemplate::TYPE_CUSTOM)
                  ->orWhereNotIn('type', [
                      OutreachTemplate::TYPE_REMIND_DEADLINE,
                      OutreachTemplate::TYPE_REMIND_RECEIPT,
                      OutreachTemplate::TYPE_BRIEF_OUTREACH,
                      OutreachTemplate::TYPE_SHIPPING_NOTICE,
                  ]);
            })
            ->where('channel', 'zalo_personal')
            ->limit(3)
            ->get();

        foreach ($customTemplates as $customTpl) {
            $templates['custom_' . $customTpl->id] = [
                'type' => 'custom_' . $customTpl->id,
                'title' => $customTpl->name,
                'badge' => 'Mẫu tùy chỉnh',
                'is_recommended' => false,
                'content' => $this->renderVariables($customTpl->content_template, $variables),
            ];
        }

        return [
            'creator' => [
                'id' => $item->creator_id,
                'name' => $creatorName,
                'phone' => $creatorPhone,
                'zalo_link' => $this->buildZaloDeepLink($creatorPhone),
            ],
            'campaign' => [
                'id' => $item->campaign_id,
                'name' => $campaignName,
                'product_name' => $productName,
            ],
            'pipeline' => [
                'id' => $item->id,
                'status' => $status?->value ?? 'new',
                'status_label' => $status?->label() ?? 'Mới',
                'deadline_info' => $deadlineInfo,
                'portal_link' => $portalLink,
            ],
            'templates' => array_values($templates),
        ];
    }

    /**
     * Thay thế các biến ngữ cảnh trong nội dung mẫu
     */
    protected function renderVariables(string $content, array $variables): string
    {
        return str_replace(array_keys($variables), array_values($variables), $content);
    }

    /**
     * Làm sạch tiêu đề hiển thị trên nút chọn mẫu
     */
    protected function cleanTitle(?string $name, string $fallback): string
    {
        if (empty($name)) {
            return $fallback;
        }

        // Bỏ tiền tố kiểu "[Nhắc việc Zalo] " nếu có để nút gọn gàng
        return preg_replace('/^(\[.*?\]|Nhắc Zalo 1-Chạm:\s*)/u', '', trim($name)) ?: $fallback;
    }

    /**
     * Ghi nhận tin nhắn follow-up vào lịch sử outreach và cập nhật trạng thái nếu cần
     */
    public function logFollowupMessage(CampaignCreator $item, string $content, ?int $senderId = null): OutreachMessage
    {
        $message = OutreachMessage::create([
            'campaign_creator_id' => $item->id,
            'channel' => 'zalo_personal',
            'sender_id' => $senderId ?: (auth()->id() ?: 1),
            'sent_content' => $content,
            'status' => 'sent',
            'sent_at' => Carbon::now(),
        ]);

        // Nếu Creator đang ở trạng thái 'new', tự động nhảy sang 'contacted'
        if ($item->status === PipelineStatusEnum::NEW) {
            $item->update([
                'status' => PipelineStatusEnum::CONTACTED,
                'contacted_at' => Carbon::now(),
            ]);
        }

        return $message;
    }

    /**
     * Tạo đường link Zalo mở khung chat
     */
    public function buildZaloDeepLink(?string $phone): string
    {
        if (!$phone) {
            return 'https://zalo.me';
        }
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        return "https://zalo.me/{$cleanPhone}";
    }
}

