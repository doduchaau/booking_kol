<?php

namespace Modules\Campaign\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Http\Requests\AddCreatorsToCampaignRequest;
use Modules\Campaign\Http\Requests\StoreCampaignRequest;
use Modules\Campaign\Http\Requests\UpdateCampaignRequest;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\CampaignService;
use Modules\Campaign\Services\PipelineService;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Models\Creator;

class CampaignController extends Controller
{
    public function __construct(
        protected CampaignService $campaignService,
        protected PipelineService $pipelineService
    ) {}

    /**
     * Danh sách chiến dịch
     */
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'status']);

        $campaigns = Campaign::query()
            ->filter($filters)
            ->with(['creatorUser'])
            ->withCount('campaignCreators')
            ->latest('id')
            ->paginate(12)
            ->withQueryString();

        // Tính toán các chỉ số bổ sung cho từng campaign
        $campaigns->getCollection()->transform(function ($c) {
            $stats = $this->campaignService->calculateCampaignStats($c);
            $c->stats = $stats;
            return $c;
        });

        return Inertia::render('Campaign/Index', [
            'campaigns' => $campaigns,
            'filters' => $filters,
            'statuses' => array_map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatusEnum::cases()),
        ]);
    }

    /**
     * Form tạo mới chiến dịch
     */
    public function create(): Response
    {
        return Inertia::render('Campaign/Create', [
            'statuses' => array_map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatusEnum::cases()),
        ]);
    }

    /**
     * Lưu chiến dịch mới
     */
    public function store(StoreCampaignRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['created_by'] = $request->user()?->id;

        if ($request->hasFile('content_guidelines_file')) {
            $validated['content_guidelines_file'] = $request->file('content_guidelines_file')->store('campaigns/guidelines', 'public');
        }

        if ($request->hasFile('sample_requirement_file')) {
            $validated['sample_requirement_file'] = $request->file('sample_requirement_file')->store('campaigns/sample_requirements', 'public');
        }

        $campaign = Campaign::create($validated);

        return redirect()->route('campaigns.show', $campaign->id)
            ->with('success', "Đã tạo chiến dịch [{$campaign->name}] thành công.");
    }

    /**
     * Chi tiết chiến dịch & quản lý Creator gán vào
     */
    public function show(int $id): Response
    {
        $campaign = Campaign::with([
            'creatorUser',
            'campaignCreators.creator.accounts',
            'campaignCreators.assignee',
            'campaignCreators.contentPosts',
        ])->findOrFail($id);

        // Phân quyền: Staff chỉ được xem các KOC mà mình được phân công
        $currentUser = auth()->user();
        if ($currentUser && $currentUser->hasRole('Staff') && !$currentUser->hasAnyRole(['Admin', 'Leader'])) {
            $campaign->setRelation(
                'campaignCreators',
                $campaign->campaignCreators->filter(fn ($cc) => $cc->assigned_to === $currentUser->id)->values()
            );
        }

        $stats = $this->campaignService->calculateCampaignStats($campaign);

        // Đính kèm deadline_info cho từng KOC
        $campaign->campaignCreators->transform(function ($cc) {
            $cc->deadline_info = $this->pipelineService->calculateDeadline($cc);
            return $cc;
        });

        // Thống kê nhanh số lượng KOC theo 4 chặng tiến độ
        $allCc = $campaign->campaignCreators;
        $stageCounts = [
            'all' => $allCc->count(),
            'outreach' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::NEW,
                PipelineStatusEnum::CONTACTED,
                PipelineStatusEnum::AGREED,
            ]))->count(),
            'shipping' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::ADDRESS_CONFIRMED,
                PipelineStatusEnum::SAMPLE_SENT,
                PipelineStatusEnum::SAMPLE_RECEIVED,
            ]))->count(),
            'production' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::SAMPLE_RECEIVED,
                PipelineStatusEnum::POSTED,
            ]))->count(),
            'completion' => $allCc->filter(fn ($cc) => in_array($cc->status, [
                PipelineStatusEnum::COMPLETED,
                PipelineStatusEnum::DECLINED,
                PipelineStatusEnum::NO_SHOW,
            ]))->count(),
        ];

        // Lấy danh sách ID các creator đã có trong campaign
        $existingCreatorIds = $campaign->campaignCreators->pluck('creator_id')->toArray();

        // Lấy danh sách Creator khả dụng trong hệ thống để gán vào chiến dịch
        $availableCreators = Creator::query()
            ->whereNull('merged_into_creator_id')
            ->whereNotIn('id', $existingCreatorIds)
            ->with(['accounts'])
            ->latest('id')
            ->limit(100)
            ->get();

        // Lấy danh sách nhân viên nội bộ
        $staffUsers = User::query()->select(['id', 'name', 'email'])->get();

        return Inertia::render('Campaign/Show', [
            'campaign' => $campaign,
            'stats' => $stats,
            'stageCounts' => $stageCounts,
            'availableCreators' => $availableCreators,
            'staffUsers' => $staffUsers,
        ]);
    }

    /**
     * Form chỉnh sửa chiến dịch
     */
    public function edit(int $id): Response
    {
        $campaign = Campaign::findOrFail($id);

        return Inertia::render('Campaign/Edit', [
            'campaign' => $campaign,
            'statuses' => array_map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatusEnum::cases()),
        ]);
    }

    /**
     * Cập nhật thông tin chiến dịch
     */
    public function update(UpdateCampaignRequest $request, int $id): RedirectResponse
    {
        $campaign = Campaign::findOrFail($id);
        $data = $request->validated();

        // Phân quyền: Chỉ Admin/Leader mới được duyệt thay đổi ngân sách
        if (isset($data['budget']) && (float)$data['budget'] !== (float)$campaign->budget) {
            $currentUser = auth()->user();
            if ($currentUser && $currentUser->hasRole('Staff') && !$currentUser->hasAnyRole(['Admin', 'Leader'])) {
                return back()->withErrors(['budget' => 'Chỉ Admin hoặc Leader mới có quyền duyệt thay đổi ngân sách chiến dịch.']);
            }
        }

        // Xử lý file kịch bản
        if ($request->boolean('remove_content_guidelines_file')) {
            if ($campaign->content_guidelines_file && Storage::disk('public')->exists($campaign->content_guidelines_file)) {
                Storage::disk('public')->delete($campaign->content_guidelines_file);
            }
            $data['content_guidelines_file'] = null;
        } elseif ($request->hasFile('content_guidelines_file')) {
            if ($campaign->content_guidelines_file && Storage::disk('public')->exists($campaign->content_guidelines_file)) {
                Storage::disk('public')->delete($campaign->content_guidelines_file);
            }
            $data['content_guidelines_file'] = $request->file('content_guidelines_file')->store('campaigns/guidelines', 'public');
        }

        // Xử lý file quy định gửi mẫu
        if ($request->boolean('remove_sample_requirement_file')) {
            if ($campaign->sample_requirement_file && Storage::disk('public')->exists($campaign->sample_requirement_file)) {
                Storage::disk('public')->delete($campaign->sample_requirement_file);
            }
            $data['sample_requirement_file'] = null;
        } elseif ($request->hasFile('sample_requirement_file')) {
            if ($campaign->sample_requirement_file && Storage::disk('public')->exists($campaign->sample_requirement_file)) {
                Storage::disk('public')->delete($campaign->sample_requirement_file);
            }
            $data['sample_requirement_file'] = $request->file('sample_requirement_file')->store('campaigns/sample_requirements', 'public');
        }

        $campaign->update($data);

        return redirect()->route('campaigns.show', $campaign->id)
            ->with('success', "Đã cập nhật chiến dịch [{$campaign->name}] thành công.");
    }

    /**
     * Gán Creator vào chiến dịch
     */
    public function addCreators(
        AddCreatorsToCampaignRequest $request,
        int $id
    ): RedirectResponse {
        $campaign = Campaign::findOrFail($id);

        if ($campaign->status === CampaignStatusEnum::COMPLETED) {
            return back()->withErrors([
                'error' => 'Chiến dịch đã kết thúc, không thể gán thêm Creator mới.',
            ]);
        }

        $validated = $request->validated();
        $result = $this->campaignService->addCreatorsToCampaign(
            campaign: $campaign,
            creatorIds: $validated['creator_ids'],
            assignedTo: $validated['assigned_to'] ?? null,
            bookingFee: (float) ($validated['booking_fee'] ?? 0)
        );

        return back()->with('success', "Đã gán {$result['added']} Creator vào chiến dịch thành công.");
    }

    /**
     * Xóa chiến dịch (Soft delete)
     */
    public function destroy(int $id): RedirectResponse
    {
        // Phân quyền: Chỉ Admin/Leader mới được xóa chiến dịch
        $currentUser = auth()->user();
        if ($currentUser && $currentUser->hasRole('Staff') && !$currentUser->hasAnyRole(['Admin', 'Leader'])) {
            return back()->withErrors(['error' => 'Chỉ Admin hoặc Leader mới có quyền xóa chiến dịch.']);
        }

        $campaign = Campaign::withCount('campaignCreators')->findOrFail($id);

        // Kiểm tra ràng buộc an toàn
        if ($campaign->campaign_creators_count > 0) {
            // Kiểm tra có Creator nào đã gửi mẫu hoặc lên video chưa
            $hasSentSample = $campaign->campaignCreators()
                ->whereNotNull('sample_sent_at')
                ->exists();

            if ($hasSentSample) {
                return back()->withErrors([
                    'error' => 'Không thể xóa chiến dịch đã phát sinh việc gửi mẫu hoặc duyệt bài.',
                ]);
            }
        }

        $name = $campaign->name;
        $campaign->delete();

        return redirect()->route('campaigns.index')
            ->with('success', "Đã xóa chiến dịch [{$name}].");
    }

    /**
     * Xóa KOC khỏi chiến dịch (chỉ cho phép khi chưa gửi mẫu)
     */
    public function removeCreator(int $id, int $pivotId): RedirectResponse
    {
        $campaignCreator = CampaignCreator::where('campaign_id', $id)->findOrFail($pivotId);

        if (!in_array($campaignCreator->status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED, PipelineStatusEnum::DECLINED])) {
            return back()->withErrors([
                'error' => 'Chỉ có thể xóa KOC đang ở trạng thái Mới thêm, Đã liên hệ hoặc Từ chối khỏi chiến dịch.',
            ]);
        }

        $campaignCreator->delete();

        return back()->with('success', 'Đã xóa KOC khỏi chiến dịch thành công.');
    }

    /**
     * Xác nhận gửi mẫu cho KOC trong chiến dịch (tinh giản - không quản lý vận đơn)
     */
    public function addShipment(Request $request, int $id, int $pivotId): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
            'shipped_at' => ['nullable', 'date'],
        ]);

        $campaignCreator = CampaignCreator::where('campaign_id', $id)->with('creator')->findOrFail($pivotId);

        $shippedAt = !empty($validated['shipped_at']) ? Carbon::parse($validated['shipped_at']) : now();

        $campaignCreator->update([
            'status' => PipelineStatusEnum::SAMPLE_SENT,
            'sample_sent_at' => $campaignCreator->sample_sent_at ?? $shippedAt,
            'notes' => $validated['notes'] ?? $campaignCreator->notes,
        ]);

        return back()->with('success', "Đã xác nhận gửi mẫu thành công cho KOC {$campaignCreator->creator->name}.");
    }

    /**
     * Thêm video nghiệm thu mới cho KOC trong chiến dịch (hỗ trợ 1 KOC lên nhiều video)
     */
    public function addVideo(Request $request, int $id, int $pivotId): RedirectResponse
    {
        $validated = $request->validate([
            'platform' => ['required', 'in:tiktok,facebook,youtube,shopee,instagram'],
            'post_url' => ['required', 'url', 'max:500'],
            'video_title' => ['nullable', 'string', 'max:255'],
            'posted_at' => ['nullable', 'date'],
        ]);

        $campaignCreator = CampaignCreator::where('campaign_id', $id)->with('creator')->findOrFail($pivotId);

        $postedAt = !empty($validated['posted_at'])
            ? Carbon::parse($validated['posted_at'])
            : now();

        ContentPost::create([
            'campaign_creator_id' => $campaignCreator->id,
            'platform' => $validated['platform'],
            'post_url' => $validated['post_url'],
            'video_title' => $validated['video_title'] ?? null,
            'posted_at' => $postedAt,
            'status' => 'approved',
        ]);

        // Tự động chuyển pipeline sang "posted" nếu chưa lên video
        if (in_array($campaignCreator->status, [
            PipelineStatusEnum::NEW,
            PipelineStatusEnum::CONTACTED,
            PipelineStatusEnum::AGREED,
            PipelineStatusEnum::ADDRESS_CONFIRMED,
            PipelineStatusEnum::SAMPLE_SENT,
            PipelineStatusEnum::SAMPLE_RECEIVED,
        ])) {
            $campaignCreator->update([
                'status' => PipelineStatusEnum::POSTED,
                'posted_at' => $campaignCreator->posted_at ?? $postedAt,
            ]);
        }

        return back()->with('success', "Đã ghi nhận thêm video mới cho KOC {$campaignCreator->creator->name}.");
    }
}
