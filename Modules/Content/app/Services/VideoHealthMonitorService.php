<?php

namespace Modules\Content\Services;

use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Modules\Content\Models\ContentPost;

class VideoHealthMonitorService
{
    public function __construct(
        protected VideoMetadataExtractorService $metadataExtractor
    ) {}

    /**
     * Quét và kiểm tra sức khỏe của các video đã nghiệm thu trong 45 ngày qua
     *
     * @return array Thống kê kết quả quét
     */
    public function scanActiveApprovedVideos(int $daysLimit = 45): array
    {
        $sinceDate = Carbon::now()->subDays($daysLimit);

        $posts = ContentPost::query()
            ->with(['campaignCreator.creator', 'campaignCreator.campaign', 'campaignCreator.assignee'])
            ->where('status', 'approved')
            ->where(function ($q) use ($sinceDate) {
                $q->where('posted_at', '>=', $sinceDate)
                    ->orWhere('created_at', '>=', $sinceDate);
            })
            ->whereNotNull('post_url')
            ->get();

        $stats = [
            'total_checked' => 0,
            'healthy_count' => 0,
            'issues_detected' => 0,
            'details' => [],
        ];

        foreach ($posts as $post) {
            $stats['total_checked']++;

            $metadata = $this->metadataExtractor->extract($post->platform, $post->post_url);
            $isAvailable = (bool) ($metadata['is_available'] ?? true);
            $errorMsg = $metadata['error_message'] ?? null;

            if (!$isAvailable) {
                $stats['issues_detected']++;
                $post->update([
                    'health_status' => 'unavailable',
                    'health_error_message' => $errorMsg ?: 'Video bị xóa hoặc chuyển sang riêng tư.',
                    'health_last_checked_at' => now(),
                ]);

                // Bắn thông báo chuông cảnh báo khẩn cấp
                $this->notifyHealthIssue($post, $errorMsg ?: 'Video không còn khả dụng.');

                $stats['details'][] = [
                    'post_id' => $post->id,
                    'creator' => $post->campaignCreator?->creator?->name,
                    'campaign' => $post->campaignCreator?->campaign?->name,
                    'error' => $errorMsg,
                ];
            } else {
                $stats['healthy_count']++;
                $post->update([
                    'health_status' => 'healthy',
                    'health_error_message' => null,
                    'health_last_checked_at' => now(),
                ]);
            }
        }

        return $stats;
    }

    /**
     * Gửi thông báo cảnh báo khi phát hiện video có vấn đề
     */
    protected function notifyHealthIssue(ContentPost $post, string $reason): void
    {
        $creatorName = $post->campaignCreator?->creator?->name ?? 'KOC';
        $campaignName = $post->campaignCreator?->campaign?->name ?? 'Chiến dịch';
        $assignedUserId = $post->campaignCreator?->assigned_to;

        $title = "⚠️ Cảnh báo: Video của {$creatorName} không còn khả dụng!";
        $message = "Video bài đăng trong {$campaignName} bị phát hiện không thể truy cập ({$reason}). Vui lòng kiểm tra và liên hệ KOC ngay.";

        // Nếu có NotificationService trong App, sử dụng để tạo notification
        if (class_exists(NotificationService::class)) {
            // Gửi cho nhân viên phụ trách nếu có
            if ($assignedUserId) {
                NotificationService::create([
                    'user_id' => $assignedUserId,
                    'title' => $title,
                    'message' => $message,
                    'type' => 'risk_alert',
                    'action_url' => route('content.index', ['search' => $creatorName]),
                ]);
            }

            // Gửi thêm cho Admin / Leader
            $admins = User::role(['Admin', 'Leader'])->where('id', '!=', $assignedUserId)->limit(3)->get();
            foreach ($admins as $admin) {
                NotificationService::create([
                    'user_id' => $admin->id,
                    'title' => $title,
                    'message' => $message,
                    'type' => 'risk_alert',
                    'action_url' => route('content.index', ['search' => $creatorName]),
                ]);
            }
        } else {
            Log::warning("Video Health Issue: {$title} - {$message}");
        }
    }
}

