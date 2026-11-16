<?php

namespace Modules\Report\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Cell\Hyperlink;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class KocVideoDetailsSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize, WithColumnFormatting
{
    public function __construct(
        protected array $videoDetails,
        protected ?string $campaignName = null,
        protected ?string $periodLabel = null
    ) {}

    public function title(): string
    {
        return 'Chi Tiết Video & KOC';
    }

    public function array(): array
    {
        $rows = [
            ['BÁO CÁO CHI TIẾT VIDEO NGHIỆM THU & NGÀY LÊN BÀI TỪNG KOC'],
            ['Chiến dịch:', $this->campaignName ?? 'Tất cả chiến dịch'],
            ['Kỳ báo cáo:', $this->periodLabel ?? 'Toàn thời gian'],
            ['Ngày xuất báo cáo:', date('d/m/Y H:i:s')],
            [''],
            [
                'STT',
                'Tên KOC / Creator',
                'Tài khoản / Handle',
                'Nền tảng',
                'Phân hạng (Tier)',
                'Nhân viên phụ trách',
                'Chiến dịch',
                'Sản phẩm phân bổ',
                'Link Video MXH',
                'Tiêu đề / Caption Video',
                'Ngày lên video thực tế',
                'Hạn chót nghiệm thu',
                'Tiến độ lên bài',
                'Lượt xem (Views)',
                'Lượt thích (Likes)',
                'Lượt bình luận',
                'Lượt chia sẻ',
                'Doanh thu (GMV)',
                'Phí booking KOC',
                'Chi phí mẫu thực tế',
                'Tổng chi phí KOC',
                'Chi phí / View (CPV)',
                'Tỷ lệ ROI (%)',
            ]
        ];

        foreach ($this->videoDetails as $item) {
            $rows[] = [
                $item['index'] ?? '',
                $item['creator_name'] ?? '',
                $item['handle'] ?? '',
                $item['platform'] ?? '',
                $item['tier'] ?? '',
                $item['staff_name'] ?? '',
                $item['campaign_name'] ?? '',
                $item['product_name'] ?? '',
                $item['post_url'] ?? '',
                $item['video_title'] ?? '',
                $item['posted_at'] ?? 'Chưa đăng',
                $item['deadline'] ?? 'Không có',
                $item['delivery_status'] ?? '',
                $item['views_count'] ?? 0,
                $item['likes_count'] ?? 0,
                $item['comments_count'] ?? 0,
                $item['shares_count'] ?? 0,
                $item['gmv_amount'] ?? 0,
                $item['booking_fee'] ?? 0,
                $item['sample_cost'] ?? 0,
                $item['total_cost'] ?? 0,
                $item['cpv'] ?? 0,
                ($item['roi_percentage'] ?? 0) / 100,
            ];
        }

        if (empty($this->videoDetails)) {
            $rows[] = ['Không có video nào phát sinh trong kỳ báo cáo đã chọn.'];
        }

        return $rows;
    }

    public function columnFormats(): array
    {
        return [
            'N' => '#,##0',
            'O' => '#,##0',
            'P' => '#,##0',
            'Q' => '#,##0',
            'R' => '#,##0 "đ"',
            'S' => '#,##0 "đ"',
            'T' => '#,##0 "đ"',
            'U' => '#,##0 "đ"',
            'V' => '#,##0 "đ"',
            'W' => '0.0%',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Tiêu đề chính
        $sheet->mergeCells('A1:W1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1E293B');
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);

        // Header bảng
        $sheet->getStyle('A6:W6')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A6:W6')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('4F46E5');
        $sheet->getStyle('A6:W6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Đặt liên kết click Hyperlink cho cột I (Link Video)
        $rowCount = count($this->videoDetails);
        for ($i = 0; $i < $rowCount; $i++) {
            $rowNum = $i + 7;
            $url = $this->videoDetails[$i]['post_url'] ?? '';
            if (!empty($url) && filter_var($url, FILTER_VALIDATE_URL)) {
                $sheet->getCell("I{$rowNum}")->getHyperlink()->setUrl($url);
                $font = $sheet->getStyle("I{$rowNum}")->getFont();
                $font->getColor()->setRGB('2563EB');
                $font->setUnderline(true);
            }
        }

        return [];
    }
}
