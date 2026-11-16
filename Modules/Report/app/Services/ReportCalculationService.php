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
     * Lấy version cache hiện tại (hỗ trợ mọi Cache driver: Redis, File, Database, Array)
     */
    protected static function getCacheVersion(?int $campaignId = null): int
    {
        $scope = $campaignId ? "campaign_{$campaignId}" : 'global';
        return (int) Cache::get("report_cache_ver:{$scope}", 1);
    }

    /**
     * Xóa cache báo cáo (tự động kích hoạt khi có thay đổi trạng thái Pipeline, duyệt video hoặc đồng bộ GMV)
     */
    public static function flushReportCache(?int $campaignId = null): void
    {
        try {
            Cache::increment('report_cache_ver:global');
            if ($campaignId) {
                Cache::increment("report_cache_ver:campaign_{$campaignId}");
            }
        } catch (\Throwable $e) {
            Cache::put('report_cache_ver:global', time(), 86400 * 30);
            if ($campaignId) {
                Cache::put("report_cache_ver:campaign_{$campaignId}", time(), 86400 * 30);
            }
        }
    }

    /**
     * Thống kê phễu chuyển đổi (Funnel Metrics) sử dụng SQL Conditional Aggregation thuần:
     * Mới -> Đã liên hệ -> Chốt hợp tác -> Đã nhận mẫu -> Đã lên video
     */
    public function getFunnelMetrics(?int $campaignId = null, ?array $dateRange = null): array
    {
        $ver = self::getCacheVersion($campaignId);
        $cacheKey = "report_funnel:v3:{$ver}:{$campaignId}:" . md5(json_encode($dateRange));

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
                COUNT(CASE WHEN contacted_at IS NOT NULL OR status IN ('contacted', 'waiting_approval', 'agreed', 'address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed', 'declined', 'no_show') THEN 1 END) as count_contacted,
                COUNT(CASE WHEN agreed_at IS NOT NULL OR status IN ('agreed', 'address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed', 'no_show') THEN 1 END) as count_agreed,
                COUNT(CASE WHEN sample_received_at IS NOT NULL OR status IN ('sample_received', 'posted', 'completed', 'no_show') THEN 1 END) as count_sample_received,
                COUNT(CASE WHEN posted_at IS NOT NULL OR status IN ('posted', 'completed') OR EXISTS (SELECT 1 FROM content_posts cp WHERE cp.campaign_creator_id = campaign_creators.id AND cp.deleted_at IS NULL) THEN 1 END) as count_posted,
                COUNT(CASE WHEN status = 'declined' THEN 1 END) as count_declined,
                COUNT(CASE WHEN status = 'no_show' THEN 1 END) as count_no_show
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

            // Xác định điểm nghẽn lớn nhất trong phễu
            $drops = [
                'contacted' => ['name' => 'Liên hệ KOC', 'rate' => $step2['drop_rate'], 'advice' => 'Tỷ lệ KOC không phản hồi cao. Gợi ý: Ưu tiên nhắn Zalo cá nhân trực tiếp và cá nhân hóa lời chào.'],
                'agreed' => ['name' => 'Đàm phán thù lao', 'rate' => $step3['drop_rate'], 'advice' => 'Tỷ lệ từ chối deal cao. Gợi ý: Kiểm tra lại mức thù lao booking so với thị trường hoặc bổ sung hoa hồng affiliate.'],
                'sample' => ['name' => 'Gửi & Nhận mẫu', 'rate' => $step4['drop_rate'], 'advice' => 'Tỷ lệ rớt khi nhận mẫu cao. Gợi ý: Nhắc KOC xác nhận địa chỉ sớm và phối hợp kho đóng hàng nhanh.'],
                'posted' => ['name' => 'Sản xuất video', 'rate' => $step5['drop_rate'], 'advice' => 'Tỷ lệ nợ video sau nhận mẫu cao. Gợi ý: Tăng cường gửi tin nhắn nhắc nhở Zalo 1-chạm khi còn 2 ngày đến hạn.'],
            ];

            $biggestDropKey = 'contacted';
            $maxDrop = -1;
            foreach ($drops as $key => $d) {
                if ($d['rate'] > $maxDrop) {
                    $maxDrop = $d['rate'];
                    $biggestDropKey = $key;
                }
            }

            $biggestDropStage = $drops[$biggestDropKey]['name'];
            $bottleneckAdvice = $countNew > 0 && $maxDrop > 0
                ? $drops[$biggestDropKey]['advice']
                : 'Quy trình vận hành phễu đang rất tốt và đồng đều.';

            // Phân tích chuyển đổi theo Phân hạng KOC (Tier: Nano, Micro, Macro, Celeb)
            $tierQuery = CampaignCreator::query()
                ->join('creators', 'creators.id', '=', 'campaign_creators.creator_id')
                ->whereNull('campaign_creators.deleted_at')
                ->whereNull('creators.deleted_at');

            if ($campaignId) {
                $tierQuery->where('campaign_creators.campaign_id', $campaignId);
            }
            if (!empty($dateRange['start_date'])) {
                $tierQuery->whereDate('campaign_creators.created_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $tierQuery->whereDate('campaign_creators.created_at', '<=', $dateRange['end_date']);
            }

            $tierStats = $tierQuery->selectRaw("
                COALESCE(creators.tier, 'nano') as tier,
                COUNT(*) as total_kocs,
                COUNT(CASE WHEN campaign_creators.posted_at IS NOT NULL OR campaign_creators.status IN ('posted', 'completed') OR EXISTS (SELECT 1 FROM content_posts cp WHERE cp.campaign_creator_id = campaign_creators.id AND cp.deleted_at IS NULL) THEN 1 END) as posted_kocs,
                COALESCE(SUM(campaign_creators.booking_fee), 0) as total_fee
            ")->groupBy('creators.tier')->get();

            $tierConversion = $tierStats->map(function ($row) {
                $total = (int) $row->total_kocs;
                $posted = (int) $row->posted_kocs;
                $rate = $total > 0 ? round(($posted / $total) * 100, 1) : 0.0;
                return [
                    'tier' => (string) $row->tier,
                    'total_kocs' => $total,
                    'posted_kocs' => $posted,
                    'conversion_rate' => $rate,
                    'total_fee' => (float) $row->total_fee,
                ];
            })->values()->all();

            // Phân tích thời gian chu kỳ chuyển đổi trung bình (Cycle time - ngày)
            $isSqlite = DB::connection()->getDriverName() === 'sqlite';
            $cycleQuery = CampaignCreator::query()
                ->whereNull('campaign_creators.deleted_at');

            if ($campaignId) {
                $cycleQuery->where('campaign_creators.campaign_id', $campaignId);
            }
            if (!empty($dateRange['start_date'])) {
                $cycleQuery->whereDate('campaign_creators.created_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $cycleQuery->whereDate('campaign_creators.created_at', '<=', $dateRange['end_date']);
            }

            if ($isSqlite) {
                $cycleStats = $cycleQuery->selectRaw("
                    AVG(CASE WHEN agreed_at IS NOT NULL AND created_at IS NOT NULL THEN (julianday(agreed_at) - julianday(created_at)) END) as avg_days_to_agree,
                    AVG(CASE WHEN sample_received_at IS NOT NULL AND sample_sent_at IS NOT NULL THEN (julianday(sample_received_at) - julianday(sample_sent_at)) END) as avg_days_shipping,
                    AVG(CASE WHEN posted_at IS NOT NULL AND sample_received_at IS NOT NULL THEN (julianday(posted_at) - julianday(sample_received_at)) END) as avg_days_to_post
                ")->first();
            } else {
                $cycleStats = $cycleQuery->selectRaw("
                    AVG(CASE WHEN agreed_at IS NOT NULL AND created_at IS NOT NULL THEN DATEDIFF(agreed_at, created_at) END) as avg_days_to_agree,
                    AVG(CASE WHEN sample_received_at IS NOT NULL AND sample_sent_at IS NOT NULL THEN DATEDIFF(sample_received_at, sample_sent_at) END) as avg_days_shipping,
                    AVG(CASE WHEN posted_at IS NOT NULL AND sample_received_at IS NOT NULL THEN DATEDIFF(posted_at, sample_received_at) END) as avg_days_to_post
                ")->first();
            }

            return [
                'steps' => [$step1, $step2, $step3, $step4, $step5],
                'total_candidates' => $countNew,
                'total_posted' => $countPosted,
                'overall_conversion_rate' => $overallConversion,
                'drop_off_analysis' => [
                    'declined_count' => (int) ($stats->count_declined ?? 0),
                    'no_show_count' => (int) ($stats->count_no_show ?? 0),
                    'contact_drop_rate' => $step2['drop_rate'],
                    'agreed_drop_rate' => $step3['drop_rate'],
                    'sample_drop_rate' => $step4['drop_rate'],
                    'posted_drop_rate' => $step5['drop_rate'],
                    'biggest_drop_stage' => $biggestDropStage,
                    'bottleneck_advice' => $bottleneckAdvice,
                ],
                'tier_conversion' => $tierConversion,
                'cycle_time' => [
                    'avg_days_to_agree' => round(max(0, (float) ($cycleStats->avg_days_to_agree ?? 0)), 1),
                    'avg_days_shipping' => round(max(0, (float) ($cycleStats->avg_days_shipping ?? 0)), 1),
                    'avg_days_to_post' => round(max(0, (float) ($cycleStats->avg_days_to_post ?? 0)), 1),
                ],
            ];
        });
    }

    /**
     * Thống kê tài chính & Chỉ số ROI bằng SQL Aggregation với dữ liệu thực tế 100%
     */
    public function getFinancialRoiMetrics(?int $campaignId = null, ?array $dateRange = null): array
    {
        $ver = self::getCacheVersion($campaignId);
        $cacheKey = "report_financial:v4:{$ver}:{$campaignId}:" . md5(json_encode($dateRange));

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

            // 1. Tính chi phí sản phẩm mẫu THẬT từ campaign_creator_products join campaign_products (retail_price * quantity_sent)
            $sampleCostQuery = DB::table('campaign_creators')
                ->join('campaign_creator_products', 'campaign_creator_products.campaign_creator_id', '=', 'campaign_creators.id')
                ->join('campaign_products', 'campaign_products.id', '=', 'campaign_creator_products.campaign_product_id')
                ->whereNull('campaign_creators.deleted_at')
                ->where('campaign_creator_products.quantity_sent', '>', 0);

            if ($campaignId) {
                $sampleCostQuery->where('campaign_creators.campaign_id', $campaignId);
            }
            if (!empty($dateRange['start_date'])) {
                $sampleCostQuery->whereDate('campaign_creators.created_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $sampleCostQuery->whereDate('campaign_creators.created_at', '<=', $dateRange['end_date']);
            }

            $totalSampleCost = (float) $sampleCostQuery->sum(DB::raw('campaign_creator_products.quantity_sent * campaign_products.retail_price'));

            // Fallback chi phí mẫu: Nếu KOC đã gửi mẫu nhưng chưa phân bổ sản phẩm con chi tiết -> lấy theo retail_price của sản phẩm chiến dịch
            $creatorsWithoutProductsSent = DB::table('campaign_creators')
                ->whereNull('campaign_creators.deleted_at')
                ->where(function ($q) {
                    $q->whereNotNull('campaign_creators.sample_sent_at')
                      ->orWhereIn('campaign_creators.status', ['sample_sent', 'sample_received', 'posted', 'completed', 'no_show']);
                })
                ->whereNotExists(function ($sub) {
                    $sub->select(DB::raw(1))
                        ->from('campaign_creator_products')
                        ->whereColumn('campaign_creator_products.campaign_creator_id', 'campaign_creators.id')
                        ->where('campaign_creator_products.quantity_sent', '>', 0);
                });

            if ($campaignId) {
                $creatorsWithoutProductsSent->where('campaign_creators.campaign_id', $campaignId);
            }
            if (!empty($dateRange['start_date'])) {
                $creatorsWithoutProductsSent->whereDate('campaign_creators.created_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $creatorsWithoutProductsSent->whereDate('campaign_creators.created_at', '<=', $dateRange['end_date']);
            }

            $fallbackSampleCost = (float) $creatorsWithoutProductsSent
                ->leftJoin('campaign_products', function ($join) {
                    $join->on('campaign_products.campaign_id', '=', 'campaign_creators.campaign_id')
                         ->whereRaw('campaign_products.id = (SELECT id FROM campaign_products cp WHERE cp.campaign_id = campaign_creators.campaign_id ORDER BY sort_order ASC, id ASC LIMIT 1)');
                })
                ->sum(DB::raw('COALESCE(campaign_products.retail_price, 0)'));

            $totalSampleCost += $fallbackSampleCost;
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

            // Xu hướng theo tuần / tháng
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
     * Bảng xếp hạng Top Creator bằng SQL Group By + Limit với dữ liệu thực tế và lọc theo kỳ
     */
    public function getCreatorLeaderboard(?int $campaignId = null, ?array $dateRange = null, int $limit = 10): array
    {
        $ver = self::getCacheVersion($campaignId);
        $cacheKey = "report_leaderboard:v4:{$ver}:{$campaignId}:{$limit}:" . md5(json_encode($dateRange));

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $dateRange, $limit) {
            $baseQuery = CampaignCreator::query()
                ->join('creators', 'creators.id', '=', 'campaign_creators.creator_id')
                ->join('campaigns', 'campaigns.id', '=', 'campaign_creators.campaign_id')
                ->leftJoin('creator_accounts', function ($join) {
                    $join->on('creator_accounts.creator_id', '=', 'creators.id')
                        ->whereRaw('creator_accounts.id = (SELECT id FROM creator_accounts ca WHERE ca.creator_id = creators.id AND ca.deleted_at IS NULL LIMIT 1)');
                })
                ->leftJoin('content_posts', function ($join) use ($dateRange) {
                    $join->on('content_posts.campaign_creator_id', '=', 'campaign_creators.id')
                        ->whereNull('content_posts.deleted_at');
                    if (!empty($dateRange['start_date'])) {
                        $join->whereDate('content_posts.posted_at', '>=', $dateRange['start_date']);
                    }
                    if (!empty($dateRange['end_date'])) {
                        $join->whereDate('content_posts.posted_at', '<=', $dateRange['end_date']);
                    }
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
                'campaign_creators.campaign_id',
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
                COALESCE((
                    SELECT SUM(ccp.quantity_sent * cp.retail_price)
                    FROM campaign_creator_products ccp
                    JOIN campaign_products cp ON cp.id = ccp.campaign_product_id
                    WHERE ccp.campaign_creator_id = campaign_creators.id AND ccp.quantity_sent > 0
                ), (
                    SELECT CASE WHEN campaign_creators.sample_sent_at IS NOT NULL OR campaign_creators.status IN ('sample_sent', 'sample_received', 'posted', 'completed')
                        THEN COALESCE(cp2.retail_price, 0) ELSE 0 END
                    FROM campaign_products cp2
                    WHERE cp2.campaign_id = campaign_creators.campaign_id
                    ORDER BY cp2.sort_order ASC, cp2.id ASC LIMIT 1
                ), 0) as sample_cost,
                (campaign_creators.booking_fee + COALESCE((
                    SELECT SUM(ccp.quantity_sent * cp.retail_price)
                    FROM campaign_creator_products ccp
                    JOIN campaign_products cp ON cp.id = ccp.campaign_product_id
                    WHERE ccp.campaign_creator_id = campaign_creators.id AND ccp.quantity_sent > 0
                ), (
                    SELECT CASE WHEN campaign_creators.sample_sent_at IS NOT NULL OR campaign_creators.status IN ('sample_sent', 'sample_received', 'posted', 'completed')
                        THEN COALESCE(cp2.retail_price, 0) ELSE 0 END
                    FROM campaign_products cp2
                    WHERE cp2.campaign_id = campaign_creators.campaign_id
                    ORDER BY cp2.sort_order ASC, cp2.id ASC LIMIT 1
                ), 0)) as total_cost,
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
        $ver = self::getCacheVersion($campaignId);
        $cacheKey = "report_staff:v3:{$ver}:{$campaignId}:" . md5(json_encode($dateRange));

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
     * Danh sách chi tiết từng Video và KOC nghiệm thu với đầy đủ dữ liệu thực tế:
     * Tên KOC, Handle, Link video, Ngày lên video (posted_at), Deadline, Views, Likes, GMV, Chi phí...
     */
    public function getKocVideoPerformanceDetails(?int $campaignId = null, ?array $dateRange = null): array
    {
        $ver = self::getCacheVersion($campaignId);
        $cacheKey = "report_video_details:v1:{$ver}:{$campaignId}:" . md5(json_encode($dateRange));

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $dateRange) {
            $query = ContentPost::query()
                ->join('campaign_creators', 'campaign_creators.id', '=', 'content_posts.campaign_creator_id')
                ->join('creators', 'creators.id', '=', 'campaign_creators.creator_id')
                ->join('campaigns', 'campaigns.id', '=', 'campaign_creators.campaign_id')
                ->leftJoin('creator_accounts', function ($join) {
                    $join->on('creator_accounts.creator_id', '=', 'creators.id')
                        ->whereRaw('creator_accounts.id = (SELECT id FROM creator_accounts ca WHERE ca.creator_id = creators.id AND ca.deleted_at IS NULL LIMIT 1)');
                })
                ->leftJoin('users', 'users.id', '=', 'campaign_creators.assigned_to')
                ->whereNull('campaign_creators.deleted_at')
                ->whereNull('creators.deleted_at')
                ->whereNull('campaigns.deleted_at')
                ->whereNull('content_posts.deleted_at');

            if ($campaignId) {
                $query->where('campaign_creators.campaign_id', $campaignId);
            }

            if (!empty($dateRange['start_date'])) {
                $query->whereDate('content_posts.posted_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $query->whereDate('content_posts.posted_at', '<=', $dateRange['end_date']);
            }

            $posts = $query->select([
                'content_posts.id as post_id',
                'content_posts.post_url',
                'content_posts.video_title',
                'content_posts.platform as post_platform',
                'content_posts.posted_at',
                'content_posts.status as post_status',
                'content_posts.views_count',
                'content_posts.likes_count',
                'content_posts.comments_count',
                'content_posts.shares_count',
                'content_posts.gmv_amount',
                'content_posts.compliance_score',
                'content_posts.compliance_status',
                'campaign_creators.id as campaign_creator_id',
                'campaign_creators.booking_fee',
                'campaign_creators.sample_received_at',
                'campaign_creators.sample_sent_at',
                'campaign_creators.status as pipeline_status',
                'creators.name as creator_name',
                'creators.phone as creator_phone',
                'creators.tier as creator_tier',
                'creator_accounts.handle as creator_handle',
                'creator_accounts.platform as creator_platform',
                'campaigns.name as campaign_name',
                'campaigns.product_name',
                'campaigns.video_deadline_days',
                'users.name as staff_name',
            ])
            ->selectRaw("
                COALESCE((
                    SELECT SUM(ccp.quantity_sent * cp.retail_price)
                    FROM campaign_creator_products ccp
                    JOIN campaign_products cp ON cp.id = ccp.campaign_product_id
                    WHERE ccp.campaign_creator_id = campaign_creators.id AND ccp.quantity_sent > 0
                ), (
                    SELECT CASE WHEN campaign_creators.sample_sent_at IS NOT NULL OR campaign_creators.status IN ('sample_sent', 'sample_received', 'posted', 'completed')
                        THEN COALESCE(cp2.retail_price, 0) ELSE 0 END
                    FROM campaign_products cp2
                    WHERE cp2.campaign_id = campaign_creators.campaign_id
                    ORDER BY cp2.sort_order ASC, cp2.id ASC LIMIT 1
                ), 0) as sample_cost
            ")
            ->orderByDesc('content_posts.posted_at')
            ->orderByDesc('content_posts.id')
            ->get();

            return $posts->map(function ($post, $index) {
                $views = (int) $post->views_count;
                $gmv = (float) $post->gmv_amount;
                $bookingFee = (float) $post->booking_fee;
                $sampleCost = (float) $post->sample_cost;
                $totalCost = $bookingFee + $sampleCost;

                $cpv = $views > 0 ? round($totalCost / $views, 2) : 0.0;
                $roi = $totalCost > 0 ? round((($gmv - $totalCost) / $totalCost) * 100, 1) : 0.0;

                // Tính hạn chót lên video
                $deadlineDays = (int) ($post->video_deadline_days ?: 7);
                $deadline = null;
                if ($post->sample_received_at) {
                    $deadline = Carbon::parse($post->sample_received_at)->addDays($deadlineDays);
                } elseif ($post->sample_sent_at) {
                    $deadline = Carbon::parse($post->sample_sent_at)->addDays($deadlineDays + 3);
                }

                $postedAt = $post->posted_at ? Carbon::parse($post->posted_at) : null;
                $deliveryStatus = 'Đúng hạn';
                if ($deadline && $postedAt) {
                    if ($postedAt->gt($deadline)) {
                        $diffDays = $postedAt->diffInDays($deadline);
                        $deliveryStatus = 'Trễ hạn ' . ($diffDays > 0 ? $diffDays : 1) . ' ngày';
                    }
                }

                return [
                    'index' => $index + 1,
                    'post_id' => $post->post_id,
                    'creator_name' => $post->creator_name,
                    'creator_phone' => $post->creator_phone,
                    'handle' => $post->creator_handle ?: '@koc',
                    'platform' => strtoupper($post->post_platform ?: ($post->creator_platform ?: 'tiktok')),
                    'tier' => strtoupper($post->creator_tier ?: 'nano'),
                    'staff_name' => $post->staff_name ?: 'Chưa phân công',
                    'campaign_name' => $post->campaign_name,
                    'product_name' => $post->product_name ?: 'Sản phẩm chiến dịch',
                    'post_url' => $post->post_url,
                    'video_title' => $post->video_title ?: 'Video Review',
                    'posted_at' => $postedAt ? $postedAt->format('d/m/Y H:i') : 'Chưa đăng',
                    'deadline' => $deadline ? $deadline->format('d/m/Y') : 'Không có',
                    'delivery_status' => $deliveryStatus,
                    'post_status' => $post->post_status ?: 'published',
                    'views_count' => $views,
                    'likes_count' => (int) $post->likes_count,
                    'comments_count' => (int) $post->comments_count,
                    'shares_count' => (int) $post->shares_count,
                    'gmv_amount' => $gmv,
                    'booking_fee' => $bookingFee,
                    'sample_cost' => $sampleCost,
                    'total_cost' => $totalCost,
                    'cpv' => $cpv,
                    'roi_percentage' => $roi,
                ];
            })->all();
        });
    }

    /**
     * Báo cáo diễn biến hiệu quả 12 tháng trong năm (Monthly Breakdown)
     */
    public function getMonthlyBreakdown(?int $campaignId = null, ?int $year = null): array
    {
        $year = $year ?: (int) date('Y');
        $ver = self::getCacheVersion($campaignId);
        $cacheKey = "report_monthly_breakdown:v1:{$ver}:{$campaignId}:{$year}";

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $year) {
            $months = [];

            for ($m = 1; $m <= 12; $m++) {
                $startOfMonth = Carbon::create($year, $m, 1)->startOfMonth();
                $endOfMonth = Carbon::create($year, $m, 1)->endOfMonth();

                // Số KOC mới trong tháng
                $kocsQuery = CampaignCreator::query()
                    ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                    ->whereNull('deleted_at');
                if ($campaignId) {
                    $kocsQuery->where('campaign_id', $campaignId);
                }
                $kocsCount = $kocsQuery->count();

                // Số KOC chốt hợp tác trong tháng
                $agreedQuery = CampaignCreator::query()
                    ->whereBetween('agreed_at', [$startOfMonth, $endOfMonth])
                    ->whereNull('deleted_at');
                if ($campaignId) {
                    $agreedQuery->where('campaign_id', $campaignId);
                }
                $agreedCount = $agreedQuery->count();

                // Số mẫu gửi trong tháng
                $samplesSentQuery = CampaignCreator::query()
                    ->whereBetween('sample_sent_at', [$startOfMonth, $endOfMonth])
                    ->whereNull('deleted_at');
                if ($campaignId) {
                    $samplesSentQuery->where('campaign_id', $campaignId);
                }
                $samplesSentCount = $samplesSentQuery->count();

                // Chi phí booking trong tháng (theo KOC tạo hoặc chốt)
                $bookingFee = (float) $kocsQuery->sum('booking_fee');

                // Chi phí mẫu thật trong tháng
                $sampleCostQuery = DB::table('campaign_creators')
                    ->join('campaign_creator_products', 'campaign_creator_products.campaign_creator_id', '=', 'campaign_creators.id')
                    ->join('campaign_products', 'campaign_products.id', '=', 'campaign_creator_products.campaign_product_id')
                    ->whereNull('campaign_creators.deleted_at')
                    ->where('campaign_creator_products.quantity_sent', '>', 0)
                    ->whereBetween('campaign_creators.sample_sent_at', [$startOfMonth, $endOfMonth]);
                if ($campaignId) {
                    $sampleCostQuery->where('campaign_creators.campaign_id', $campaignId);
                }
                $sampleCost = (float) $sampleCostQuery->sum(DB::raw('campaign_creator_products.quantity_sent * campaign_products.retail_price'));

                $totalCost = $bookingFee + $sampleCost;

                // Video, views và GMV xuất bản trong tháng
                $postsQuery = ContentPost::query()
                    ->join('campaign_creators', 'campaign_creators.id', '=', 'content_posts.campaign_creator_id')
                    ->whereNull('campaign_creators.deleted_at')
                    ->whereNull('content_posts.deleted_at')
                    ->whereBetween('content_posts.posted_at', [$startOfMonth, $endOfMonth]);
                if ($campaignId) {
                    $postsQuery->where('campaign_creators.campaign_id', $campaignId);
                }

                $postStats = $postsQuery->selectRaw("
                    COUNT(content_posts.id) as posted_count,
                    COALESCE(SUM(content_posts.views_count), 0) as views_count,
                    COALESCE(SUM(content_posts.gmv_amount), 0) as gmv_amount
                ")->first();

                $postedCount = (int) ($postStats->posted_count ?? 0);
                $viewsCount = (int) ($postStats->views_count ?? 0);
                $gmvAmount = (float) ($postStats->gmv_amount ?? 0);
                $netProfit = $gmvAmount - $totalCost;
                $roi = $totalCost > 0 ? round(($netProfit / $totalCost) * 100, 1) : ($gmvAmount > 0 ? 100.0 : 0.0);
                $cpv = $viewsCount > 0 ? round($totalCost / $viewsCount, 2) : 0.0;

                $months[] = [
                    'month_number' => $m,
                    'month_name' => "Tháng " . str_pad($m, 2, '0', STR_PAD_LEFT) . "/{$year}",
                    'kocs_count' => $kocsCount,
                    'agreed_count' => $agreedCount,
                    'samples_sent_count' => $samplesSentCount,
                    'posted_count' => $postedCount,
                    'booking_cost' => $bookingFee,
                    'sample_cost' => $sampleCost,
                    'total_cost' => $totalCost,
                    'views_count' => $viewsCount,
                    'gmv_amount' => $gmvAmount,
                    'net_profit' => $netProfit,
                    'roi_percentage' => $roi,
                    'cpv' => $cpv,
                ];
            }

            return $months;
        });
    }

    /**
     * Bảng đối soát chi phí & thanh toán thù lao KOC phục vụ kế toán
     */
    public function getCostReconciliationDetails(?int $campaignId = null, ?array $dateRange = null): array
    {
        $ver = self::getCacheVersion($campaignId);
        $cacheKey = "report_cost_reconciliation:v1:{$ver}:{$campaignId}:" . md5(json_encode($dateRange));

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($campaignId, $dateRange) {
            $query = CampaignCreator::query()
                ->join('creators', 'creators.id', '=', 'campaign_creators.creator_id')
                ->join('campaigns', 'campaigns.id', '=', 'campaign_creators.campaign_id')
                ->leftJoin('users', 'users.id', '=', 'campaign_creators.assigned_to')
                ->whereNull('campaign_creators.deleted_at')
                ->whereNull('creators.deleted_at')
                ->whereNull('campaigns.deleted_at');

            if ($campaignId) {
                $query->where('campaign_creators.campaign_id', $campaignId);
            }

            if (!empty($dateRange['start_date'])) {
                $query->whereDate('campaign_creators.created_at', '>=', $dateRange['start_date']);
            }
            if (!empty($dateRange['end_date'])) {
                $query->whereDate('campaign_creators.created_at', '<=', $dateRange['end_date']);
            }

            $items = $query->select([
                'campaign_creators.id as campaign_creator_id',
                'campaign_creators.booking_fee',
                'campaign_creators.status',
                'campaign_creators.agreed_at',
                'campaign_creators.approved_cost_at',
                'campaign_creators.approver_name',
                'campaign_creators.notes',
                'creators.name as creator_name',
                'creators.phone as creator_phone',
                'creators.tier as creator_tier',
                'campaigns.name as campaign_name',
                'users.name as staff_name',
            ])
            ->selectRaw("
                (SELECT COUNT(cp.id) FROM content_posts cp WHERE cp.campaign_creator_id = campaign_creators.id AND cp.deleted_at IS NULL) as video_count,
                (SELECT MAX(cp.posted_at) FROM content_posts cp WHERE cp.campaign_creator_id = campaign_creators.id AND cp.deleted_at IS NULL) as latest_posted_at,
                (SELECT COALESCE(SUM(cp.gmv_amount), 0) FROM content_posts cp WHERE cp.campaign_creator_id = campaign_creators.id AND cp.deleted_at IS NULL) as total_gmv,
                COALESCE((
                    SELECT SUM(ccp.quantity_sent * cp.retail_price)
                    FROM campaign_creator_products ccp
                    JOIN campaign_products cp ON cp.id = ccp.campaign_product_id
                    WHERE ccp.campaign_creator_id = campaign_creators.id AND ccp.quantity_sent > 0
                ), (
                    SELECT CASE WHEN campaign_creators.sample_sent_at IS NOT NULL OR campaign_creators.status IN ('sample_sent', 'sample_received', 'posted', 'completed')
                        THEN COALESCE(cp2.retail_price, 0) ELSE 0 END
                    FROM campaign_products cp2
                    WHERE cp2.campaign_id = campaign_creators.campaign_id
                    ORDER BY cp2.sort_order ASC, cp2.id ASC LIMIT 1
                ), 0) as sample_cost,
                COALESCE((
                    SELECT SUM(ccp.quantity_sent)
                    FROM campaign_creator_products ccp
                    WHERE ccp.campaign_creator_id = campaign_creators.id AND ccp.quantity_sent > 0
                ), (CASE WHEN campaign_creators.sample_sent_at IS NOT NULL THEN 1 ELSE 0 END)) as samples_sent_count
            ")
            ->orderByDesc('campaign_creators.agreed_at')
            ->orderByDesc('campaign_creators.id')
            ->get();

            return $items->map(function ($item, $index) {
                $bookingFee = (float) $item->booking_fee;
                $sampleCost = (float) $item->sample_cost;
                $totalCost = $bookingFee + $sampleCost;
                $videoCount = (int) $item->video_count;

                $paymentStatus = 'Chưa chốt';
                if ($item->status === 'completed') {
                    $paymentStatus = 'Đã nghiệm thu (Sẵn sàng thanh toán)';
                } elseif ($videoCount > 0) {
                    $paymentStatus = 'Đã lên video (Chờ đối soát nghiệm thu)';
                } elseif ($item->agreed_at) {
                    $paymentStatus = 'Đã chốt thù lao (Chờ lên video)';
                }

                return [
                    'index' => $index + 1,
                    'creator_name' => $item->creator_name,
                    'creator_phone' => $item->creator_phone,
                    'creator_tier' => strtoupper($item->creator_tier ?: 'nano'),
                    'campaign_name' => $item->campaign_name,
                    'staff_name' => $item->staff_name ?: 'Chưa phân công',
                    'agreed_at' => $item->agreed_at ? Carbon::parse($item->agreed_at)->format('d/m/Y') : 'Chưa có',
                    'booking_fee' => $bookingFee,
                    'samples_sent_count' => (int) $item->samples_sent_count,
                    'sample_cost' => $sampleCost,
                    'total_cost' => $totalCost,
                    'video_count' => $videoCount,
                    'latest_posted_at' => $item->latest_posted_at ? Carbon::parse($item->latest_posted_at)->format('d/m/Y') : 'Chưa đăng',
                    'total_gmv' => (float) $item->total_gmv,
                    'payment_status' => $paymentStatus,
                    'approval_status' => $item->approved_cost_at ? 'Đã duyệt bởi ' . ($item->approver_name ?: 'Quản lý') : 'Chờ duyệt',
                    'notes' => $item->notes ?: '',
                ];
            })->all();
        });
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
