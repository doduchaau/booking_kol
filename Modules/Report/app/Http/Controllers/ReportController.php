<?php

namespace Modules\Report\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Campaign\Models\Campaign;
use Modules\Report\Exports\CampaignRoiExport;
use Modules\Report\Services\ReportCalculationService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportController extends Controller
{
    public function __construct(
        protected ReportCalculationService $reportService
    ) {}

    /**
     * Màn hình Báo cáo & Phân tích ROI
     */
    public function index(Request $request): Response
    {
        $campaignId = $request->filled('campaign_id') ? (int) $request->input('campaign_id') : null;
        $dateRange = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
        ];

        $campaigns = Campaign::query()
            ->select('id', 'name', 'product_name', 'status', 'budget')
            ->orderByDesc('id')
            ->get();

        $funnelMetrics = $this->reportService->getFunnelMetrics($campaignId, $dateRange);
        $financialMetrics = $this->reportService->getFinancialRoiMetrics($campaignId, $dateRange);
        $leaderboard = $this->reportService->getCreatorLeaderboard($campaignId, 10);
        $staffPerformance = $this->reportService->getStaffPerformance($campaignId, $dateRange);

        $selectedCampaign = $campaignId ? $campaigns->firstWhere('id', $campaignId) : null;

        return Inertia::render('Report/Index', [
            'campaigns' => $campaigns,
            'selectedCampaign' => $selectedCampaign,
            'filters' => [
                'campaign_id' => $campaignId,
                'start_date' => $dateRange['start_date'],
                'end_date' => $dateRange['end_date'],
            ],
            'funnel' => $funnelMetrics,
            'financial' => $financialMetrics,
            'leaderboard' => $leaderboard,
            'staffPerformance' => $staffPerformance,
        ]);
    }

    /**
     * Xuất báo cáo Excel 1-click
     */
    public function export(Request $request): BinaryFileResponse
    {
        $campaignId = $request->filled('campaign_id') ? (int) $request->input('campaign_id') : null;
        $dateRange = [
            'start_date' => $request->input('start_date'),
            'end_date' => $request->input('end_date'),
        ];

        $campaign = $campaignId ? Campaign::find($campaignId) : null;
        $campaignSlug = $campaign ? '_' . Str::slug($campaign->name, '_') : '_Toan_Bo';
        $filename = 'Bao_Cao_ROI_Booking_KOL' . $campaignSlug . '_' . date('Ymd_His') . '.xlsx';

        return Excel::download(
            new CampaignRoiExport($campaignId, $dateRange, $campaign?->name),
            $filename
        );
    }
}
