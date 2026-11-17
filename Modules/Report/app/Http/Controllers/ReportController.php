<?php

namespace Modules\Report\Http\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
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

        $month = $request->filled('month') ? (int) $request->input('month') : null;
        $year = $request->filled('year') ? (int) $request->input('year') : null;
        $filterType = $request->input('filter_type', $month ? 'month' : 'date_range');

        // Xử lý khoảng thời gian lọc
        if ($month && $year) {
            $startDate = Carbon::create($year, $month, 1)->startOfMonth()->toDateString();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();
            $periodLabel = "Tháng " . str_pad($month, 2, '0', STR_PAD_LEFT) . "/{$year}";
        } else {
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $periodLabel = ($startDate && $endDate)
                ? (Carbon::parse($startDate)->format('d/m/Y') . ' - ' . Carbon::parse($endDate)->format('d/m/Y'))
                : 'Toàn thời gian';
        }

        $dateRange = [
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];

        $campaigns = Campaign::query()
            ->select('id', 'name', 'product_name', 'status', 'budget')
            ->orderByDesc('id')
            ->get();

        // 1. Phễu chuyển đổi & chỉ số tài chính thật 100%
        $funnelMetrics = $this->reportService->getFunnelMetrics($campaignId, $dateRange);
        $financialMetrics = $this->reportService->getFinancialRoiMetrics($campaignId, $dateRange);

        // 2. Bảng vinh danh Top Creator (nhận dateRange thực tế)
        $leaderboard = $this->reportService->getCreatorLeaderboard($campaignId, $dateRange, 10);

        // 3. Năng suất nhân viên
        $staffPerformance = $this->reportService->getStaffPerformance($campaignId, $dateRange);

        // 4. Danh sách video KOC chi tiết (để xem trực tiếp hoặc hỗ trợ modal)
        $videoDetails = $this->reportService->getKocVideoPerformanceDetails($campaignId, $dateRange);

        // 5. So sánh hiệu quả đa kênh (TikTok vs Shopee Video vs Facebook Reels)
        $platformComparison = $this->reportService->getPlatformComparisonMetrics($campaignId, $dateRange);

        $selectedCampaign = $campaignId ? $campaigns->firstWhere('id', $campaignId) : null;

        return Inertia::render('Report/Index', [
            'campaigns' => $campaigns,
            'selectedCampaign' => $selectedCampaign,
            'filters' => [
                'campaign_id' => $campaignId,
                'filter_type' => $filterType,
                'month' => $month,
                'year' => $year,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'period_label' => $periodLabel,
            ],
            'funnel' => $funnelMetrics,
            'financial' => $financialMetrics,
            'leaderboard' => $leaderboard,
            'staffPerformance' => $staffPerformance,
            'videoDetails' => $videoDetails,
            'platformComparison' => $platformComparison,
        ]);
    }

    /**
     * Xuất báo cáo Excel tùy chỉnh linh hoạt theo sections & theo tháng
     */
    public function export(Request $request): BinaryFileResponse
    {
        $campaignId = $request->filled('campaign_id') ? (int) $request->input('campaign_id') : null;

        $month = $request->filled('month') ? (int) $request->input('month') : null;
        $year = $request->filled('year') ? (int) $request->input('year') : null;

        if ($month && $year) {
            $startDate = Carbon::create($year, $month, 1)->startOfMonth()->toDateString();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();
            $periodLabel = "Tháng " . str_pad($month, 2, '0', STR_PAD_LEFT) . "/{$year} (" . Carbon::parse($startDate)->format('d/m/Y') . ' - ' . Carbon::parse($endDate)->format('d/m/Y') . ")";
            $fileTimeSlug = 'Thang_' . str_pad($month, 2, '0', STR_PAD_LEFT) . "_{$year}";
        } else {
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            if ($startDate && $endDate) {
                $periodLabel = Carbon::parse($startDate)->format('d/m/Y') . ' - ' . Carbon::parse($endDate)->format('d/m/Y');
                $fileTimeSlug = Carbon::parse($startDate)->format('Ymd') . '_' . Carbon::parse($endDate)->format('Ymd');
            } else {
                $periodLabel = 'Toàn thời gian';
                $fileTimeSlug = 'Toan_Bo_' . date('Ymd');
            }
        }

        $dateRange = [
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];

        // Xử lý danh sách sections muốn xuất
        $sectionsInput = $request->input('sections');
        if (is_string($sectionsInput)) {
            $sections = array_filter(explode(',', $sectionsInput));
        } elseif (is_array($sectionsInput)) {
            $sections = array_filter($sectionsInput);
        } else {
            $sections = ['overview', 'monthly_breakdown', 'koc_videos', 'leaderboard', 'staff_performance', 'cost_reconciliation'];
        }

        $campaign = $campaignId ? Campaign::find($campaignId) : null;
        $campaignSlug = $campaign ? '_' . Str::slug($campaign->name, '_') : '_Tat_Ca_Chien_Dich';
        $filename = "Bao_Cao_Booking_KOL_{$fileTimeSlug}{$campaignSlug}.xlsx";

        return Excel::download(
            new CampaignRoiExport(
                campaignId: $campaignId,
                dateRange: $dateRange,
                campaignName: $campaign?->name,
                sections: $sections,
                periodLabel: $periodLabel,
                year: $year
            ),
            $filename
        );
    }
}
