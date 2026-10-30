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

class StaffPerformanceSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize, WithColumnFormatting
{
    public function __construct(
        protected array $staff
    ) {}

    public function title(): string
    {
        return 'Năng Suất Nhân Viên';
    }

    public function array(): array
    {
        $rows = [
            ['BÁO CÁO NĂNG SUẤT VÀ TỶ LỆ HOÀN THÀNH CÔNG VIỆC NHÂN VIÊN BOOKING'],
            ['Ngày xuất:', date('d/m/Y H:i:s')],
            [''],
            [
                'Nhân viên',
                'Email',
                'Vai trò',
                'KOC được gán',
                'Đã liên hệ',
                'Đã chốt hợp tác',
                'Tỷ lệ chốt (%)',
                'Mẫu đã gửi',
                'Video hoàn thành',
                'Tỷ lệ hoàn thành (%)',
                'Tổng GMV tạo ra'
            ]
        ];

        foreach ($this->staff as $item) {
            $rows[] = [
                $item['staff_name'] ?? '',
                $item['staff_email'] ?? '',
                implode(', ', $item['roles'] ?? []),
                $item['total_assigned'] ?? 0,
                $item['contacted_count'] ?? 0,
                $item['agreed_count'] ?? 0,
                ($item['close_rate'] ?? 0) / 100,
                $item['samples_sent_count'] ?? 0,
                $item['posted_count'] ?? 0,
                ($item['completion_rate'] ?? 0) / 100,
                $item['total_gmv'] ?? 0,
            ];
        }

        return $rows;
    }

    public function columnFormats(): array
    {
        return [
            'D' => '#,##0',
            'E' => '#,##0',
            'F' => '#,##0',
            'G' => '0.0%',
            'H' => '#,##0',
            'I' => '#,##0',
            'J' => '0.0%',
            'K' => '#,##0 "đ"',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->mergeCells('A1:K1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1E293B');

        // Header
        $sheet->getStyle('A4:K4')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A4:K4')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4F46E5');
        $sheet->getStyle('A4:K4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        return [];
    }
}

