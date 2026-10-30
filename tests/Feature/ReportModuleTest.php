<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Report\Exports\CampaignRoiExport;
use Modules\Report\Services\ReportCalculationService;
use Tests\TestCase;

class ReportModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-30 10:00:00');
    }

    protected function createCampaign(array $overrides = []): Campaign
    {
        return Campaign::create(array_merge([
            'name' => 'Chiến Dịch Báo Cáo ROI',
            'product_name' => 'Kem Dưỡng Da Ban Đêm',
            'budget' => 50000000,
            'target_creators_count' => 20,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => 1,
        ], $overrides));
    }

    protected function createCreator(array $overrides = []): Creator
    {
        return Creator::create(array_merge([
            'name' => 'Creator Test',
            'phone' => '0988' . rand(100000, 999999),
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ], $overrides));
    }

    public function test_report_service_calculates_funnel_metrics_accurately(): void
    {
        $campaign = $this->createCampaign();
        $creator1 = $this->createCreator(['name' => 'KOC 1']);
        $creator2 = $this->createCreator(['name' => 'KOC 2']);
        $creator3 = $this->createCreator(['name' => 'KOC 3']);

        // Creator 1: new
        CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator1->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 1000000,
        ]);

        // Creator 2: agreed
        CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator2->id,
            'status' => PipelineStatusEnum::AGREED,
            'contacted_at' => now()->subDays(3),
            'agreed_at' => now()->subDays(2),
            'booking_fee' => 2000000,
        ]);

        // Creator 3: posted
        $cc3 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator3->id,
            'status' => PipelineStatusEnum::POSTED,
            'contacted_at' => now()->subDays(5),
            'agreed_at' => now()->subDays(4),
            'sample_received_at' => now()->subDays(3),
            'posted_at' => now()->subDay(),
            'booking_fee' => 3000000,
        ]);

        ContentPost::create([
            'campaign_creator_id' => $cc3->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@koc3/video/123456',
            'views_count' => 50000,
            'likes_count' => 2500,
            'gmv_amount' => 15000000,
            'status' => 'approved',
            'posted_at' => now()->subDay(),
        ]);

        $service = app(ReportCalculationService::class);
        $funnel = $service->getFunnelMetrics($campaign->id);

        $this->assertEquals(3, $funnel['total_candidates']);
        $this->assertEquals(1, $funnel['total_posted']);

        // Check steps count
        $steps = collect($funnel['steps'])->keyBy('stage');
        $this->assertEquals(3, $steps['new']['count']);
        $this->assertEquals(2, $steps['contacted']['count']);
        $this->assertEquals(2, $steps['agreed']['count']);
        $this->assertEquals(1, $steps['sample_received']['count']);
        $this->assertEquals(1, $steps['posted']['count']);
    }

    public function test_report_service_calculates_financial_roi_and_cpv_accurately(): void
    {
        $campaign = $this->createCampaign();
        $creator = $this->createCreator();

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::POSTED,
            'booking_fee' => 2000000, // 2 triệu VND
            'sample_sent_at' => now()->subDays(4),
            'sample_received_at' => now()->subDays(3),
            'posted_at' => now()->subDays(1),
        ]);

        ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@koc/video/999888',
            'views_count' => 100000, // 100k views
            'likes_count' => 5000,
            'gmv_amount' => 10000000, // 10 triệu GMV
            'status' => 'approved',
            'posted_at' => now()->subDays(1),
        ]);

        $service = app(ReportCalculationService::class);
        $financial = $service->getFinancialRoiMetrics($campaign->id);

        // Booking cost = 2.000.000, Sample cost = 150.000 -> Total cost = 2.150.000
        $this->assertEquals(2000000, $financial['total_booking_cost']);
        $this->assertEquals(150000, $financial['total_sample_cost']);
        $this->assertEquals(2150000, $financial['total_cost']);

        // Views = 100.000, GMV = 10.000.000
        $this->assertEquals(100000, $financial['total_views']);
        $this->assertEquals(10000000, $financial['total_gmv']);

        // Net profit = 10.000.000 - 2.150.000 = 7.850.000
        $this->assertEquals(7850000, $financial['net_profit']);

        // ROI % = (7.850.000 / 2.150.000) * 100 = ~365.12%
        $this->assertGreaterThan(300, $financial['roi_percentage']);

        // CPV = 2.150.000 / 100.000 = 21.5 VND / view
        $this->assertEquals(21.5, $financial['cpv']);
    }

    public function test_report_service_returns_creator_leaderboard_and_staff_performance(): void
    {
        $campaign = $this->createCampaign();
        $staff = User::factory()->create(['name' => 'Nguyễn Nhân Viên']);
        $creator = $this->createCreator(['name' => 'KOC Hot Viral']);
        CreatorAccount::create([
            'creator_id' => $creator->id,
            'platform' => 'tiktok',
            'handle' => '@kochotviral',
            'url' => 'https://tiktok.com/@kochotviral',
            'followers_count' => 200000,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $staff->id,
            'status' => PipelineStatusEnum::POSTED,
            'booking_fee' => 1500000,
            'contacted_at' => now()->subDays(5),
            'agreed_at' => now()->subDays(4),
            'sample_sent_at' => now()->subDays(3),
            'posted_at' => now()->subDay(),
        ]);

        ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@kochotviral/video/111',
            'views_count' => 80000,
            'gmv_amount' => 5000000,
            'status' => 'approved',
            'posted_at' => now()->subDay(),
        ]);

        $service = app(ReportCalculationService::class);
        $leaderboard = $service->getCreatorLeaderboard($campaign->id);
        $staffPerf = $service->getStaffPerformance($campaign->id);

        $this->assertNotEmpty($leaderboard['top_views']);
        $this->assertEquals('KOC Hot Viral', $leaderboard['top_views'][0]['name']);
        $this->assertEquals(80000, $leaderboard['top_views'][0]['views_count']);

        $this->assertNotEmpty($staffPerf);
        $staffItem = collect($staffPerf)->firstWhere('staff_id', $staff->id);
        $this->assertNotNull($staffItem);
        $this->assertEquals(1, $staffItem['total_assigned']);
        $this->assertEquals(1, $staffItem['posted_count']);
        $this->assertEquals(100.0, $staffItem['completion_rate']);
    }

    public function test_reports_web_endpoints_render_and_export_excel(): void
    {
        $user = User::factory()->create();
        $campaign = $this->createCampaign(['name' => 'Chiến Dịch Mỹ Phẩm Hè']);

        // 1. Test Index route
        $response = $this->actingAs($user)->get(route('reports.index', ['campaign_id' => $campaign->id]));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Report/Index')
            ->has('funnel')
            ->has('financial')
            ->has('leaderboard')
            ->has('staffPerformance')
        );

        // 2. Test Excel Export route
        Excel::fake();
        $exportResponse = $this->actingAs($user)->get(route('reports.export', ['campaign_id' => $campaign->id]));
        $exportResponse->assertOk();

        Excel::assertDownloaded('Bao_Cao_ROI_Booking_KOL_chien_dich_my_pham_he_' . date('Ymd_His') . '.xlsx', function (CampaignRoiExport $export) {
            return true;
        });
    }
}
