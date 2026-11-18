<?php

namespace Modules\Campaign\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SystemCacheService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\PipelineService;
use Modules\Content\Models\ContentPost;

class WorkspaceController extends Controller
{
    public function __construct(
        protected PipelineService $pipelineService
    ) {}

    /**
     * Màn hình Bàn Làm Việc Cá Nhân của Nhân viên Booking (My Workspace / To-Do)
     */
    public function index(Request $request): Response
    {
        $currentUser = auth()->user();
        $isLeaderOrAdmin = $currentUser ? $currentUser->hasAnyRole(['Admin', 'Leader']) : false;

        // Đếm tổng số KOC chưa phân công và số KOC được phân công riêng cho currentUser (Cache Versioning 5 phút)
        $unassignedCount = SystemCacheService::rememberWorkspace('unassigned_count', 300, function () {
            return CampaignCreator::query()
                ->whereHas('campaign', fn ($q) => $q->where('status', '!=', CampaignStatusEnum::COMPLETED))
                ->whereNull('assigned_to')
                ->count();
        });

        $myKocCount = $currentUser ? SystemCacheService::rememberWorkspace("user_{$currentUser->id}_count", 300, function () use ($currentUser) {
            return CampaignCreator::query()
                ->whereHas('campaign', fn ($q) => $q->where('status', '!=', CampaignStatusEnum::COMPLETED))
                ->where('assigned_to', $currentUser->id)
                ->count();
        }) : 0;

        // Bộ lọc: Nhân viên phụ trách (all, unassigned, hoặc user_id)
        $requestedStaffId = $request->input('staff_id');
        $effectiveFilterMode = null; // 'all' | 'unassigned' | int ID

        if (!empty($requestedStaffId)) {
            if ($requestedStaffId === 'all') {
                $effectiveFilterMode = 'all';
            } elseif ($requestedStaffId === 'unassigned') {
                $effectiveFilterMode = 'unassigned';
            } else {
                $effectiveFilterMode = (int) $requestedStaffId;
            }
        } else {
            // Mặc định khi chưa chọn bộ lọc:
            if ($isLeaderOrAdmin) {
                // Admin/Leader: Nếu có việc của riêng mình -> hiển thị việc của tôi; Nếu = 0 -> mở rộng 'all' để không bị màn hình trắng 0 KOC
                $effectiveFilterMode = $myKocCount > 0 ? $currentUser->id : 'all';
            } else {
                $effectiveFilterMode = $currentUser?->id;
            }
        }

        // Bộ lọc: Chiến dịch & Tìm kiếm & Độ khẩn cấp
        $campaignId = $request->filled('campaign_id') ? (int) $request->input('campaign_id') : null;
        $search = $request->input('search');
        $urgency = $request->input('urgency'); // 'all' | 'overdue' | 'warning' | 'ready_to_ship' | 'pending_approval'
        $focusKocId = $request->filled('focus_koc') ? (int) $request->input('focus_koc') : null;

        // Danh sách chiến dịch đang hoạt động để lọc
        $activeCampaigns = Campaign::query()
            ->where('status', '!=', CampaignStatusEnum::COMPLETED)
            ->select('id', 'name', 'product_name', 'status')
            ->latest('id')
            ->get();

        // Danh sách nhân viên (hỗ trợ Admin/Leader và việc gán KOC)
        $staffUsers = User::select('id', 'name', 'email')->orderBy('name')->get();

        // Query các KOC
        $query = CampaignCreator::query()
            ->whereHas('campaign', function ($q) {
                $q->where('status', '!=', CampaignStatusEnum::COMPLETED);
            })
            ->with([
                'creator:id,name,phone,shipping_address,city_province,district,ward,niche,tier,trust_score,blacklist_status',
                'creator.accounts:id,creator_id,platform,handle,followers_count,url',
                'campaign:id,name,product_name,video_deadline_days,status,hashtags,discount_code',
                'campaign.products',
                'creatorProducts.campaignProduct',
                'assignee:id,name,email',
                'contentPosts:id,campaign_creator_id,platform,post_url,video_title,status,views_count,likes_count,comments_count,gmv_amount,posted_at',
            ]);

        // Áp dụng bộ lọc nhân viên phụ trách
        if ($effectiveFilterMode === 'unassigned') {
            $query->whereNull('assigned_to');
        } elseif ($effectiveFilterMode === 'all') {
            // Lấy tất cả KOC (cả đã gán và chưa gán)
        } elseif (is_numeric($effectiveFilterMode)) {
            $query->where('assigned_to', (int) $effectiveFilterMode);
        }

        // Lọc theo chiến dịch
        if ($campaignId) {
            $query->where('campaign_id', $campaignId);
        }

        // Lọc theo từ khóa tìm kiếm (tên KOC, SĐT, handle)
        if (!empty($search)) {
            $searchKeyword = '%' . trim($search) . '%';
            $query->whereHas('creator', function ($qc) use ($searchKeyword) {
                $qc->where('name', 'like', $searchKeyword)
                    ->orWhere('phone', 'like', $searchKeyword)
                    ->orWhereHas('accounts', function ($qa) use ($searchKeyword) {
                        $qa->where('handle', 'like', $searchKeyword);
                    });
            });
        }

        // Lọc tập trung theo thông báo (focus_koc)
        if ($focusKocId) {
            $query->where('id', $focusKocId);
        }

        $allKocs = $query->latest('updated_at')->get();

        // Tính deadline_info cho từng KOC và gán quan hệ ngược cho contentPosts để loại bỏ hoàn toàn N+1 queries khi serialize
        $allKocs->each(function ($item) {
            if ($item->relationLoaded('contentPosts')) {
                $item->contentPosts->each(function ($post) use ($item) {
                    $post->setRelation('campaignCreator', $item);
                });
            }
            $item->deadline_info = $this->pipelineService->calculateDeadline($item);
        });

        // 1. Nhóm Cần Tiếp Cận / Gửi Brief (status: new, contacted)
        $leadsGroup = $allKocs->filter(function ($item) {
            return in_array($item->status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED]);
        })->values();

        // 1.5. Nhóm Chờ Duyệt Chi Phí Cast (status: waiting_approval)
        $approvalGroup = $allKocs->filter(function ($item) {
            return $item->status === PipelineStatusEnum::WAITING_APPROVAL;
        })->values();

        // 2. Nhóm Xử Lý Mẫu Thử
        // - Chờ kho gửi mẫu (address_confirmed)
        // - Đã gửi mẫu, theo dõi nhận hàng (sample_sent)
        $samplesGroup = $allKocs->filter(function ($item) {
            return in_array($item->status, [PipelineStatusEnum::ADDRESS_CONFIRMED, PipelineStatusEnum::SAMPLE_SENT]);
        })->values();

        // 3. Nhóm Đôn Đốc Deadline Lên Video (sample_received)
        $deadlinesGroup = $allKocs->filter(function ($item) {
            return $item->status === PipelineStatusEnum::SAMPLE_RECEIVED;
        })->sortBy(function ($item) {
            $order = ['overdue' => 1, 'warning' => 2, 'safe' => 3];
            return $order[$item->deadline_info['status'] ?? 'safe'] ?? 4;
        })->values();

        // 4. Nhóm Nghiệm Thu Video (posted, completed hoặc có content post)
        $reviewsGroup = $allKocs->filter(function ($item) {
            return in_array($item->status, [PipelineStatusEnum::POSTED, PipelineStatusEnum::COMPLETED])
                || ($item->contentPosts && $item->contentPosts->count() > 0);
        })->values();

        // Thống kê nhanh chỉ số công việc
        $overdueCount = $deadlinesGroup->filter(fn ($item) => ($item->deadline_info['status'] ?? '') === 'overdue')->count();
        $warningCount = $deadlinesGroup->filter(fn ($item) => ($item->deadline_info['status'] ?? '') === 'warning')->count();
        $readyToShipCount = $samplesGroup->filter(fn ($item) => $item->status === PipelineStatusEnum::ADDRESS_CONFIRMED)->count();
        $awaitingReceiptCount = $samplesGroup->filter(fn ($item) => $item->status === PipelineStatusEnum::SAMPLE_SENT)->count();

        // Video đang chờ duyệt
        $pendingApprovalCount = ContentPost::query()
            ->where('status', 'pending_approval')
            ->when(is_numeric($effectiveFilterMode), function ($q) use ($effectiveFilterMode) {
                $q->whereHas('campaignCreator', fn ($qc) => $qc->where('assigned_to', $effectiveFilterMode));
            })
            ->when($effectiveFilterMode === 'unassigned', function ($q) {
                $q->whereHas('campaignCreator', fn ($qc) => $qc->whereNull('assigned_to'));
            })
            ->count();

        // Áp dụng bộ lọc khẩn cấp (Urgency Filter) vào các buckets nếu người dùng chỉ định
        if ($urgency === 'overdue') {
            $deadlinesGroup = $deadlinesGroup->filter(fn ($item) => ($item->deadline_info['status'] ?? '') === 'overdue')->values();
            $leadsGroup = collect();
            $approvalGroup = collect();
            $samplesGroup = collect();
            $reviewsGroup = collect();
        } elseif ($urgency === 'warning') {
            $deadlinesGroup = $deadlinesGroup->filter(fn ($item) => ($item->deadline_info['status'] ?? '') === 'warning')->values();
            $leadsGroup = collect();
            $approvalGroup = collect();
            $samplesGroup = collect();
            $reviewsGroup = collect();
        } elseif ($urgency === 'ready_to_ship') {
            $samplesGroup = $samplesGroup->filter(fn ($item) => $item->status === PipelineStatusEnum::ADDRESS_CONFIRMED)->values();
            $leadsGroup = collect();
            $approvalGroup = collect();
            $deadlinesGroup = collect();
            $reviewsGroup = collect();
        } elseif ($urgency === 'pending_approval') {
            $reviewsGroup = $reviewsGroup->filter(function ($item) {
                return $item->contentPosts && $item->contentPosts->contains('status', 'pending_approval');
            })->values();
            $leadsGroup = collect();
            $approvalGroup = collect();
            $samplesGroup = collect();
            $deadlinesGroup = collect();
        }

        return Inertia::render('Campaign/Workspace', [
            'filters' => [
                'staff_id' => is_numeric($effectiveFilterMode) ? (string) $effectiveFilterMode : (string) $effectiveFilterMode,
                'campaign_id' => $campaignId,
                'search' => $search,
                'urgency' => $urgency ?: 'all',
                'focus_koc' => $focusKocId,
            ],
            'is_leader_or_admin' => $isLeaderOrAdmin,
            'current_user_id' => $currentUser?->id ?? 0,
            'staff_users' => $staffUsers,
            'campaigns' => $activeCampaigns,
            'stats' => [
                'total_my_kocs' => $allKocs->count(),
                'my_kocs_count' => $myKocCount,
                'unassigned_count' => $unassignedCount,
                'approval_count' => $approvalGroup->count(),
                'leads_count' => $leadsGroup->count(),
                'samples_count' => $samplesGroup->count(),
                'deadlines_count' => $deadlinesGroup->count(),
                'reviews_count' => $reviewsGroup->count(),
                'overdue_count' => $overdueCount,
                'warning_count' => $warningCount,
                'ready_to_ship_count' => $readyToShipCount,
                'awaiting_receipt_count' => $awaitingReceiptCount,
                'pending_approval_count' => $pendingApprovalCount,
            ],
            'buckets' => [
                'leads' => $leadsGroup,
                'approval' => $approvalGroup,
                'samples' => $samplesGroup,
                'deadlines' => $deadlinesGroup,
                'reviews' => $reviewsGroup,
            ],
        ]);
    }
}
