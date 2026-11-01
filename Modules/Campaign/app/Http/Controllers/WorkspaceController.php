<?php

namespace Modules\Campaign\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
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

        // Đếm tổng số KOC chưa phân công và số KOC được phân công riêng cho currentUser
        $unassignedCount = CampaignCreator::query()
            ->whereHas('campaign', fn ($q) => $q->where('status', '!=', CampaignStatusEnum::COMPLETED))
            ->whereNull('assigned_to')
            ->count();

        $myKocCount = $currentUser ? CampaignCreator::query()
            ->whereHas('campaign', fn ($q) => $q->where('status', '!=', CampaignStatusEnum::COMPLETED))
            ->where('assigned_to', $currentUser->id)
            ->count() : 0;

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

        // Bộ lọc: Chiến dịch & Tìm kiếm
        $campaignId = $request->filled('campaign_id') ? (int) $request->input('campaign_id') : null;
        $search = $request->input('search');

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
                'creator.accounts',
                'campaign:id,name,product_name,video_deadline_days,status,hashtags,discount_code',
                'assignee:id,name,email',
                'contentPosts',
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

        $allKocs = $query->latest('updated_at')->get();

        // Tính deadline_info và sinh portal_token nếu thiếu
        $allKocs->each(function ($item) {
            if (!$item->portal_token) {
                $item->generatePortalToken();
            }
            $item->deadline_info = $this->pipelineService->calculateDeadline($item);
        });

        // 1. Nhóm Cần Tiếp Cận / Gửi Brief (status: new, contacted)
        $leadsGroup = $allKocs->filter(function ($item) {
            return in_array($item->status, [PipelineStatusEnum::NEW, PipelineStatusEnum::CONTACTED]);
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

        return Inertia::render('Campaign/Workspace', [
            'filters' => [
                'staff_id' => is_numeric($effectiveFilterMode) ? (string) $effectiveFilterMode : (string) $effectiveFilterMode,
                'campaign_id' => $campaignId,
                'search' => $search,
            ],
            'is_leader_or_admin' => $isLeaderOrAdmin,
            'current_user_id' => $currentUser?->id ?? 0,
            'staff_users' => $staffUsers,
            'campaigns' => $activeCampaigns,
            'stats' => [
                'total_my_kocs' => $allKocs->count(),
                'my_kocs_count' => $myKocCount,
                'unassigned_count' => $unassignedCount,
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
                'samples' => $samplesGroup,
                'deadlines' => $deadlinesGroup,
                'reviews' => $reviewsGroup,
            ],
        ]);
    }
}
