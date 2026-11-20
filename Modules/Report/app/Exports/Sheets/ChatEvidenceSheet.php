<?php

namespace Modules\Report\Exports\Sheets;

use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithDrawings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ChatEvidenceSheet implements FromArray, WithTitle, WithStyles, ShouldAutoSize, WithDrawings
{
    public function __construct(
        protected array $evidenceList,
        protected ?string $campaignName = null,
        protected ?string $periodLabel = null
    ) {}

    public function title(): string
    {
        return 'Bằng Chứng Trao Đổi KOC';
    }

    public function array(): array
    {
        $rows = [
            ['BẢNG ĐỐI SOÁT BẰNG CHỨNG & HÌNH ẢNH TRAO ĐỔI VỚI KOC'],
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
                'Người tải bằng chứng',
                'Ngày giờ tải',
                'Ghi chú đối soát / Nội dung tin nhắn',
                'Tên file gốc',
                'HÌNH ẢNH BẰNG CHỨNG (ĐỐI SOÁT)',
            ]
        ];

        foreach ($this->evidenceList as $item) {
            $rows[] = [
                $item['index'] ?? '',
                $item['creator_name'] ?? '',
                $item['creator_phone'] ?? '',
                $item['creator_tier'] ?? '',
                $item['campaign_name'] ?? '',
                $item['staff_name'] ?? '',
                $item['uploader_name'] ?? '',
                $item['created_at'] ?? '',
                $item['notes'] ?? '',
                $item['file_name'] ?? '',
                !empty($item['is_image']) ? '' : ('[Tài liệu: ' . ($item['file_name'] ?? 'File') . ']'),
            ];
        }

        if (empty($this->evidenceList)) {
            $rows[] = ['Không có bằng chứng nào được tải lên trong kỳ đối soát đã chọn.'];
        }

        return $rows;
    }

    public function drawings(): array
    {
        $drawings = [];
        $startRow = 7; // Dòng 1-5 là tiêu đề, Dòng 6 là Header bảng, Dữ liệu bắt đầu từ Dòng 7

        foreach ($this->evidenceList as $i => $item) {
            $currentRow = $startRow + $i;

            if (!empty($item['is_image']) && !empty($item['file_path'])) {
                $fullPath = Storage::disk('public')->path($item['file_path']);

                if (file_exists($fullPath)) {
                    $drawing = new Drawing();
                    $drawing->setName('Evidence_' . ($item['id'] ?? $i));
                    $drawing->setDescription($item['notes'] ?? 'Ảnh chụp màn hình đối soát');
                    $drawing->setPath($fullPath);
                    $drawing->setHeight(65);
                    $drawing->setCoordinates('K' . $currentRow);
                    $drawing->setOffsetX(12);
                    $drawing->setOffsetY(4);

                    $drawings[] = $drawing;
                }
            }
        }

        return $drawings;
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->mergeCells('A1:K1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1E293B');

        // Header bảng (Dòng 6)
        $sheet->getStyle('A6:K6')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A6:K6')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0D9488'); // Teal-600
        $sheet->getStyle('A6:K6')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Chiều rộng cố định cho cột ảnh K
        $sheet->getColumnDimension('K')->setWidth(26);

        // Căn lề và chỉnh chiều cao cho từng dòng dữ liệu
        $startRow = 7;
        $totalItems = count($this->evidenceList);

        for ($i = 0; $i < $totalItems; $i++) {
            $row = $startRow + $i;
            $item = $this->evidenceList[$i] ?? [];

            // Căn giữa STT, SĐT, Tier, Ngày tải
            $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("C{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("D{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("H{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("K{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Căn giữa theo chiều dọc
            $sheet->getStyle("A{$row}:K{$row}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            // Nếu có ảnh: đặt chiều cao dòng 72pt
            if (!empty($item['is_image'])) {
                $sheet->getRowDimension($row)->setRowHeight(72);
            } else {
                $sheet->getRowDimension($row)->setRowHeight(28);
            }
        }

        // Viền mỏng cho toàn bộ bảng
        if ($totalItems > 0) {
            $lastRow = $startRow + $totalItems - 1;
            $sheet->getStyle("A6:K{$lastRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('CBD5E1');
        }

        return [];
    }
}
