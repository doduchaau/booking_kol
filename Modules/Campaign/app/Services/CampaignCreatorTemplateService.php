<?php

namespace Modules\Campaign\Services;

use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CampaignCreatorTemplateService
{
    protected string $templateRelativePath = 'templates/file_mau_import_koc_chien_dich.xlsx';

    /**
     * Lấy đường dẫn lưu file template chuẩn
     */
    public function getTemplatePath(): string
    {
        return storage_path('app/' . $this->templateRelativePath);
    }

    /**
     * Trả về Binary File Download Response cho người dùng
     */
    public function downloadTemplate(): BinaryFileResponse
    {
        $path = $this->getTemplatePath();

        if (!file_exists($path)) {
            $this->generateTemplateFile($path);
        }

        return response()->download($path, 'file_mau_import_koc_chien_dich.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Tạo file Excel mẫu chuẩn tích hợp Dropdown native và hướng dẫn đa kênh
     */
    public function generateTemplateFile(?string $outputPath = null): string
    {
        $path = $outputPath ?: $this->getTemplatePath();
        $dir = dirname($path);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Danh sách KOC');

        // Định nghĩa 20 cột theo các nhóm màu trực quan
        $headers = [
            'A' => ['title' => "Họ và tên KOC (*)", 'width' => 24, 'bg' => '4F46E5'],
            'B' => ['title' => "Số điện thoại (*)", 'width' => 18, 'bg' => '4F46E5'],
            'C' => ['title' => "Email", 'width' => 24, 'bg' => '4F46E5'],

            // Kênh chính (Kênh 1)
            'D' => ['title' => "Nền tảng 1 (*)", 'width' => 16, 'bg' => '0284C7'],
            'E' => ['title' => "ID / Handle 1 (*)", 'width' => 20, 'bg' => '0284C7'],
            'F' => ['title' => "Link kênh 1", 'width' => 34, 'bg' => '0284C7'],
            'G' => ['title' => "Followers 1", 'width' => 16, 'bg' => '0284C7'],

            // Kênh phụ 2
            'H' => ['title' => "Nền tảng 2", 'width' => 16, 'bg' => '0D9488'],
            'I' => ['title' => "ID / Handle 2", 'width' => 20, 'bg' => '0D9488'],
            'J' => ['title' => "Link kênh 2", 'width' => 34, 'bg' => '0D9488'],
            'K' => ['title' => "Followers 2", 'width' => 16, 'bg' => '0D9488'],

            // Kênh phụ 3
            'L' => ['title' => "Nền tảng 3", 'width' => 16, 'bg' => '7C3AED'],
            'M' => ['title' => "ID / Handle 3", 'width' => 20, 'bg' => '7C3AED'],
            'N' => ['title' => "Link kênh 3", 'width' => 34, 'bg' => '7C3AED'],
            'O' => ['title' => "Followers 3", 'width' => 16, 'bg' => '7C3AED'],

            // Thông số chiến dịch & Gửi mẫu
            'P' => ['title' => "Ngành hàng (Niche)", 'width' => 20, 'bg' => 'EA580C'],
            'Q' => ['title' => "Phân hạng (Tier)", 'width' => 18, 'bg' => 'EA580C'],
            'R' => ['title' => "Phí booking (VND)", 'width' => 22, 'bg' => 'EA580C'],
            'S' => ['title' => "Địa chỉ nhận mẫu", 'width' => 38, 'bg' => 'EA580C'],
            'T' => ['title' => "Ghi chú riêng", 'width' => 32, 'bg' => 'EA580C'],
        ];

        $sheet->getRowDimension(1)->setRowHeight(34);

        foreach ($headers as $col => $info) {
            $cell = $col . '1';
            $sheet->setCellValue($cell, $info['title']);
            $sheet->getColumnDimension($col)->setWidth($info['width']);

            $sheet->getStyle($cell)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11, 'name' => 'Segoe UI'],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $info['bg']]],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true,
                ],
            ]);
        }

        // 3 Dòng dữ liệu mẫu thực tế
        $samples = [
            [
                'Nguyễn Quỳnh Nhi', '0987654321', 'quynhnhi@gmail.com',
                'tiktok', '@nhinnhinn', 'https://www.tiktok.com/@nhinnhinn', 150000,
                'shopee', 'nhinnhin_beauty', 'https://shopee.vn/nhinnhin_beauty', 25000,
                'facebook', 'quynhnhi.official', 'https://facebook.com/quynhnhi.official', 45000,
                'beauty', 'micro', 2500000, '123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'Thích nhận size M, cam kết lên video đúng hạn',
            ],
            [
                'Trần Mạnh Hùng', '0912345678', 'manhhung98@gmail.com',
                'tiktok', '@manhhungstore98', 'https://www.tiktok.com/@manhhungstore98', 85000,
                '', '', '', null,
                '', '', '', null,
                'tech', 'micro', 1800000, '45 Cầu Giấy, P. Quan Hoa, Cầu Giấy, Hà Nội', 'Ưu tiên review đồ gia dụng thông minh',
            ],
            [
                'Lê Thu Hương', '0909123456', '',
                'shopee', 'shopnhahuong', 'https://shopee.vn/shopnhahuong', 32000,
                'tiktok', '@huongle.fashion', 'https://www.tiktok.com/@huongle.fashion', 18000,
                '', '', '', null,
                'fashion', 'nano', 0, '78 Lê Lợi, TP. Đà Nẵng', 'Nhận mẫu theo hình thức Affiliate (phí 0đ)',
            ],
        ];

        $rowIdx = 2;
        $colLetters = range('A', 'T');
        foreach ($samples as $row) {
            $sheet->getRowDimension($rowIdx)->setRowHeight(26);
            foreach ($row as $idx => $val) {
                $col = $colLetters[$idx];
                $sheet->setCellValue($col . $rowIdx, $val);
            }
            $rowIdx++;
        }

        // Cài đặt Data Validation Dropdown cho các dòng từ 2 đến 300
        $platformsList = '"tiktok,shopee,facebook,youtube,instagram"';
        $nichesList = '"beauty,fashion,food,tech,lifestyle,general"';
        $tiersList = '"nano,micro,macro,mega"';

        for ($r = 2; $r <= 300; $r++) {
            // Dropdown Nền tảng 1, 2, 3 (D, H, L)
            foreach (['D', 'H', 'L'] as $pCol) {
                $val = $sheet->getCell($pCol . $r)->getDataValidation();
                $val->setType(DataValidation::TYPE_LIST);
                $val->setErrorStyle(DataValidation::STYLE_INFORMATION);
                $val->setAllowBlank(true);
                $val->setShowDropDown(true);
                $val->setShowInputMessage(true);
                $val->setPromptTitle('Chọn nền tảng');
                $val->setPrompt('Bấm mũi tên để chọn: tiktok, shopee, facebook, youtube, instagram');
                $val->setFormula1($platformsList);
            }

            // Dropdown Ngành hàng Niche (P)
            $valP = $sheet->getCell('P' . $r)->getDataValidation();
            $valP->setType(DataValidation::TYPE_LIST);
            $valP->setShowDropDown(true);
            $valP->setFormula1($nichesList);

            // Dropdown Phân hạng Tier (Q)
            $valQ = $sheet->getCell('Q' . $r)->getDataValidation();
            $valQ->setType(DataValidation::TYPE_LIST);
            $valQ->setShowDropDown(true);
            $valQ->setFormula1($tiersList);
        }

        // Định dạng viền (Border) và Font chữ
        $sheet->getStyle('A2:T4')->applyFromArray([
            'font' => ['name' => 'Segoe UI', 'size' => 10],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
            ],
        ]);

        // Căn lề và định dạng số cho dễ đọc
        $sheet->getStyle('A2:A300')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle('B2:B300')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('D2:D300')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('H2:H300')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('L2:L300')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('P2:Q300')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->getStyle('G2:G300')->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle('K2:K300')->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle('O2:O300')->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle('R2:R300')->getNumberFormat()->setFormatCode('#,##0');

        // Sheet 2: Hướng dẫn & Quy chuẩn
        $guideSheet = $spreadsheet->createSheet();
        $guideSheet->setTitle('Hướng dẫn & Quy chuẩn');
        $guideSheet->setCellValue('A1', 'QUY CHUẨN NHẬP LIỆU FILE MẪU KOC VÀO CHIẾN DỊCH');
        $guideSheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new Color('4F46E5'));

        $guides = [
            [
                'Mục tiêu',
                'Nhập danh sách KOC trực tiếp vào chiến dịch, đồng thời tự động đồng bộ vào Kho KOC CRM chung của hệ thống.',
            ],
            [
                '1. Quy chuẩn Đa Kênh (1 KOC nhiều nền tảng)',
                "Hệ thống hỗ trợ 2 cách nhập linh hoạt cho KOC đa kênh:\n" .
                "• Cách 1 (Điền ngang trên 1 dòng): Nhập Kênh 1 (TikTok) + Kênh 2 (Shopee) + Kênh 3 (Facebook) trên cùng một hàng.\n" .
                "• Cách 2 (Điền dọc nhiều dòng): Dán danh sách nhiều dòng, các dòng có cùng Số điện thoại hoặc Họ tên sẽ được hệ thống tự động gộp tất cả kênh vào 1 hồ sơ KOC duy nhất.",
            ],
            [
                '2. Mũi tên Dropdown chọn sẵn',
                "Các cột sau có sẵn danh sách thả xuống (chỉ cần bấm vào ô để chọn):\n" .
                "• Nền tảng 1, 2, 3: tiktok | shopee | facebook | youtube | instagram\n" .
                "• Ngành hàng (Niche): beauty | fashion | food | tech | lifestyle | general\n" .
                "• Phân hạng (Tier): nano | micro | macro | mega (để trống hệ thống sẽ tự tính theo Followers)",
            ],
            [
                '3. Cơ chế Khử trùng & Xác nhận (Conflict Resolution)',
                "Trước khi lưu vào database, hệ thống sẽ tự động quét trùng theo SĐT và ID kênh:\n" .
                "• Nếu KOC đã có trong CRM: Hệ thống sẽ hiển thị thông báo để bạn chọn (Cập nhật thêm kênh mới hoặc Giữ nguyên).\n" .
                "• Nếu KOC đã có trong Chiến dịch này: Hệ thống cảnh báo để bạn chọn Bỏ qua (tránh đè tiến độ) hoặc cập nhật phí mới.",
            ],
            [
                '4. Phí booking và Nhân viên phụ trách',
                "• Phí booking: Nếu KOC có deal giá riêng, điền vào cột [Phí booking]. Nếu để trống hoặc ghi 0, hệ thống tự động áp dụng mức phí mặc định bạn điền ở form chiến dịch.\n" .
                "• Nhân viên phụ trách: Sẽ nhận bàn giao các KOC này để theo dõi tiến độ gửi mẫu và lên video.",
            ],
            [
                '5. Cổng KOC Portal bảo mật',
                'Mỗi KOC sau khi import vào chiến dịch sẽ được cấp tự động 1 liên kết Portal riêng (hạn 14 ngày) để KOC tự xác nhận và cập nhật địa chỉ nhận sản phẩm mẫu.',
            ],
        ];

        $gRow = 3;
        foreach ($guides as $g) {
            $guideSheet->setCellValue('A' . $gRow, $g[0]);
            $guideSheet->setCellValue('B' . $gRow, $g[1]);
            $guideSheet->getStyle('A' . $gRow)->getFont()->setBold(true)->setSize(11);
            $guideSheet->getStyle('B' . $gRow)->getAlignment()->setWrapText(true);
            $guideSheet->getRowDimension($gRow)->setRowHeight(36);
            $gRow += 2;
        }
        $guideSheet->getColumnDimension('A')->setWidth(38);
        $guideSheet->getColumnDimension('B')->setWidth(90);

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);
        $writer->save($path);

        return $path;
    }
}
