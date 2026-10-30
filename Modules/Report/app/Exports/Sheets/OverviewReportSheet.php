<?php

namespace Modules\Report\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class OverviewReportSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize, WithColumnFormatting
{
    public function __construct(
        protected array $financial,
        protected array $funnel,
        protected ?string $campaignName = null
    ) {}

    public function title(): string
    {
        return 'Tổng Quan & ROI';
    }

    public function array(): array
    {
        $rows = [
            ['BÁO CÁO TỔNG QUAN HIỆU QUẢ VÀ ROI CHIẾN DỊCH BOOKING KOL/KOC'],
            ['Chiến dịch:', $this->campaignName ?? 'Tất cả chiến dịch'],
            ['Ngày xuất báo cáo:', date('d/m/Y H:i:s')],
            [''],
            ['I. CHỈ SỐ TÀI CHÍNH & HIỆU SUẤT ĐẦU TƯ (ROI)'],
            ['Chỉ số', 'Giá trị', 'Đơn vị', 'Ghi chú'],
            ['Tổng chi phí booking KOC', $this->financial['total_booking_cost'], 'VND', 'Thù lao booking thỏa thuận'],
            ['Tổng chi phí sản phẩm mẫu thử', $this->financial['total_sample_cost'], 'VND', 'Ước tính định mức gửi mẫu'],
            ['TỔNG CHI PHÍ THỰC HIỆN', $this->financial['total_cost'], 'VND', 'Chi phí booking + chi phí mẫu thử'],
            ['TỔNG DOANH THU (GMV)', $this->financial['total_gmv'], 'VND', 'Doanh thu phát sinh từ toàn bộ video'],
            ['LỢI NHUẬN RÒNG (GMV - CHI PHÍ)', $this->financial['net_profit'], 'VND', 'Chênh lệch doanh thu và chi phí'],
            ['TỶ LỆ LỢI NHUẬN ĐẦU TƯ (ROI)', $this->financial['roi_percentage'] / 100, '%', '((GMV - Chi phí) / Chi phí) * 100'],
            ['Tổng lượt xem đạt được', $this->financial['total_views'], 'Lượt xem', 'Tổng views từ các video'],
            ['Tổng lượt thích (Likes)', $this->financial['total_likes'], 'Lượt thích', 'Tổng tương tác likes'],
            ['Tổng số video nghiệm thu', $this->financial['total_videos'], 'Video', 'Số video đã lên và duyệt'],
            ['CHI PHÍ TRÊN MỖI LƯỢT XEM (CPV)', $this->financial['cpv'], 'VND/view', 'Tổng chi phí / Tổng lượt xem'],
            [''],
            ['II. PHỄU CHUYỂN ĐỔI KOC (PIPELINE FUNNEL)'],
            ['Giai đoạn tiếp cận', 'Số lượng KOC', 'Tỷ lệ chuyển đổi (%)', 'Tỷ lệ hao hụt (%)'],
        ];

        foreach ($this->funnel['steps'] as $step) {
            $rows[] = [
                $step['name'],
                $step['count'],
                $step['conversion_rate'] / 100,
                $step['drop_rate'] / 100,
            ];
        }

        $rows[] = [''];
        $rows[] = ['Tỷ lệ chuyển đổi tổng thể (Mới -> Lên video):', $this->funnel['overall_conversion_rate'] / 100];

        return $rows;
    }

    public function columnFormats(): array
    {
        return [
            'B' => '#,##0 "đ"',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Tiêu đề chính
        $sheet->mergeCells('A1:D1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1E293B');
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);

        // Header các phần
        $sheet->getStyle('A5')->getFont()->setBold(true)->setSize(11)->getColor()->setRGB('4F46E5');
        $sheet->getStyle('A18')->getFont()->setBold(true)->setSize(11)->getColor()->setRGB('4F46E5');

        // Bảng 1 Header
        $sheet->getStyle('A6:D6')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A6:D6')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4F46E5');

        // Bảng 2 Header
        $sheet->getStyle('A19:D19')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A19:D19')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4F46E5');

        // Định dạng % cho các dòng ROI và Funnel
        $sheet->getStyle('B12')->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle('C20:D24')->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle('B26')->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle('B13:B15')->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle('B20:B24')->getNumberFormat()->setFormatCode('#,##0');

        return [];
    }
}

