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

class CreatorLeaderboardSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize, WithColumnFormatting
{
    public function __construct(
        protected array $leaderboard
    ) {}

    public function title(): string
    {
        return 'Top Creator (Leaderboard)';
    }

    public function array(): array
    {
        $rows = [
            ['BẢNG XẾP HẠNG HIỆU QUẢ CREATOR / KOC'],
            ['Ngày xuất:', date('d/m/Y H:i:s')],
            [''],
            [
                'Hạng',
                'Tên Creator',
                'Tài khoản / Handle',
                'Nền tảng',
                'Phân hạng (Tier)',
                'Số video',
                'Tổng lượt xem (Views)',
                'Doanh thu (GMV)',
                'Chi phí Booking',
                'Chi phí / View (CPV)',
                'Tỷ lệ ROI (%)',
                'Chiến dịch'
            ]
        ];

        $list = !empty($this->leaderboard['top_views']) ? $this->leaderboard['top_views'] : ($this->leaderboard['top_gmv'] ?? []);

        foreach ($list as $item) {
            $rows[] = [
                $item['rank'] ?? '-',
                $item['name'] ?? '',
                $item['handle'] ?? '',
                strtoupper($item['platform'] ?? ''),
                strtoupper($item['tier'] ?? ''),
                $item['videos_count'] ?? 0,
                $item['views_count'] ?? 0,
                $item['gmv_amount'] ?? 0,
                $item['booking_fee'] ?? 0,
                $item['cpv'] ?? 0,
                ($item['roi_percentage'] ?? 0) / 100,
                $item['campaign_name'] ?? '',
            ];
        }

        return $rows;
    }

    public function columnFormats(): array
    {
        return [
            'G' => '#,##0',
            'H' => '#,##0 "đ"',
            'I' => '#,##0 "đ"',
            'J' => '#,##0 "đ"',
            'K' => '0.0%',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->mergeCells('A1:L1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1E293B');

        // Header
        $sheet->getStyle('A4:L4')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A4:L4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4F46E5');
        $sheet->getStyle('A4:L4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        return [];
    }
}

