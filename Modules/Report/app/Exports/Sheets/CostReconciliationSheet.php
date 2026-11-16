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

class CostReconciliationSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize, WithColumnFormatting
{
    public function __construct(
        protected array $reconciliationData,
        protected ?string $campaignName = null,
        protected ?string $periodLabel = null
    ) {}

    public function title(): string
    {
        return 'Đối Soát Chi Phí & Thù Lao';
    }

    public function array(): array
    {
        $rows = [
            ['BẢNG ĐỐI SOÁT CHI PHÍ BOOKING & QUY TRÌNH THANH TOÁN THÙ LAO KOC'],
            ['Chiến dịch:', $this->campaignName ?? 'Tất cả chiến dịch'],
            ['Kỳ đối soát:', $this->periodLabel ?? 'Toàn thời gian'],
            ['Ngày xuất báo cáo:', date('d/m/Y H:i:s')],
            [''],
            [
                'STT',
                'Tên KOC / Creator',
                'Số điện thoại',
                'Phân hạng (Tier)',
                'Chiến dịch',
                'Nhân viên phụ trách',
                'Ngày chốt hợp tác',
                'Thù lao Booking (VND)',
                'Số mẫu đã gửi',
                'Chi phí mẫu thực tế (VND)',
                'TỔNG CHI PHÍ THỰC HIỆN',
                'Số video đã nghiệm thu',
                'Ngày lên video mới nhất',
                'Tổng GMV tạo ra',
                'Duyệt chi phí',
                'Trạng thái thanh toán thù lao',
                'Ghi chú',
            ]
        ];

        foreach ($this->reconciliationData as $item) {
            $rows[] = [
                $item['index'] ?? '',
                $item['creator_name'] ?? '',
                $item['creator_phone'] ?? '',
                $item['creator_tier'] ?? '',
                $item['campaign_name'] ?? '',
                $item['staff_name'] ?? '',
                $item['agreed_at'] ?? 'Chưa chốt',
                $item['booking_fee'] ?? 0,
                $item['samples_sent_count'] ?? 0,
                $item['sample_cost'] ?? 0,
                $item['total_cost'] ?? 0,
                $item['video_count'] ?? 0,
                $item['latest_posted_at'] ?? 'Chưa đăng',
                $item['total_gmv'] ?? 0,
                $item['approval_status'] ?? '',
                $item['payment_status'] ?? '',
                $item['notes'] ?? '',
            ];
        }

        if (empty($this->reconciliationData)) {
            $rows[] = ['Không có dữ liệu đối soát nào trong kỳ đã chọn.'];
        }

        return $rows;
    }

    public function columnFormats(): array
    {
        return [
            'H' => '#,##0 "đ"',
            'I' => '#,##0',
            'J' => '#,##0 "đ"',
            'K' => '#,##0 "đ"',
            'L' => '#,##0',
            'N' => '#,##0 "đ"',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->mergeCells('A1:Q1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1E293B');

        $sheet->getStyle('A6:Q6')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A6:Q6')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4F46E5');
        $sheet->getStyle('A6:Q6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        return [];
    }
}
