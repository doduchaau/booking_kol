<?php

namespace Modules\Report\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;

class ReportCalculationService
{
    /**
     * Thời gian sống của Cache (15 phút)
     */
    protected const CACHE_TTL_SECONDS = 900;

    /**
     * Thống kê phễu chuyển đổi (Funnel Metrics) sử dụng SQL Conditional Aggregation thuần:
     * Mới -> Đã liên hệ -> Chốt hợp tác -> Đã nhận mẫu -> Đã lên video
     */
    public function getFunnelMetrics(?int $campaignId = null, ?array $dateRange = null): array
    {
        $cacheKey = "report_funnel:v2:{$campaignId}:" . md5(json_encode($dateRange));

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $dateRange) {
            $query = CampaignCreator::query()
                ->whereNull('campaign_creators.deleted_at');

            if ($campaignId) {
                $query->where('campaign_creators.campaign_id', $campaignId);
            }

            if (!empty($dateRange['start_date'])) {
                $query->whereDate('campaign_creators.created_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $query->whereDate('campaign_creators.created_at', '<=', $dateRange['end_date']);
            }

            // Thực thi 1 câu truy vấn SQL gom nhóm duy nhất thay vì duyệt PHP Collection
            $stats = $query->selectRaw("
                COUNT(*) as count_new,
                COUNT(CASE WHEN contacted_at IS NOT NULL OR status IN ('contacted', 'agreed', 'address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed', 'declined', 'no_show') THEN 1 END) as count_contacted,
                COUNT(CASE WHEN agreed_at IS NOT NULL OR status IN ('agreed', 'address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed', 'no_show') THEN 1 END) as count_agreed,
                COUNT(CASE WHEN sample_received_at IS NOT NULL OR status IN ('sample_received', 'posted', 'completed', 'no_show') THEN 1 END) as count_sample_received,
                COUNT(CASE WHEN posted_at IS NOT NULL OR status IN ('posted', 'completed') OR EXISTS (SELECT 1 FROM content_posts cp WHERE cp.campaign_creator_id = campaign_creators.id AND cp.deleted_at IS NULL) THEN 1 END) as count_posted
            ")->first();

            $countNew = (int) ($stats->count_new ?? 0);
            $countContacted = (int) ($stats->count_contacted ?? 0);
            $countAgreed = (int) ($stats->count_agreed ?? 0);
            $countSampleReceived = (int) ($stats->count_sample_received ?? 0);
            $countPosted = (int) ($stats->count_posted ?? 0);

            // Tính tỷ lệ chuyển đổi và hao hụt
            $calcStep = function (int $current, int $previous) {
                $conversionRate = $previous > 0 ? round(($current / $previous) * 100, 1) : 0;
                $dropRate = $previous > 0 ? max(0, round(100 - $conversionRate, 1)) : 0;
                return [
                    'conversion_rate' => $conversionRate,
                    'drop_rate' => $dropRate,
                ];
            };

            $step1 = ['name' => 'Mới thêm', 'stage' => 'new', 'count' => $countNew, 'conversion_rate' => 100, 'drop_rate' => 0];
            $step2 = array_merge(['name' => 'Đã liên hệ', 'stage' => 'contacted', 'count' => $countContacted], $calcStep($countContacted, $countNew));
            $step3 = array_merge(['name' => 'Chốt hợp tác', 'stage' => 'agreed', 'count' => $countAgreed], $calcStep($countAgreed, $countContacted));
            $step4 = array_merge(['name' => 'Đã nhận mẫu', 'stage' => 'sample_received', 'count' => $countSampleReceived], $calcStep($countSampleReceived, $countAgreed));
            $step5 = array_merge(['name' => 'Đã lên video', 'stage' => 'posted', 'count' => $countPosted], $calcStep($countPosted, $countSampleReceived));

            $overallConversion = $countNew > 0 ? round(($countPosted / $countNew) * 100, 1) : 0;

            return [
                'steps' => [$step1, $step2, $step3, $step4, $step5],
                'total_candidates' => $countNew,
                'total_posted' => $countPosted,
                'overall_conversion_rate' => $overallConversion,
            ];
        });
    }

    /**
     * Thống kê tài chính & Chỉ số ROI bằng SQL Aggregation
     */
    public function getFinancialRoiMetrics(?int $campaignId = null, ?array $dateRange = null): array
    {
        $cacheKey = "report_financial:v2:{$campaignId}:" . md5(json_encode($dateRange));

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $dateRange) {
            $ccQuery = CampaignCreator::query()
                ->whereNull('campaign_creators.deleted_at');

            if ($campaignId) {
                $ccQuery->where('campaign_creators.campaign_id', $campaignId);
            }
            if (!empty($dateRange['start_date'])) {
                $ccQuery->whereDate('campaign_creators.created_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $ccQuery->whereDate('campaign_creators.created_at', '<=', $dateRange['end_date']);
            }

            $costStats = $ccQuery->selectRaw("
                COALESCE(SUM(booking_fee), 0) as total_booking_cost,
                COUNT(CASE WHEN sample_sent_at IS NOT NULL OR status IN ('sample_sent', 'sample_received', 'posted', 'completed', 'no_show') THEN 1 END) as sample_sent_count
            ")->first();

            $totalBookingCost = (float) ($costStats->total_booking_cost ?? 0);
            $totalSampleCost = ((int) ($costStats->sample_sent_count ?? 0)) * 150000.0;
            $totalCost = $totalBookingCost + $totalSampleCost;

            // Số liệu bài đăng video (Views, Likes, Comments, GMV) qua SQL JOIN
            $postsQuery = ContentPost::query()
                ->join('campaign_creators', 'campaign_creators.id', '=', 'content_posts.campaign_creator_id')
                ->whereNull('campaign_creators.deleted_at')
                ->whereNull('content_posts.deleted_at');

            if ($campaignId) {
                $postsQuery->where('campaign_creators.campaign_id', $campaignId);
            }
            if (!empty($dateRange['start_date'])) {
                $postsQuery->whereDate('content_posts.posted_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $postsQuery->whereDate('content_posts.posted_at', '<=', $dateRange['end_date']);
            }

            $postsStats = $postsQuery->selectRaw("
                COALESCE(SUM(content_posts.views_count), 0) as total_views,
                COALESCE(SUM(content_posts.likes_count), 0) as total_likes,
                COALESCE(SUM(content_posts.comments_count), 0) as total_comments,
                COALESCE(SUM(content_posts.shares_count), 0) as total_shares,
                COALESCE(SUM(content_posts.gmv_amount), 0) as total_gmv,
                COUNT(content_posts.id) as total_videos
            ")->first();

            $totalViews = (int) ($postsStats->total_views ?? 0);
            $totalLikes = (int) ($postsStats->total_likes ?? 0);
            $totalComments = (int) ($postsStats->total_comments ?? 0);
            $totalShares = (int) ($postsStats->total_shares ?? 0);
            $totalGmv = (float) ($postsStats->total_gmv ?? 0);
            $totalVideos = (int) ($postsStats->total_videos ?? 0);

            // Chỉ số ROI & CPV
            $netProfit = $totalGmv - $totalCost;
            $roiPercentage = $totalCost > 0 ? round(($netProfit / $totalCost) * 100, 2) : 0.0;
            $cpv = $totalViews > 0 ? round($totalCost / $totalViews, 2) : 0.0;

            // Xu hướng theo tuần
            $weeklyTrend = $this->calculateWeeklyTrend($campaignId, $dateRange);

            return [
                'total_booking_cost' => $totalBookingCost,
                'total_sample_cost' => $totalSampleCost,
                'total_cost' => $totalCost,
                'total_views' => $totalViews,
                'total_likes' => $totalLikes,
                'total_comments' => $totalComments,
                'total_shares' => $totalShares,
                'total_gmv' => $totalGmv,
                'total_videos' => $totalVideos,
                'net_profit' => $netProfit,
                'roi_percentage' => $roiPercentage,
                'cpv' => $cpv,
                'weekly_trend' => $weeklyTrend,
            ];
        });
    }

    /**
     * Bảng xếp hạng Top Creator bằng SQL Group By + Limit
     */
    public function getCreatorLeaderboard(?int $campaignId = null, int $limit = 10): array
    {
        $cacheKey = "report_leaderboard:v2:{$campaignId}:{$limit}";

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $limit) {
            $baseQuery = CampaignCreator::query()
                ->join('creators', 'creators.id', '=', 'campaign_creators.creator_id')
                ->join('campaigns', 'campaigns.id', '=', 'campaign_creators.campaign_id')
                ->leftJoin('creator_accounts', function ($join) {
                    $join->on('creator_accounts.creator_id', '=', 'creators.id')
                        ->whereRaw('creator_accounts.id = (SELECT id FROM creator_accounts ca WHERE ca.creator_id = creators.id AND ca.deleted_at IS NULL LIMIT 1)');
                })
                ->leftJoin('content_posts', function ($join) {
                    $join->on('content_posts.campaign_creator_id', '=', 'campaign_creators.id')
                        ->whereNull('content_posts.deleted_at');
                })
                ->whereNull('campaign_creators.deleted_at')
                ->whereNull('creators.deleted_at')
                ->whereNull('campaigns.deleted_at');

            if ($campaignId) {
                $baseQuery->where('campaign_creators.campaign_id', $campaignId);
            }

            $baseQuery->groupBy([
                'campaign_creators.id',
                'campaign_creators.creator_id',
                'campaign_creators.booking_fee',
                'campaign_creators.sample_sent_at',
                'campaign_creators.status',
                'creators.name',
                'creators.tier',
                'campaigns.name',
                'creator_accounts.handle',
                'creator_accounts.platform',
            ]);

            $baseQuery->selectRaw("
                campaign_creators.id as campaign_creator_id,
                campaign_creators.creator_id,
                creators.name,
                COALESCE(creator_accounts.handle, '@koc') as handle,
                COALESCE(creator_accounts.platform, 'tiktok') as platform,
                COALESCE(creators.tier, 'nano') as tier,
                NULL as avatar_url,
                campaigns.name as campaign_name,
                COALESCE(SUM(content_posts.views_count), 0) as views_count,
                COALESCE(SUM(content_posts.likes_count), 0) as likes_count,
                COALESCE(SUM(content_posts.gmv_amount), 0) as gmv_amount,
                campaign_creators.booking_fee,
                (campaign_creators.booking_fee + CASE WHEN campaign_creators.sample_sent_at IS NOT NULL THEN 150000.0 ELSE 0.0 END) as total_cost,
                COUNT(content_posts.id) as videos_count,
                MAX(content_posts.post_url) as latest_video_url,
                campaign_creators.status
            ");

            // Top theo Views (Query SQL có LIMIT trực tiếp)
            $topViewsQuery = (clone $baseQuery)
                ->orderByDesc('views_count')
                ->limit($limit)
                ->get();

            $topViews = $topViewsQuery->map(function ($row, $index) {
                $views = (int) $row->views_count;
                $cost = (float) $row->total_cost;
                $gmv = (float) $row->gmv_amount;
                $cpv = $views > 0 ? round($cost / $views, 2) : 0.0;
                $roi = $cost > 0 ? round((($gmv - $cost) / $cost) * 100, 1) : 0.0;

                return [
                    'rank' => $index + 1,
                    'campaign_creator_id' => $row->campaign_creator_id,
                    'creator_id' => $row->creator_id,
                    'name' => $row->name,
                    'handle' => $row->handle,
                    'platform' => $row->platform,
                    'tier' => $row->tier,
                    'avatar_url' => $row->avatar_url,
                    'campaign_name' => $row->campaign_name,
                    'views_count' => $views,
                    'likes_count' => (int) $row->likes_count,
                    'gmv_amount' => $gmv,
                    'booking_fee' => (float) $row->booking_fee,
                    'total_cost' => $cost,
                    'cpv' => $cpv,
                    'roi_percentage' => $roi,
                    'videos_count' => (int) $row->videos_count,
                    'latest_video_url' => $row->latest_video_url,
                    'status' => $row->status instanceof \BackedEnum ? $row->status->value : $row->status,
                ];
            })->all();

            // Top theo GMV (Query SQL có LIMIT trực tiếp)
            $topGmvQuery = (clone $baseQuery)
                ->orderByDesc('gmv_amount')
                ->limit($limit)
                ->get();

            $topGmv = $topGmvQuery->map(function ($row, $index) {
                $views = (int) $row->views_count;
                $cost = (float) $row->total_cost;
                $gmv = (float) $row->gmv_amount;
                $cpv = $views > 0 ? round($cost / $views, 2) : 0.0;
                $roi = $cost > 0 ? round((($gmv - $cost) / $cost) * 100, 1) : 0.0;

                return [
                    'rank' => $index + 1,
                    'campaign_creator_id' => $row->campaign_creator_id,
                    'creator_id' => $row->creator_id,
                    'name' => $row->name,
                    'handle' => $row->handle,
                    'platform' => $row->platform,
                    'tier' => $row->tier,
                    'avatar_url' => $row->avatar_url,
                    'campaign_name' => $row->campaign_name,
                    'views_count' => $views,
                    'likes_count' => (int) $row->likes_count,
                    'gmv_amount' => $gmv,
                    'booking_fee' => (float) $row->booking_fee,
                    'total_cost' => $cost,
                    'cpv' => $cpv,
                    'roi_percentage' => $roi,
                    'videos_count' => (int) $row->videos_count,
                    'latest_video_url' => $row->latest_video_url,
                    'status' => $row->status instanceof \BackedEnum ? $row->status->value : $row->status,
                ];
            })->all();

            return [
                'top_views' => $topViews,
                'top_gmv' => $topGmv,
            ];
        });
    }

    /**
     * Báo cáo năng suất nhân viên booking bằng SQL Aggregation
     */
    public function getStaffPerformance(?int $campaignId = null, ?array $dateRange = null): array
    {
        $cacheKey = "report_staff:v2:{$campaignId}:" . md5(json_encode($dateRange));

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $dateRange) {
            $staffUsers = User::with('roles')->orderBy('name')->get();
            $performance = [];

            foreach ($staffUsers as $staff) {
                $ccQuery = CampaignCreator::query()
                    ->where('assigned_to', $staff->id)
                    ->whereNull('deleted_at');

                if ($campaignId) {
                    $ccQuery->where('campaign_id', $campaignId);
                }
                if (!empty($dateRange['start_date'])) {
                    $ccQuery->whereDate('created_at', '>=', $dateRange['start_date']);
                }
                if (!empty($dateRange['end_date'])) {
                    $ccQuery->whereDate('created_at', '<=', $dateRange['end_date']);
                }

                $stats = $ccQuery->selectRaw("
                    COUNT(*) as total_assigned,
                    COUNT(CASE WHEN contacted_at IS NOT NULL OR status IN ('contacted', 'agreed', 'address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed') THEN 1 END) as contacted_count,
                    COUNT(CASE WHEN agreed_at IS NOT NULL OR status IN ('agreed', 'address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed') THEN 1 END) as agreed_count,
                    COUNT(CASE WHEN sample_sent_at IS NOT NULL OR status IN ('sample_sent', 'sample_received', 'posted', 'completed') THEN 1 END) as samples_sent_count,
                    COUNT(CASE WHEN posted_at IS NOT NULL OR status IN ('posted', 'completed') OR EXISTS (SELECT 1 FROM content_posts cp WHERE cp.campaign_creator_id = campaign_creators.id AND cp.deleted_at IS NULL) THEN 1 END) as posted_count
                ")->first();

                $totalAssigned = (int) ($stats->total_assigned ?? 0);
                if ($totalAssigned === 0 && !$staff->hasRole(['Staff', 'Leader'])) {
                    continue;
                }

                $contactedCount = (int) ($stats->contacted_count ?? 0);
                $agreedCount = (int) ($stats->agreed_count ?? 0);
                $samplesSentCount = (int) ($stats->samples_sent_count ?? 0);
                $postedCount = (int) ($stats->posted_count ?? 0);

                // GMV
                $totalGmv = (float) ContentPost::query()
                    ->whereIn('campaign_creator_id', function ($sub) use ($staff, $campaignId, $dateRange) {
                        $sub->select('id')
                            ->from('campaign_creators')
                            ->where('assigned_to', $staff->id)
                            ->whereNull('deleted_at');
                        if ($campaignId) {
                            $sub->where('campaign_id', $campaignId);
                        }
                        if (!empty($dateRange['start_date'])) {
                            $sub->whereDate('created_at', '>=', $dateRange['start_date']);
                        }
                        if (!empty($dateRange['end_date'])) {
                            $sub->whereDate('created_at', '<=', $dateRange['end_date']);
                        }
                    })
                    ->sum('gmv_amount');

                $closeRate = $totalAssigned > 0 ? round(($agreedCount / $totalAssigned) * 100, 1) : 0.0;
                $completionRate = $agreedCount > 0 ? round(($postedCount / $agreedCount) * 100, 1) : 0.0;

                $rating = 'standard';
                if ($completionRate >= 80 && $closeRate >= 50) {
                    $rating = 'excellent';
                } elseif ($completionRate >= 60) {
                    $rating = 'good';
                }

                $performance[] = [
                    'staff_id' => $staff->id,
                    'staff_name' => $staff->name,
                    'staff_email' => $staff->email,
                    'roles' => $staff->getRoleNames()->toArray(),
                    'total_assigned' => $totalAssigned,
                    'contacted_count' => $contactedCount,
                    'agreed_count' => $agreedCount,
                    'samples_sent_count' => $samplesSentCount,
                    'posted_count' => $postedCount,
                    'close_rate' => $closeRate,
                    'completion_rate' => $completionRate,
                    'total_gmv' => $totalGmv,
                    'rating' => $rating,
                ];
            }

            usort($performance, function ($a, $b) {
                return ($b['posted_count'] <=> $a['posted_count']) ?: ($b['total_gmv'] <=> $a['total_gmv']);
            });

            return $performance;
        });
    }

    /**
     * Xu hướng hiệu quả theo từng tuần (cho Composed Chart)
     */
    protected function calculateWeeklyTrend(?int $campaignId = null, ?array $dateRange = null): array
    {
        $startDate = !empty($dateRange['start_date']) 
            ? Carbon::parse($dateRange['start_date'])->startOfWeek() 
            : Carbon::now()->subWeeks(7)->startOfWeek();

        $endDate = !empty($dateRange['end_date'])
            ? Carbon::parse($dateRange['end_date'])->endOfWeek()
            : Carbon::now()->endOfWeek();

        $weeks = [];
        $current = $startDate->copy();

        while ($current->lte($endDate)) {
            $weekStart = $current->copy()->startOfWeek();
            $weekEnd = $current->copy()->endOfWeek();
            $weekLabel = $weekStart->format('d/m') . ' - ' . $weekEnd->format('d/m');

            // Chi phí tuần qua SQL Sum
            $ccWeek = CampaignCreator::query()
                ->whereBetween('created_at', [$weekStart, $weekEnd])
                ->whereNull('deleted_at');
            if ($campaignId) {
                $ccWeek->where('campaign_id', $campaignId);
            }
            $weekCost = (float) $ccWeek->sum('booking_fee');

            // Doanh thu & Views tuần qua SQL Sum
            $postsWeek = ContentPost::query()
                ->join('campaign_creators', 'campaign_creators.id', '=', 'content_posts.campaign_creator_id')
                ->whereNull('campaign_creators.deleted_at')
                ->whereNull('content_posts.deleted_at')
                ->whereBetween('content_posts.posted_at', [$weekStart, $weekEnd]);

            if ($campaignId) {
                $postsWeek->where('campaign_creators.campaign_id', $campaignId);
            }

            $stats = $postsWeek->selectRaw("
                COALESCE(SUM(content_posts.gmv_amount), 0) as week_gmv,
                COALESCE(SUM(content_posts.views_count), 0) as week_views
            ")->first();

            $weekGmv = (float) ($stats->week_gmv ?? 0);
            $weekViews = (int) ($stats->week_views ?? 0);

            $weekRoi = $weekCost > 0 ? round((($weekGmv - $weekCost) / $weekCost) * 100, 1) : ($weekGmv > 0 ? 100.0 : 0.0);

            $weeks[] = [
                'week' => $weekLabel,
                'cost' => $weekCost,
                'gmv' => $weekGmv,
                'views' => $weekViews,
                'roi' => $weekRoi,
            ];

            $current->addWeek();
        }

        return $weeks;
    }

    /**
     * Xóa cache báo cáo để làm mới số liệu ngay lập tức
     */
    public static function clearReportCache(?int $campaignId = null): void
    {
        // Khi dùng array/redis cache, ta có thể xóa các key chính
        Cache::forget("report_leaderboard:v2:{$campaignId}:10");
        Cache::forget("report_leaderboard:v2:{$campaignId}:50");
    }
}
