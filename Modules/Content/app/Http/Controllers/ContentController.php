<?php

namespace Modules\Content\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Campaign\Models\Campaign;
use Modules\Content\Models\ContentPost;
use Modules\Content\Models\ContentPostMetric;
use Modules\Content\Services\ContentMetricsSyncService;

class ContentController extends Controller
{
    /**
     * Danh sách video nghiệm thu và theo dõi chỉ số
     */
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'platform', 'status', 'campaign_id']);

        $query = ContentPost::query()
            ->with([
                'campaignCreator.creator.accounts',
                'campaignCreator.campaign',
                'latestMetric',
            ]);

        // Tìm kiếm theo tên creator hoặc url/tiêu đề video
        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('video_title', 'like', $search)
                    ->orWhere('post_url', 'like', $search)
                    ->orWhereHas('campaignCreator.creator', function ($qc) use ($search) {
                        $qc->where('name', 'like', $search);
                    });
            });
        }

        // Lọc theo nền tảng
        if (!empty($filters['platform'])) {
            $query->where('platform', $filters['platform']);
        }

        // Lọc theo trạng thái
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Lọc theo chiến dịch
        if (!empty($filters['campaign_id'])) {
            $query->whereHas('campaignCreator', function ($qc) use ($filters) {
                $qc->where('campaign_id', $filters['campaign_id']);
            });
        }

        $posts = $query->latest('id')->paginate(15)->withQueryString();

        // Tính toán thống kê tổng quan
        $totalPosts = ContentPost::count();
        $approvedPosts = ContentPost::where('status', 'approved')->count();
        $pendingPosts = ContentPost::where('status', 'pending_approval')->count();
        $totalViews = (int) ContentPost::sum('views_count');
        $totalGmv = (float) ContentPost::sum('gmv_amount');

        // Danh sách chiến dịch để lọc
        $campaigns = Campaign::select('id', 'name')->latest('id')->take(20)->get();

        return Inertia::render('Content/Index', [
            'posts' => $posts,
            'filters' => $filters,
            'campaigns' => $campaigns,
            'stats' => [
                'total_posts' => $totalPosts,
                'approved_posts' => $approvedPosts,
                'pending_posts' => $pendingPosts,
                'total_views' => $totalViews,
                'total_gmv' => $totalGmv,
            ],
        ]);
    }

    /**
     * Cập nhật trạng thái duyệt video (Approve / Request Changes)
     */
    public function updateStatus(
        Request $request,
        int $id,
        ContentMetricsSyncService $syncService
    ): RedirectResponse {
        $request->validate([
            'status' => ['required', 'in:pending_approval,approved,changes_requested'],
        ]);

        $post = ContentPost::findOrFail($id);
        $newStatus = $request->input('status');

        $updates = ['status' => $newStatus];
        if ($newStatus === 'approved' && empty($post->posted_at)) {
            $updates['posted_at'] = now();
        }

        $post->update($updates);

        // Nếu vừa duyệt xong, tự động đồng bộ chỉ số khởi điểm
        if ($newStatus === 'approved') {
            $syncService->syncPost($post);
        }

        $statusLabel = match ($newStatus) {
            'approved' => 'Đã duyệt video thành công',
            'changes_requested' => 'Đã yêu cầu Creator chỉnh sửa nội dung',
            default => 'Đã chuyển về trạng thái chờ duyệt',
        };

        return back()->with('success', "{$statusLabel} cho video #{$post->id}.");
    }

    /**
     * Đồng bộ thủ công chỉ số cho 1 video
     */
    public function syncMetrics(
        Request $request,
        int $id,
        ContentMetricsSyncService $syncService
    ): RedirectResponse {
        $post = ContentPost::findOrFail($id);

        $custom = null;
        if ($request->has('views_count') && is_numeric($request->input('views_count'))) {
            $custom = [
                'views_count' => (int) $request->input('views_count'),
                'likes_count' => (int) ($request->input('likes_count') ?? 0),
                'comments_count' => (int) ($request->input('comments_count') ?? 0),
                'shares_count' => (int) ($request->input('shares_count') ?? 0),
                'gmv_amount' => (float) ($request->input('gmv_amount') ?? 0),
            ];
        }

        $result = $syncService->syncPost($post, $custom);

        return back()->with('success', "Đã đồng bộ chỉ số cho video #{$post->id}: {$result['post']->views_count} lượt xem, {$result['post']->likes_count} lượt thích.");
    }

    /**
     * Đồng bộ toàn bộ các video đang hoạt động
     */
    public function syncAll(ContentMetricsSyncService $syncService): RedirectResponse
    {
        $count = $syncService->syncAllActivePosts();

        return back()->with('success', "Đã đồng bộ chỉ số hàng ngày cho {$count} video thành công.");
    }

    /**
     * Lấy lịch sử biến động chỉ số theo ngày để vẽ biểu đồ
     */
    public function metricsHistory(int $id): JsonResponse
    {
        $post = ContentPost::with(['campaignCreator.creator'])->findOrFail($id);

        $history = ContentPostMetric::where('content_post_id', $id)
            ->orderBy('recorded_date', 'asc')
            ->get(['recorded_date', 'views_count', 'likes_count', 'comments_count', 'gmv_amount']);

        return response()->json([
            'post' => [
                'id' => $post->id,
                'title' => $post->video_title ?: $post->post_url,
                'creator_name' => $post->campaignCreator?->creator?->name,
                'platform' => $post->platform,
                'post_url' => $post->post_url,
                'views_count' => $post->views_count,
                'likes_count' => $post->likes_count,
            ],
            'history' => $history,
        ]);
    }
}
