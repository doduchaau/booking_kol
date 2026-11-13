<?php

namespace Modules\Campaign\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Models\Creator;

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
     * Hỗ trợ gán danh sách ID hoặc chọn toàn bộ KOC khả dụng trong kho dữ liệu
     */
    public function addCreatorsToCampaign(
        Campaign $campaign,
        array $creatorIds = [],
        ?int $assignedTo = null,
        float $bookingFee = 0.0,
        bool $selectAllInDb = false
    ): array {
        if ($selectAllInDb) {
            $existingCreatorIds = CampaignCreator::where('campaign_id', $campaign->id)
                ->pluck('creator_id')
                ->toArray();

            $creatorIds = Creator::query()
                ->whereNull('merged_into_creator_id')
                ->whereNotIn('id', $existingCreatorIds)
                ->pluck('id')
                ->toArray();
        }

        $added = 0;
        $skipped = 0;

        if (empty($creatorIds)) {
            return [
                'added' => 0,
                'skipped' => 0,
            ];
        }

        DB::transaction(function () use ($campaign, $creatorIds, $assignedTo, $bookingFee, &$added, &$skipped) {
            $existingSet = CampaignCreator::where('campaign_id', $campaign->id)
                ->pluck('creator_id')
                ->flip()
                ->toArray();

            $now = now();
            $expiresAt = $now->copy()->addDays(14);

            $inserts = [];
            foreach ($creatorIds as $creatorId) {
                if (isset($existingSet[$creatorId])) {
                    $skipped++;
                    continue;
                }

                $inserts[] = [
                    'campaign_id' => $campaign->id,
                    'creator_id' => $creatorId,
                    'assigned_to' => $assignedTo,
                    'status' => PipelineStatusEnum::NEW->value,
                    'booking_fee' => $bookingFee,
                    'commission_rate' => $campaign->commission_rate,
                    'ads_commission_rate' => $campaign->ads_commission_rate,
                    'portal_token' => Str::random(64),
                    'portal_token_expires_at' => $expiresAt,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                $existingSet[$creatorId] = true;
                $added++;

                if (count($inserts) >= 100) {
                    CampaignCreator::insert($inserts);
                    $inserts = [];
                }
            }

            if (!empty($inserts)) {
                CampaignCreator::insert($inserts);
            }
        });

        if ($added > 0) {
            if (class_exists(\App\Services\SystemCacheService::class)) {
                \App\Services\SystemCacheService::flushDashboardCache();
                \App\Services\SystemCacheService::flushWorkspaceCache();
            }
        }

        return [
            'added' => $added,
            'skipped' => $skipped,
        ];
    }
}
