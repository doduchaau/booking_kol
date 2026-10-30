<?php

namespace Modules\Campaign\Services;

use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;

class CampaignService
{
    /**
     * Tính toán tổng quan các chỉ số của chiến dịch
     */
    public function calculateCampaignStats(Campaign $campaign): array
    {
        $campaign->loadMissing(['campaignCreators.contentPosts']);

        $totalAssigned = $campaign->campaignCreators->count();
        $targetCount = $campaign->target_creators_count ?: 1;

        // Số video đã đăng (hỗ trợ 1 KOC lên nhiều video)
        $completedVideos = (int) $campaign->campaignCreators->sum(function ($cc) {
            $postsCount = $cc->contentPosts ? $cc->contentPosts->count() : 0;
            if ($postsCount > 0) {
                return $postsCount;
            }
            return in_array($cc->status, [PipelineStatusEnum::POSTED, PipelineStatusEnum::COMPLETED]) ? 1 : 0;
        });

        // Tiến độ video %
        $videoProgressPercent = min(100, round(($completedVideos / $targetCount) * 100, 1));

        // Tổng chi phí booking đã cam kết
        $totalCommittedBudget = (float) $campaign->campaignCreators->sum('booking_fee');
        $budgetPercent = $campaign->budget > 0
            ? min(100, round(($totalCommittedBudget / (float) $campaign->budget) * 100, 1))
            : 0;

        return [
            'total_assigned' => $totalAssigned,
            'completed_videos' => $completedVideos,
            'completed_videos_count' => $completedVideos,
            'target_count' => $targetCount,
            'video_progress_percent' => $videoProgressPercent,
            'total_committed_budget' => $totalCommittedBudget,
            'budget_percent' => $budgetPercent,
        ];
    }

    /**
     * Thêm hàng loạt Creator vào chiến dịch
     */
    public function addCreatorsToCampaign(
        Campaign $campaign,
        array $creatorIds,
        ?int $assignedTo = null,
        float $bookingFee = 0.0
    ): array {
        $added = 0;
        $skipped = 0;

        foreach ($creatorIds as $creatorId) {
            // Kiểm tra đã có trong chiến dịch chưa
            $exists = CampaignCreator::where('campaign_id', $campaign->id)
                ->where('creator_id', $creatorId)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            $cc = CampaignCreator::create([
                'campaign_id' => $campaign->id,
                'creator_id' => $creatorId,
                'assigned_to' => $assignedTo,
                'status' => PipelineStatusEnum::NEW,
                'booking_fee' => $bookingFee,
            ]);

            // Sinh sẵn token bảo mật truy cập cổng Portal (14 ngày hạn dùng)
            $cc->generatePortalToken(14);
            $added++;
        }

        return [
            'added' => $added,
            'skipped' => $skipped,
        ];
    }
}
