<?php

namespace Modules\Report\Exports;

use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Modules\Report\Services\ReportCalculationService;

class CampaignRoiExport implements WithMultipleSheets
{
    /**
     * @param int|null $campaignId
     * @param array|null $dateRange ['start_date' => ..., 'end_date' => ...]
     * @param string|null $campaignName
     * @param array $sections Các phần được chọn xuất: ['overview', 'monthly_breakdown', 'koc_videos', 'leaderboard', 'staff_performance', 'cost_reconciliation']
     * @param string|null $periodLabel
     * @param int|null $year
     */
    public function __construct(
        protected ?int $campaignId = null,
        protected ?array $dateRange = null,
        protected ?string $campaignName = null,
        protected array $sections = [],
        protected ?string $periodLabel = null,
        protected ?int $year = null
    ) {
        // Nếu không truyền sections cụ thể, mặc định xuất tất cả các phần thông dụng
        if (empty($this->sections)) {
            $this->sections = ['overview', 'koc_videos', 'leaderboard', 'staff_performance'];
        }
    }

    public function sheets(): array
    {
        $service = app(ReportCalculationService::class);
        $sheets = [];

        // Xác định năm cho monthly breakdown
        $year = $this->year;
        if (!$year && !empty($this->dateRange['start_date'])) {
            $year = (int) Carbon::parse($this->dateRange['start_date'])->year;
        }
        $year = $year ?: (int) date('Y');

        // 1. Sheet Tổng Quan & ROI
        if (in_array('overview', $this->sections)) {
            $financial = $service->getFinancialRoiMetrics($this->campaignId, $this->dateRange);
            $funnel = $service->getFunnelMetrics($this->campaignId, $this->dateRange);
            $sheets[] = new Sheets\OverviewReportSheet($financial, $funnel, $this->campaignName, $this->periodLabel);
        }

        // 2. Sheet Báo Cáo Theo Tháng (Monthly Breakdown)
        if (in_array('monthly_breakdown', $this->sections)) {
            $monthlyData = $service->getMonthlyBreakdown($this->campaignId, $year);
            $sheets[] = new Sheets\MonthlyBreakdownSheet($monthlyData, $this->campaignName, $year);
        }

        // 3. Sheet Chi Tiết Video & KOC (KocVideoDetailsSheet) - Trọng tâm theo dõi nghiệm thu
        if (in_array('koc_videos', $this->sections)) {
            $videoDetails = $service->getKocVideoPerformanceDetails($this->campaignId, $this->dateRange);
            $sheets[] = new Sheets\KocVideoDetailsSheet($videoDetails, $this->campaignName, $this->periodLabel);
        }

        // 4. Sheet Bảng Vinh Danh Top Creator
        if (in_array('leaderboard', $this->sections)) {
            $leaderboard = $service->getCreatorLeaderboard($this->campaignId, $this->dateRange, 50);
            $sheets[] = new Sheets\CreatorLeaderboardSheet($leaderboard, $this->periodLabel);
        }

        // 5. Sheet Năng Suất Đội Ngũ Booking
        if (in_array('staff_performance', $this->sections)) {
            $staff = $service->getStaffPerformance($this->campaignId, $this->dateRange);
            $sheets[] = new Sheets\StaffPerformanceSheet($staff, $this->periodLabel);
        }

        // 6. Sheet Đối Soát Chi Phí & Kế Toán
        if (in_array('cost_reconciliation', $this->sections)) {
            $reconciliation = $service->getCostReconciliationDetails($this->campaignId, $this->dateRange);
            $sheets[] = new Sheets\CostReconciliationSheet($reconciliation, $this->campaignName, $this->periodLabel);
        }

        // Fallback an toàn: nếu không có sheet nào được kích hoạt, nạp sheet Overview
        if (empty($sheets)) {
            $financial = $service->getFinancialRoiMetrics($this->campaignId, $this->dateRange);
            $funnel = $service->getFunnelMetrics($this->campaignId, $this->dateRange);
            $sheets[] = new Sheets\OverviewReportSheet($financial, $funnel, $this->campaignName, $this->periodLabel);
        }

        return $sheets;
    }
}
