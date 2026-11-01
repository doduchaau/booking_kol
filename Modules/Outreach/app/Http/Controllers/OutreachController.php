<?php

namespace Modules\Outreach\Http\Controllers;

use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Outreach\Models\GroupInvite;
use Modules\Outreach\Models\OptOut;
use Modules\Outreach\Models\OutreachMessage;
use Modules\Outreach\Models\OutreachTemplate;
use Modules\Outreach\Services\OutreachService;
use Modules\Outreach\Services\QuickFollowupService;

class OutreachController extends Controller
{
    public function __construct(
        protected OutreachService $outreachService,
        protected QuickFollowupService $quickFollowupService
    ) {}

    /**
     * Màn hình chính quản trị Outreach Zalo
     */
    public function index(Request $request): Response
    {
        // 1. Danh sách mẫu tin nhắn
        $templates = OutreachTemplate::query()
            ->latest('id')
            ->get();

        // 2. Lịch sử tin nhắn tiếp cận gần nhất
        $messages = OutreachMessage::query()
            ->with([
                'campaignCreator.creator',
                'campaignCreator.campaign',
                'sender:id,name,email',
                'template:id,name',
            ])
            ->latest('sent_at')
            ->paginate(15)
            ->withQueryString();

        // 3. Danh sách từ chối nhận tin (Opt-outs)
        $optOuts = OptOut::query()
            ->latest('requested_at')
            ->paginate(15, ['*'], 'opt_page')
            ->withQueryString();

        // 4. Danh sách nhóm trao đổi KOC
        $groupInvites = GroupInvite::query()
            ->with([
                'campaignCreator.creator',
                'campaignCreator.campaign',
                'verifier:id,name',
            ])
            ->latest('id')
            ->paginate(15, ['*'], 'group_page')
            ->withQueryString();

        // 5. Thống kê nhanh
        $stats = [
            'total_sent' => OutreachMessage::count(),
            'active_templates' => OutreachTemplate::where('is_active', true)->count(),
            'optout_count' => OptOut::count(),
            'groups_joined' => GroupInvite::where('status', 'joined')->count(),
        ];

        // 6. Danh sách chiến dịch active để chọn nhanh KOC tiếp cận
        $campaigns = Campaign::query()
            ->where('status', '!=', 'completed')
            ->select(['id', 'name', 'product_name'])
            ->with(['campaignCreators' => function ($q) {
                $q->with([
                    'creator' => function ($cq) {
                        $cq->select(['id', 'name', 'phone', 'niche', 'tier'])
                            ->with('accounts:id,creator_id,platform,handle,followers_count,url');
                    },
                ]);
            }])
            ->get();

        $templateTypes = [
            ['key' => 'custom', 'label' => 'Mẫu tin nhắn tùy biến chung'],
            ['key' => 'remind_deadline', 'label' => 'Nhắc Zalo 1-Chạm: Đôn đốc Hạn nộp Video'],
            ['key' => 'remind_receipt', 'label' => 'Nhắc Zalo 1-Chạm: Nhắc Xác Nhận Đã Nhận Mẫu'],
            ['key' => 'brief_outreach', 'label' => 'Nhắc Zalo 1-Chạm: Gửi Brief & Chào Mời'],
            ['key' => 'shipping_notice', 'label' => 'Nhắc Zalo 1-Chạm: Báo Đã Chuyển Đơn Cho Kho'],
        ];

        return Inertia::render('Outreach/Index', [
            'templates' => $templates,
            'templateTypes' => $templateTypes,
            'messages' => $messages,
            'optOuts' => $optOuts,
            'groupInvites' => $groupInvites,
            'stats' => $stats,
            'campaigns' => $campaigns,
        ]);
    }

    /**
     * Tạo mẫu tin nhắn mới
     */
    public function storeTemplate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'type' => ['nullable', 'string', 'max:50'],
            'channel' => ['required', 'in:zalo_personal,zalo_oa,email,direct_message'],
            'subject' => ['nullable', 'string', 'max:200'],
            'content_template' => ['required', 'string'],
            'is_active' => ['boolean'],
        ], [
            'name.required' => 'Vui lòng nhập tên mẫu tin nhắn.',
            'content_template.required' => 'Nội dung mẫu tin nhắn không được để trống.',
        ]);

        OutreachTemplate::create([
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'custom',
            'channel' => $validated['channel'],
            'subject' => $validated['subject'] ?? null,
            'content_template' => $validated['content_template'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Đã lưu mẫu tin nhắn mới thành công.');
    }

    /**
     * Cập nhật mẫu tin nhắn
     */
    public function updateTemplate(Request $request, int $id): RedirectResponse
    {
        $template = OutreachTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'type' => ['nullable', 'string', 'max:50'],
            'channel' => ['required', 'in:zalo_personal,zalo_oa,email,direct_message'],
            'subject' => ['nullable', 'string', 'max:200'],
            'content_template' => ['required', 'string'],
            'is_active' => ['boolean'],
        ]);

        $template->update($validated);

        return back()->with('success', 'Đã cập nhật mẫu tin nhắn thành công.');
    }

    /**
     * Xóa mẫu tin nhắn
     */
    public function destroyTemplate(int $id): RedirectResponse
    {
        $template = OutreachTemplate::findOrFail($id);
        $template->delete();

        return back()->with('success', 'Đã xóa mẫu tin nhắn.');
    }

    /**
     * API chuẩn bị nội dung tin nhắn và sinh deep link Zalo
     */
    public function prepareMessage(Request $request): JsonResponse
    {
        $request->validate([
            'campaign_creator_id' => ['required', 'integer', 'exists:campaign_creators,id'],
            'template_id' => ['nullable', 'integer', 'exists:outreach_templates,id'],
            'custom_template' => ['nullable', 'string'],
        ]);

        $cc = CampaignCreator::with(['creator.accounts', 'campaign'])->findOrFail($request->integer('campaign_creator_id'));

        $isOptedOut = $this->outreachService->isOptedOut($cc->creator->phone, $cc->creator->email);

        $templateContent = '';
        if ($request->filled('template_id')) {
            $template = OutreachTemplate::find($request->integer('template_id'));
            $templateContent = $template?->content_template ?? '';
        } elseif ($request->filled('custom_template')) {
            $templateContent = (string) $request->input('custom_template');
        }

        $renderedText = $templateContent ? $this->outreachService->renderTemplate($templateContent, $cc) : '';
        $zaloDeepLink = $this->outreachService->generateZaloDeepLink($cc->creator->phone);

        $primaryAccount = $cc->creator?->accounts?->first();
        $primaryHandle = $primaryAccount?->handle ? ('@' . ltrim($primaryAccount->handle, '@')) : null;

        return response()->json([
            'success' => true,
            'is_opted_out' => $isOptedOut,
            'rendered_text' => $renderedText,
            'zalo_deep_link' => $zaloDeepLink,
            'creator_id' => $cc->creator->id,
            'creator_name' => $cc->creator->name,
            'creator_handle' => $primaryHandle,
            'creator_accounts' => $cc->creator->accounts,
            'creator_phone' => $cc->creator->phone,
            'portal_link' => $cc->portal_token ? url('/portal/' . $cc->portal_token) : null,
        ]);
    }

    /**
     * Gửi tin nhắn / Ghi nhận nhật ký đã gửi và chuyển pipeline sang 'contacted'
     */
    public function sendMessage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'campaign_creator_id' => ['required', 'integer', 'exists:campaign_creators,id'],
            'channel' => ['required', 'in:zalo_personal,zalo_oa,email,direct_message'],
            'content' => ['required', 'string'],
            'template_id' => ['nullable', 'integer', 'exists:outreach_templates,id'],
        ], [
            'content.required' => 'Nội dung tin nhắn không được để trống.',
        ]);

        $cc = CampaignCreator::with(['creator', 'campaign'])->findOrFail($validated['campaign_creator_id']);

        try {
            $this->outreachService->recordOutreachMessage(
                campaignCreator: $cc,
                channel: $validated['channel'],
                content: $validated['content'],
                senderId: (int) auth()->id(),
                templateId: !empty($validated['template_id']) ? (int) $validated['template_id'] : null,
            );

            return back()->with('success', "Đã ghi nhận tiếp cận KOC {$cc->creator->name} thành công qua {$validated['channel']}.");
        } catch (Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Thêm số điện thoại vào danh sách từ chối (Opt-out)
     */
    public function storeOptOut(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'reason' => ['nullable', 'string', 'max:255'],
        ], [
            'phone.required' => 'Vui lòng nhập số điện thoại cần chặn.',
        ]);

        $this->outreachService->addOptOut(
            phone: $validated['phone'],
            email: $validated['email'] ?? null,
            reason: $validated['reason'] ?? 'Yêu cầu từ nhân viên booking',
        );

        return back()->with('success', "Đã thêm số {$validated['phone']} vào danh sách từ chối nhận tin.");
    }

    /**
     * Xóa số điện thoại khỏi danh sách từ chối
     */
    public function destroyOptOut(int $id): RedirectResponse
    {
        $this->outreachService->removeOptOut($id);

        return back()->with('success', 'Đã gỡ số điện thoại khỏi danh sách từ chối.');
    }

    /**
     * Cập nhật trạng thái mời KOC vào nhóm Zalo
     */
    public function updateGroupInvite(Request $request, int $id): RedirectResponse
    {
        $invite = GroupInvite::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,invited,joined,failed'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $invite->update([
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? $invite->notes,
            'verified_at' => $validated['status'] === 'joined' ? now() : $invite->verified_at,
            'verified_by' => $validated['status'] === 'joined' ? auth()->id() : $invite->verified_by,
        ]);

        return back()->with('success', 'Đã cập nhật trạng thái nhóm Zalo.');
    }

    /**
     * Lấy các mẫu tin nhắn nhắc nhở Zalo thông minh theo ngữ cảnh KOC
     */
    public function quickFollowupPreview(int $id): JsonResponse
    {
        $campaignCreator = CampaignCreator::with(['creator', 'campaign', 'assignee'])->findOrFail($id);

        $data = $this->quickFollowupService->generateTemplates($campaignCreator, auth()->user());

        return response()->json($data);
    }

    /**
     * Ghi nhận việc gửi tin nhắn nhắc nhở Zalo vào lịch sử tương tác
     */
    public function quickFollowupLog(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'content' => ['required', 'string'],
        ]);

        $campaignCreator = CampaignCreator::findOrFail($id);

        $message = $this->quickFollowupService->logFollowupMessage(
            $campaignCreator,
            $request->input('content'),
            auth()->id()
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã lưu lịch sử tương tác Zalo thành công.',
            'data' => [
                'id' => $message->id,
                'sent_at' => $message->sent_at?->format('d/m/Y H:i'),
                'pipeline_status' => $campaignCreator->status?->value ?? $campaignCreator->status,
            ],
        ]);
    }
}
