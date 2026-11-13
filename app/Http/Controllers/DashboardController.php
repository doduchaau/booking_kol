<?php

namespace App\Http\Controllers;

use App\Services\SystemCacheService;
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
     * Bảng điều khiển tổng quan với số liệu thực tế thời gian thực (Tối ưu hóa bằng Cache Versioning)
     */
    public function index(Request $request): Response
    {
        $now = Carbon::now();
        $startOfWeek = $now->copy()->startOfWeek();
        $startOfMonth = $now->copy()->startOfMonth();

        // 1. Thống kê 4 khối Metric Cards (Ghi nhớ Cache Versioning 10 phút)
        $stats = SystemCacheService::rememberDashboard('metric_cards', 600, function () use ($startOfWeek, $startOfMonth) {
            $totalCreators = Creator::whereNull('merged_into_creator_id')->count();
            $newCreatorsThisWeek = Creator::whereNull('merged_into_creator_id')
                ->where('created_at', '>=', $startOfWeek)
                ->count();

            $totalCampaigns = Campaign::count();
            $activeCampaigns = Campaign::where('status', CampaignStatusEnum::ACTIVE)->count();

            $contentStats = ContentPost::query()
                ->whereNull('deleted_at')
                ->selectRaw("
                    COUNT(*) as total_posts,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_videos_count,
                    COUNT(CASE WHEN status = 'approved' AND posted_at >= ? THEN 1 END) as approved_this_month,
                    COALESCE(SUM(views_count), 0) as total_views,
                    COALESCE(SUM(gmv_amount), 0) as total_gmv
                ", [$startOfMonth])->first();

            $totalPosts = (int) ($contentStats->total_posts ?? 0);
            $approvedVideosCount = (int) ($contentStats->approved_videos_count ?? 0);
            $approvedThisMonth = (int) ($contentStats->approved_this_month ?? 0);
            $totalViews = (int) ($contentStats->total_views ?? 0);
            $totalGmv = (float) ($contentStats->total_gmv ?? 0);

            $isSqlite = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'sqlite';
            $dateAddSql = $isSqlite
                ? "campaign_creators.posted_at <= datetime(campaign_creators.sample_received_at, '+' || COALESCE(campaigns.video_deadline_days, 7) || ' days')"
                : "campaign_creators.posted_at <= DATE_ADD(campaign_creators.sample_received_at, INTERVAL COALESCE(campaigns.video_deadline_days, 7) DAY)";

            $onTimeStats = CampaignCreator::query()
                ->join('campaigns', 'campaigns.id', '=', 'campaign_creators.campaign_id')
                ->whereNotNull('campaign_creators.sample_received_at')
                ->whereNotNull('campaign_creators.posted_at')
                ->whereNull('campaign_creators.deleted_at')
                ->whereNull('campaigns.deleted_at')
                ->selectRaw("
                    COUNT(*) as total_evaluated,
                    COUNT(CASE WHEN {$dateAddSql} THEN 1 END) as on_time_count
                ")->first();

            $totalEvaluated = (int) ($onTimeStats->total_evaluated ?? 0);
            $onTimeCount = (int) ($onTimeStats->on_time_count ?? 0);
            $onTimeRate = $totalEvaluated > 0
                ? (int) round(($onTimeCount / $totalEvaluated) * 100)
                : 100;

            $totalCost = (float) CampaignCreator::whereNull('deleted_at')->sum('booking_fee');
            $estimatedMarginGmv = $totalGmv * 0.20;
            $roiPercent = $totalCost > 0
                ? round((($estimatedMarginGmv - $totalCost) / $totalCost) * 100, 1)
                : ($totalGmv > 0 ? 100.0 : 0.0);

            return [
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
            ];
        });

        // 2. Action Center - Việc cần xử lý ngay (Cache Versioning 5 phút)
        $actionCenter = SystemCacheService::rememberDashboard('action_center', 300, function () {
            // 2.1 KOC quá hạn / sắp đến hạn nộp video
            $deadlineKocs = CampaignCreator::query()
                ->where('status', PipelineStatusEnum::SAMPLE_RECEIVED)
                ->whereNull('deleted_at')
                ->with([
                    'creator:id,name,phone',
                    'campaign:id,name,video_deadline_days',
                    'assignee:id,name',
                ])
                ->orderBy('sample_received_at', 'asc')
                ->take(12)
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
                ->whereNull('deleted_at')
                ->with([
                    'campaignCreator.creator:id,name',
                    'campaignCreator.campaign:id,name',
                ])
                ->select(['id', 'campaign_creator_id', 'platform', 'video_title', 'post_url', 'created_at'])
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
                ->whereNull('deleted_at');

            $readyToShipCount = $readyToShipQuery->count();
            $readyToShipList = (clone $readyToShipQuery)
                ->with([
                    'creator:id,name,phone,shipping_address',
                    'campaign:id,name',
                ])
                ->latest('address_confirmed_at')
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

            return [
                'deadline_kocs' => $deadlineKocs,
                'pending_approval_posts' => $pendingApprovalPosts,
                'pending_approval_count' => $pendingApprovalPosts->count(),
                'ready_to_ship_count' => $readyToShipCount,
                'ready_to_ship_list' => $readyToShipList,
            ];
        });

        // 3. Tiến độ các chiến dịch đang hoạt động (Cache Versioning 10 phút)
        $activeCampaignsList = SystemCacheService::rememberDashboard('active_campaigns', 600, function () {
            return Campaign::query()
                ->where('status', CampaignStatusEnum::ACTIVE)
                ->with([
                    'campaignCreators' => function ($q) {
                        $q->select(['id', 'campaign_id', 'status', 'booking_fee'])
                            ->with(['contentPosts:id,campaign_creator_id']);
                    },
                ])
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
                })
                ->all();
        });

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'action_center' => $actionCenter,
            'active_campaigns' => $activeCampaignsList,
        ]);
    }
}

