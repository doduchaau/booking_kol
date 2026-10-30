<?php

namespace Modules\Report\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Modules\Report\Services\ReportCalculationService;

class CampaignRoiExport implements WithMultipleSheets
{
    public function __construct(
        protected ?int $campaignId = null,
        protected ?array $dateRange = null,
        protected ?string $campaignName = null
    ) {}

    public function sheets(): array
    {
        $service = app(ReportCalculationService::class);
        $financial = $service->getFinancialRoiMetrics($this->campaignId, $this->dateRange);
        $funnel = $service->getFunnelMetrics($this->campaignId, $this->dateRange);
        $leaderboard = $service->getCreatorLeaderboard($this->campaignId, 50);
        $staff = $service->getStaffPerformance($this->campaignId, $this->dateRange);

        return [
            new Sheets\OverviewReportSheet($financial, $funnel, $this->campaignName),
            new Sheets\CreatorLeaderboardSheet($leaderboard),
            new Sheets\StaffPerformanceSheet($staff),
        ];
    }
}

