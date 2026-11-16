<?php

namespace Modules\Report\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MonthlyBreakdownSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize, WithColumnFormatting
{
    public function __construct(
        protected array $monthlyData,
        protected ?string $campaignName = null,
        protected ?int $year = null
    ) {}

    public function title(): string
    {
        return 'Báo Cáo Theo Tháng';
    }

    public function array(): array
    {
        $currentYear = $this->year ?: (int) date('Y');
        $rows = [
            ['BÁO CÁO TỔNG HỢP HIỆU QUẢ VÀ ROI THEO TỪNG THÁNG'],
            ['Chiến dịch:', $this->campaignName ?? 'Tất cả chiến dịch'],
            ['Năm thống kê:', "Năm {$currentYear}"],
            ['Ngày xuất báo cáo:', date('d/m/Y H:i:s')],
            [''],
            [
                'Tháng',
                'Số KOC mới',
                'KOC chốt deal',
                'Mẫu đã gửi',
                'Video hoàn thành',
                'Chi phí Booking',
                'Chi phí Mẫu thực tế',
                'TỔNG CHI PHÍ',
                'Lượt xem (Views)',
                'DOANH THU (GMV)',
                'LỢI NHUẬN RÒNG',
                'TỶ LỆ ROI (%)',
                'CPV (đ/view)',
            ]
        ];

        foreach ($this->monthlyData as $m) {
            $rows[] = [
                $m['month_name'] ?? '',
                $m['kocs_count'] ?? 0,
                $m['agreed_count'] ?? 0,
                $m['samples_sent_count'] ?? 0,
                $m['posted_count'] ?? 0,
                $m['booking_cost'] ?? 0,
                $m['sample_cost'] ?? 0,
                $m['total_cost'] ?? 0,
                $m['views_count'] ?? 0,
                $m['gmv_amount'] ?? 0,
                $m['net_profit'] ?? 0,
                ($m['roi_percentage'] ?? 0) / 100,
                $m['cpv'] ?? 0,
            ];
        }

        return $rows;
    }

    public function columnFormats(): array
    {
        return [
            'B' => '#,##0',
            'C' => '#,##0',
            'D' => '#,##0',
            'E' => '#,##0',
            'F' => '#,##0 "đ"',
            'G' => '#,##0 "đ"',
            'H' => '#,##0 "đ"',
            'I' => '#,##0',
            'J' => '#,##0 "đ"',
            'K' => '#,##0 "đ"',
            'L' => '0.0%',
            'M' => '#,##0 "đ"',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->mergeCells('A1:M1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1E293B');

        $sheet->getStyle('A6:M6')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A6:M6')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4F46E5');
        $sheet->getStyle('A6:M6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        return [];
    }
}
