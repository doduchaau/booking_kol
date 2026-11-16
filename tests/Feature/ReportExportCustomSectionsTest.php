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
use Modules\Campaign\Models\CampaignCreatorProduct;
use Modules\Campaign\Models\CampaignProduct;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Report\Exports\CampaignRoiExport;
use Modules\Report\Exports\Sheets\KocVideoDetailsSheet;
use Modules\Report\Exports\Sheets\MonthlyBreakdownSheet;
use Modules\Report\Exports\Sheets\OverviewReportSheet;
use Modules\Report\Services\ReportCalculationService;
use Tests\TestCase;

class ReportExportCustomSectionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-16 14:00:00');
    }

    protected function createFullCampaignData(): array
    {
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Đông 2026',
            'product_name' => 'Áo Khoác Dạ',
            'budget' => 80000000,
            'target_creators_count' => 15,
            'start_date' => '2026-11-01',
            'end_date' => '2026-11-30',
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => 1,
            'video_deadline_days' => 5,
        ]);

        $product = CampaignProduct::create([
            'campaign_id' => $campaign->id,
            'name' => 'Áo Khoác Dạ Be Hàn Quốc',
            'retail_price' => 450000,
            'sku' => 'AKD-01',
        ]);

        $creator = Creator::create([
            'name' => 'Lê Thanh Thảo',
            'phone' => '0912345678',
            'niche' => 'fashion',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 100,
        ]);

        CreatorAccount::create([
            'creator_id' => $creator->id,
            'platform' => 'tiktok',
            'handle' => '@thao_fashion',
            'url' => 'https://tiktok.com/@thao_fashion',
            'followers_count' => 120000,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::POSTED,
            'booking_fee' => 3000000,
            'sample_sent_at' => '2026-11-05 09:00:00',
            'sample_received_at' => '2026-11-08 14:00:00',
            'posted_at' => '2026-11-12 18:30:00',
        ]);

        CampaignCreatorProduct::create([
            'campaign_creator_id' => $cc->id,
            'campaign_product_id' => $product->id,
            'quantity_assigned' => 2,
            'quantity_sent' => 2,
            'sample_status' => 'received',
            'sent_at' => '2026-11-05 09:00:00',
            'received_at' => '2026-11-08 14:00:00',
        ]);

        $post = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@thao_fashion/video/987654321',
            'video_title' => 'Review Áo Khoác Dạ Đi Đà Lạt Siêu Xinh',
            'views_count' => 85000,
            'likes_count' => 4200,
            'comments_count' => 350,
            'shares_count' => 120,
            'gmv_amount' => 18000000,
            'status' => 'approved',
            'posted_at' => '2026-11-12 18:30:00',
        ]);

        return compact('campaign', 'product', 'creator', 'cc', 'post');
    }

    /**
     * Test 1: Kiểm tra tính toán chi phí mẫu thật từ bảng campaign_creator_products (450k * 2 = 900k)
     */
    public function test_service_calculates_real_sample_cost_from_creator_products(): void
    {
        $data = $this->createFullCampaignData();
        $service = app(ReportCalculationService::class);

        $financial = $service->getFinancialRoiMetrics($data['campaign']->id);

        // Chi phí booking = 3.000.000đ
        $this->assertEquals(3000000, $financial['total_booking_cost']);

        // Chi phí mẫu THẬT = 2 cái * 450.000đ = 900.000đ (KHÔNG PHẢI 150k hardcode)
        $this->assertEquals(900000, $financial['total_sample_cost']);
        $this->assertEquals(3900000, $financial['total_cost']);

        $this->assertEquals(85000, $financial['total_views']);
        $this->assertEquals(18000000, $financial['total_gmv']);
    }

    /**
     * Test 2: Chi tiết video và ngày lên video của từng KOC chính xác
     */
    public function test_service_returns_accurate_koc_video_details(): void
    {
        $data = $this->createFullCampaignData();
        $service = app(ReportCalculationService::class);

        $videoDetails = $service->getKocVideoPerformanceDetails($data['campaign']->id);

        $this->assertCount(1, $videoDetails);
        $first = $videoDetails[0];

        $this->assertEquals('Lê Thanh Thảo', $first['creator_name']);
        $this->assertEquals('@thao_fashion', $first['handle']);
        $this->assertEquals('TIKTOK', $first['platform']);
        $this->assertEquals('https://www.tiktok.com/@thao_fashion/video/987654321', $first['post_url']);
        $this->assertEquals('Review Áo Khoác Dạ Đi Đà Lạt Siêu Xinh', $first['video_title']);
        $this->assertEquals('12/11/2026 18:30', $first['posted_at']);
        $this->assertEquals(85000, $first['views_count']);
        $this->assertEquals(18000000, $first['gmv_amount']);
        $this->assertEquals(3000000, $first['booking_fee']);
        $this->assertEquals(900000, $first['sample_cost']);
        $this->assertEquals(3900000, $first['total_cost']);
        $this->assertEquals('Đúng hạn', $first['delivery_status']);
    }

    /**
     * Test 3: Xuất báo cáo theo tháng tải đúng tên file theo tháng
     */
    public function test_export_report_by_month_generates_correct_file_name(): void
    {
        $user = User::factory()->create();
        $data = $this->createFullCampaignData();

        Excel::fake();

        $response = $this->actingAs($user)->get(route('reports.export', [
            'campaign_id' => $data['campaign']->id,
            'month' => 11,
            'year' => 2026,
            'sections' => 'overview,koc_videos',
        ]));

        $response->assertOk();

        // Tên file phải theo định dạng Bao_Cao_Booking_KOL_Thang_11_2026_{slug}.xlsx
        $expectedFileName = 'Bao_Cao_Booking_KOL_Thang_11_2026_chien_dich_dong_2026.xlsx';
        Excel::assertDownloaded($expectedFileName, function (CampaignRoiExport $export) {
            $sheets = $export->sheets();
            $this->assertCount(2, $sheets);
            $this->assertInstanceOf(OverviewReportSheet::class, $sheets[0]);
            $this->assertInstanceOf(KocVideoDetailsSheet::class, $sheets[1]);
            return true;
        });
    }

    /**
     * Test 4: Xuất báo cáo chỉ chọn duy nhất sheet Chi Tiết Video KOC
     */
    public function test_export_report_with_only_koc_videos_section(): void
    {
        $user = User::factory()->create();
        $data = $this->createFullCampaignData();

        Excel::fake();

        $response = $this->actingAs($user)->get(route('reports.export', [
            'campaign_id' => $data['campaign']->id,
            'sections' => 'koc_videos',
        ]));

        $response->assertOk();

        $expectedFileName = 'Bao_Cao_Booking_KOL_Toan_Bo_' . date('Ymd') . '_chien_dich_dong_2026.xlsx';
        Excel::assertDownloaded($expectedFileName, function (CampaignRoiExport $export) {
            $sheets = $export->sheets();
            $this->assertCount(1, $sheets);
            $this->assertInstanceOf(KocVideoDetailsSheet::class, $sheets[0]);
            $this->assertEquals('Chi Tiết Video & KOC', $sheets[0]->title());
            return true;
        });
    }

    /**
     * Test 5: Màn hình /reports trả về props videoDetails và filters month/year
     */
    public function test_reports_index_page_returns_video_details_and_month_filter(): void
    {
        $user = User::factory()->create();
        $data = $this->createFullCampaignData();

        $response = $this->actingAs($user)->get(route('reports.index', [
            'campaign_id' => $data['campaign']->id,
            'month' => 11,
            'year' => 2026,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Report/Index')
            ->where('filters.month', 11)
            ->where('filters.year', 2026)
            ->has('videoDetails')
            ->where('videoDetails.0.creator_name', 'Lê Thanh Thảo')
            ->where('videoDetails.0.views_count', 85000)
        );
    }

    /**
     * Test 6: Kiểm tra render nhị phân file Excel thực tế không vướng lỗi PhpSpreadsheet
     */
    public function test_export_renders_binary_spreadsheet_without_styling_errors(): void
    {
        $data = $this->createFullCampaignData();

        $export = new CampaignRoiExport(
            campaignId: $data['campaign']->id,
            dateRange: ['start_date' => '2026-11-01', 'end_date' => '2026-11-30'],
            campaignName: $data['campaign']->name,
            sections: ['overview', 'monthly_breakdown', 'koc_videos', 'leaderboard', 'staff_performance', 'cost_reconciliation'],
            periodLabel: 'Tháng 11/2026'
        );

        $binary = Excel::raw($export, \Maatwebsite\Excel\Excel::XLSX);
        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('PK', $binary);
    }
}
