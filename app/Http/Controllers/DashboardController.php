<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\PipelineService;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Models\Creator;

class DashboardController extends Controller
{
    public function __construct(
        protected PipelineService $pipelineService
    ) {}

    /**
     * Bảng điều khiển tổng quan với số liệu thực tế thời gian thực
     */
    public function index(Request $request): Response
    {
        $now = Carbon::now();
        $startOfWeek = $now->copy()->startOfWeek();
        $startOfMonth = $now->copy()->startOfMonth();

        // 1. Thống kê 4 khối Metric Cards
        // 1.1 Hồ sơ Creator
        $totalCreators = Creator::whereNull('merged_into_creator_id')->count();
        $newCreatorsThisWeek = Creator::whereNull('merged_into_creator_id')
            ->where('created_at', '>=', $startOfWeek)
            ->count();

        // 1.2 Chiến dịch
        $totalCampaigns = Campaign::count();
        $activeCampaigns = Campaign::where('status', CampaignStatusEnum::ACTIVE)->count();

        // 1.3 Video đã nghiệm thu
        $totalPosts = ContentPost::count();
        $approvedVideosCount = ContentPost::where('status', 'approved')->count();
        $approvedThisMonth = ContentPost::where('status', 'approved')
            ->where('posted_at', '>=', $startOfMonth)
            ->count();

        // Tỷ lệ video lên đúng hạn (dựa trên sample_received_at + deadline_days)
        $postedWithReceived = CampaignCreator::query()
            ->whereNotNull('sample_received_at')
            ->whereNotNull('posted_at')
            ->with(['campaign'])
            ->get();

        $onTimeCount = 0;
        foreach ($postedWithReceived as $item) {
            $days = (int) ($item->campaign?->video_deadline_days ?: 7);
            $deadline = $item->sample_received_at->copy()->addDays($days)->endOfDay();
            if ($item->posted_at->lte($deadline)) {
                $onTimeCount++;
            }
        }
        $onTimeRate = $postedWithReceived->count() > 0
            ? (int) round(($onTimeCount / $postedWithReceived->count()) * 100)
            : 100;

        // 1.4 Doanh thu GMV & Chi phí
        $totalViews = (int) ContentPost::sum('views_count');
        $totalGmv = (float) ContentPost::sum('gmv_amount');
        $totalCost = (float) CampaignCreator::sum('booking_fee');

        // Ước tính ROI: ((GMV * biên LN ước tính 20%) - tổng chi phí booking) / tổng chi phí booking
        $estimatedMarginGmv = $totalGmv * 0.20;
        $roiPercent = $totalCost > 0
            ? round((($estimatedMarginGmv - $totalCost) / $totalCost) * 100, 1)
            : ($totalGmv > 0 ? 100.0 : 0.0);

        // 2. Action Center - Việc cần xử lý ngay
        // 2.1 KOC quá hạn / sắp đến hạn nộp video
        $deadlineKocs = CampaignCreator::query()
            ->where('status', PipelineStatusEnum::SAMPLE_RECEIVED)
            ->with(['creator', 'campaign', 'assignee'])
            ->get()
            ->map(function ($item) {
                $item->deadline_info = $this->pipelineService->calculateDeadline($item);
                return $item;
            })
            ->filter(fn ($item) => $item->deadline_info !== null)
            ->sortBy(function ($item) {
                $order = ['overdue' => 1, 'warning' => 2, 'safe' => 3];
                return $order[$item->deadline_info['status']] ?? 4;
            })
            ->take(6)
            ->values()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'campaign_id' => $item->campaign_id,
                    'campaign_name' => $item->campaign?->name ?? 'Chiến dịch',
                    'creator_id' => $item->creator_id,
                    'creator_name' => $item->creator?->name ?? 'KOC',
                    'creator_phone' => $item->creator?->phone ?? '',
                    'assignee_name' => $item->assignee?->name ?? 'Chưa gán',
                    'sample_received_at' => $item->sample_received_at?->format('d/m/Y'),
                    'deadline_info' => $item->deadline_info,
                ];
            });

        // 2.2 Video mới nộp chờ nghiệm thu (pending_approval)
        $pendingApprovalPosts = ContentPost::query()
            ->where('status', 'pending_approval')
            ->with(['campaignCreator.creator', 'campaignCreator.campaign'])
            ->latest('id')
            ->take(5)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'platform' => $p->platform,
                    'video_title' => $p->video_title ?: 'Video chưa đặt tiêu đề',
                    'post_url' => $p->post_url,
                    'created_at' => $p->created_at?->format('d/m/Y H:i'),
                    'creator_name' => $p->campaignCreator?->creator?->name ?? 'KOC',
                    'campaign_name' => $p->campaignCreator?->campaign?->name ?? 'Chiến dịch',
                    'campaign_id' => $p->campaignCreator?->campaign_id,
                ];
            });

        // 2.3 Mẫu cần xuất kho (Đã chốt địa chỉ nhưng chưa gửi hàng)
        $readyToShipQuery = CampaignCreator::query()
            ->where('status', PipelineStatusEnum::ADDRESS_CONFIRMED)
            ->with(['creator', 'campaign', 'assignee']);

        $readyToShipCount = $readyToShipQuery->count();
        $readyToShipList = $readyToShipQuery->latest('address_confirmed_at')
            ->take(5)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'campaign_id' => $item->campaign_id,
                    'campaign_name' => $item->campaign?->name ?? 'Chiến dịch',
                    'creator_name' => $item->creator?->name ?? 'KOC',
                    'creator_phone' => $item->creator?->phone ?? '',
                    'shipping_address' => $item->creator?->shipping_address ?? 'Chưa có địa chỉ',
                    'address_confirmed_at' => $item->address_confirmed_at?->format('d/m/Y H:i'),
                ];
            });

        // 3. Tiến độ các chiến dịch đang hoạt động (Active Campaigns)
        $activeCampaignsList = Campaign::query()
            ->where('status', CampaignStatusEnum::ACTIVE)
            ->with(['campaignCreators.contentPosts'])
            ->latest('id')
            ->take(4)
            ->get()
            ->map(function ($camp) {
                $totalTarget = $camp->target_creators_count ?: 1;
                $completedVideos = (int) $camp->campaignCreators->sum(function ($cc) {
                    $postsCount = $cc->contentPosts ? $cc->contentPosts->count() : 0;
                    if ($postsCount > 0) {
                        return $postsCount;
                    }
                    return in_array($cc->status, [PipelineStatusEnum::POSTED, PipelineStatusEnum::COMPLETED]) ? 1 : 0;
                });
                $progressPercent = min(100, round(($completedVideos / $totalTarget) * 100));
                $committedBudget = (float) $camp->campaignCreators->sum('booking_fee');
                $budgetPercent = $camp->budget > 0
                    ? min(100, round(($committedBudget / (float) $camp->budget) * 100))
                    : 0;

                return [
                    'id' => $camp->id,
                    'name' => $camp->name,
                    'product_name' => $camp->product_name,
                    'start_date' => $camp->start_date?->format('d/m/Y'),
                    'end_date' => $camp->end_date?->format('d/m/Y'),
                    'total_assigned' => $camp->campaignCreators->count(),
                    'completed_videos' => $completedVideos,
                    'target_creators_count' => $totalTarget,
                    'progress_percent' => $progressPercent,
                    'committed_budget' => $committedBudget,
                    'budget' => (float) $camp->budget,
                    'budget_percent' => $budgetPercent,
                ];
            });

        return Inertia::render('Dashboard', [
            'stats' => [
                'total_creators' => $totalCreators,
                'new_creators_this_week' => $newCreatorsThisWeek,
                'active_campaigns' => $activeCampaigns,
                'total_campaigns' => $totalCampaigns,
                'approved_videos_count' => $approvedVideosCount,
                'approved_this_month' => $approvedThisMonth,
                'on_time_rate' => $onTimeRate,
                'total_views' => $totalViews,
                'total_gmv' => $totalGmv,
                'total_cost' => $totalCost,
                'roi_percent' => $roiPercent,
            ],
            'action_center' => [
                'deadline_kocs' => $deadlineKocs,
                'pending_approval_posts' => $pendingApprovalPosts,
                'pending_approval_count' => $pendingApprovalPosts->count(),
                'ready_to_ship_count' => $readyToShipCount,
                'ready_to_ship_list' => $readyToShipList,
            ],
            'active_campaigns' => $activeCampaignsList,
        ]);
    }
}

