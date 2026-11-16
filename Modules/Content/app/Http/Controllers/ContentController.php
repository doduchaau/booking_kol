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
use Modules\Content\Services\VideoComplianceService;

class ContentController extends Controller
{
    /**
     * Danh sách video nghiệm thu và theo dõi chỉ số
     */
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'platform', 'status', 'compliance_status', 'health_status', 'campaign_id']);

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

        // Lọc theo trạng thái tuân thủ
        if (!empty($filters['compliance_status'])) {
            $query->where('compliance_status', $filters['compliance_status']);
        }

        // Lọc theo tình trạng sức khỏe video
        if (!empty($filters['health_status'])) {
            $query->where('health_status', $filters['health_status']);
        }

        // Lọc theo chiến dịch
        if (!empty($filters['campaign_id'])) {
            $query->whereHas('campaignCreator', function ($qc) use ($filters) {
                $qc->where('campaign_id', $filters['campaign_id']);
            });
        }

        $posts = $query->latest('id')->paginate(15)->withQueryString();

        // Tính toán thống kê tổng quan (Hợp nhất vào 1 câu SQL Aggregation duy nhất)
        $stats = ContentPost::query()
            ->whereNull('deleted_at')
            ->selectRaw("
                COUNT(*) as total_posts,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_posts,
                COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_posts,
                COUNT(CASE WHEN compliance_status = 'passed' THEN 1 END) as passed_compliance,
                COUNT(CASE WHEN compliance_status = 'warning' THEN 1 END) as warning_compliance,
                COUNT(CASE WHEN health_status = 'unavailable' THEN 1 END) as unhealthy_count,
                COALESCE(SUM(views_count), 0) as total_views,
                COALESCE(SUM(gmv_amount), 0) as total_gmv
            ")->first();

        // Danh sách chiến dịch để lọc
        $campaigns = Campaign::select('id', 'name')->latest('id')->take(20)->get();

        return Inertia::render('Content/Index', [
            'posts' => $posts,
            'filters' => $filters,
            'campaigns' => $campaigns,
            'stats' => [
                'total_posts' => (int) ($stats->total_posts ?? 0),
                'approved_posts' => (int) ($stats->approved_posts ?? 0),
                'pending_posts' => (int) ($stats->pending_posts ?? 0),
                'passed_compliance' => (int) ($stats->passed_compliance ?? 0),
                'warning_compliance' => (int) ($stats->warning_compliance ?? 0),
                'unhealthy_count' => (int) ($stats->unhealthy_count ?? 0),
                'total_views' => (int) ($stats->total_views ?? 0),
                'total_gmv' => (float) ($stats->total_gmv ?? 0),
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

        // Tự động làm mới cache Dashboard và Workspace
        if (class_exists(\App\Services\SystemCacheService::class)) {
            \App\Services\SystemCacheService::flushDashboardCache();
            \App\Services\SystemCacheService::flushWorkspaceCache();
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

        $sourceLabel = match ($result['source'] ?? '') {
            'tikwm_public_api' => 'TikWM Real-time API',
            'tiktok_html_hydration', 'tiktok_html_regex', 'tiktok_sigi_state' => 'TikTok Web Scraper',
            'tiktok_provider_api' => 'Social Data Provider',
            'youtube_official_api' => 'YouTube Data API v3',
            'manual' => 'Nhập thủ công',
            'tiktok_oembed', 'youtube_oembed' => 'oEmbed Metadata',
            default => 'Hệ thống',
        };

        if ($result['post']->views_count === 0 && in_array($result['source'] ?? '', ['tiktok_oembed', 'youtube_oembed'])) {
            return back()->with('warning', "Đã lấy thông tin từ {$sourceLabel}, nhưng nền tảng chưa mở lượt xem tự động (do video riêng tư hoặc nền tảng giới hạn). Bạn có thể bấm 'Sửa' để nhập số liệu đối soát thực tế.");
        }

        return back()->with('success', "Đã đồng bộ chỉ số thực tế qua {$sourceLabel} cho video #{$post->id}: " . number_format($result['post']->views_count, 0, ',', '.') . " lượt xem, " . number_format($result['post']->likes_count, 0, ',', '.') . " lượt thích.");
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

    /**
     * Chạy kiểm tra tuân thủ kịch bản cho 1 video
     */
    public function checkCompliance(int $id, VideoComplianceService $complianceService): RedirectResponse
    {
        $post = ContentPost::with(['campaignCreator.campaign', 'campaignCreator.creator.accounts'])->findOrFail($id);
        $result = $complianceService->evaluatePost($post);

        $statusLabel = match ($result['status']) {
            'passed' => 'Đạt chuẩn 100%',
            'warning' => 'Cảnh báo (' . count($result['issues']) . ' lưu ý)',
            default => 'Không đạt yêu cầu',
        };

        return back()->with('success', "Đã kiểm tra tuân thủ video #{$post->id}: {$statusLabel} (Điểm: {$result['score']}/100).");
    }

    /**
     * API Pre-check tuân thủ nhanh khi nhập link (dùng cho modal và portal)
     */
    public function precheck(Request $request, VideoComplianceService $complianceService, \Modules\Content\Services\VideoMetadataExtractorService $extractor): JsonResponse
    {
        $request->validate([
            'post_url' => ['required', 'url'],
            'platform' => ['required', 'string'],
            'campaign_id' => ['nullable', 'integer'],
        ]);

        $url = $request->input('post_url');
        $platform = $request->input('platform');
        $campaignId = $request->input('campaign_id');

        $campaign = $campaignId ? Campaign::find($campaignId) : null;
        $metadata = $extractor->extract($platform, $url);

        $result = $complianceService->evaluate(
            platform: $platform,
            url: $url,
            metadata: $metadata,
            campaign: $campaign
        );

        return response()->json($result);
    }
}
