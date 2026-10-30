# Hướng Dẫn Thực Thi Giao Diện Nghiệp Vụ (UI Implementation Guidelines)

> [!IMPORTANT]
> **Hệ Thống Thiết Kế Dùng Chung (Single Source of Truth)**:
> Mọi quy chuẩn về Bố cục dùng chung (`AppLayout`), Bảng màu Enterprise SaaS, Typography tiếng Việt, Design Tokens và Thư viện Thành phần dùng chung (`Button`, `Badge`, `DataTable`, `FormField`, `Modal`...) được đặc tả chi tiết tại [references/design-system.md](./design-system.md). Tất cả các module phải tuân thủ tuyệt đối tài liệu này, không tự chế layout hoặc màu sắc riêng.

Tài liệu này hướng dẫn chi tiết cách ứng dụng Design System vào từng màn hình nghiệp vụ cụ thể của 9 module trong dự án Booking KOL/KOC.

---

## 1. Cấu Trúc Khung Màn Hình (Screen Layout Integration)

Mọi trang của các module (`Creator`, `Campaign`, `Pipeline`, `Outreach`, `Shipment`, `Content`, `Report`, `Settings`) đều phải có cấu trúc cây component đồng nhất:

```tsx
import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import { Plus, Download } from 'lucide-react';

export default function ModuleScreenIndex({ ...props }) {
    return (
        <AppLayout title="Tiêu đề trang">
            {/* 1. Header chuẩn của trang */}
            <PageHeader
                title="Quản Lý Hồ Sơ Creator"
                description="Danh sách và thông tin liên hệ các KOL/KOC trong hệ thống"
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Creator CRM' },
                ]}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" iconLeft={<Download className="w-4 h-4" />}>
                            Xuất Excel
                        </Button>
                        <Button variant="primary" iconLeft={<Plus className="w-4 h-4" />}>
                            Thêm Creator Mới
                        </Button>
                    </div>
                }
            />

            {/* 2. Vùng nội dung nghiệp vụ */}
            <div className="mt-6">
                {/* DataTable, Kanban Board, Form hoặc Grid thẻ */}
            </div>
        </AppLayout>
    );
}
```

*Lưu ý riêng cho Cổng Creator Portal (`/p/{token}`)*: Sử dụng `GuestLayout` dạng thẻ đơn giữa màn hình (`max-w-xl mx-auto py-10 px-4`), nhưng bắt buộc áp dụng cùng các token `primary-600`, `FormField`, `Button` và `Badge` để đảm bảo nhận diện thương hiệu.

---

## 2. Quy Chuẩn Áp Dụng Cho Từng Module Nghiệp Vụ

### 2.1. Module Creator CRM (`Modules/Creator`)
- **Màn hình Danh sách (`Index.tsx`)**:
  - Dùng component `DataTable` kèm `FilterBar`.
  - Cột Avatar + Tên Creator + Handle chính nổi bật, có liên kết trực tiếp mở trang MXH (TikTok/FB/Insta) tab mới.
  - Phân hạng hiển thị bằng `Badge` chuẩn: `Nano` (Slate), `Micro` (Blue), `Macro` (Purple), `Mega` (Primary).
  - Điểm uy tín (Trust Score): Hiển thị thanh tiến trình mini hoặc badge màu xanh (>80), cam (50-80), đỏ (<50).
  - Creator bị Blacklist: Huy hiệu màu đỏ `bg-rose-100 text-rose-800` có icon `ShieldAlert`.
- **Màn hình Chi tiết (`Show.tsx`)**:
  - Chia 2 cột: Cột trái chứa thông tin định danh, rate card, tài khoản MXH; Cột phải chứa lịch sử hợp tác qua các chiến dịch và lịch sử gộp hồ sơ.
- **Màn hình Thêm / Sửa (`Create.tsx` / `Edit.tsx`)**:
  - Nhóm các trường vào từng thẻ `Card` riêng: "Thông tin cá nhân & Liên hệ", "Kênh mạng xã hội & Follower", "Báo giá tham khảo (Rate Card)".
  - Ô nhập SĐT tự động lọc ký tự lạ và cảnh báo ngay nếu phát hiện số đã tồn tại.

### 2.2. Module Chiến Dịch (`Modules/Campaign`)
- **Màn hình Danh sách Chiến dịch**: Dạng lưới thẻ (Card Grid) hoặc Bảng dữ liệu.
  - Mỗi thẻ hiển thị: Tên chiến dịch, Nhãn hàng / Sản phẩm, Ngân sách (VND), Thanh tiến độ Creator (ví dụ: `18/25 Creator đã chốt`), Trạng thái (Đang chạy, Đã kết thúc, Bản nháp).
- **Thanh chuyển Tab chiến dịch**: Dùng tab ngang chuẩn (`Border-b`) gồm: "Tổng quan", "Pipeline Kéo Thả", "Danh sách Creator", "Giao hàng", "Bài đăng / Video", "Báo cáo ROI".

### 2.3. Module Pipeline Kéo Thả (`Modules/Pipeline`)
- Sử dụng `@dnd-kit/core` và `@dnd-kit/sortable`.
- Chiều cao khung Kanban chiếm trọn màn hình còn lại (`h-[calc(100vh-14rem)]`), cuộn ngang độc lập.
- Thẻ Creator trên Kanban:
  - Hiển thị tên, ảnh đại diện, handle chính, mức thù lao/chi phí sản phẩm.
  - Đồng hồ đếm ngược Deadline lên video:
    - Quá hạn: `bg-rose-100 text-rose-700 font-bold border-rose-200` kèm icon chuông cảnh báo.
    - Dưới 2 ngày: `bg-amber-100 text-amber-800 border-amber-200`.
    - Còn an toàn: `bg-slate-100 text-slate-600 border-slate-200`.
  - Phụ trách bởi ai: Avatar tròn 24px của nhân viên ở góc phải dưới thẻ.
- Khi thả thẻ vào cột cấm (ví dụ: nhảy cóc trạng thái chưa đủ điều kiện): Hiển thị hiệu ứng trượt về vị trí cũ kèm `Toast.error` giải thích rõ lý do.

### 2.4. Module Tiếp Cận & Zalo Outreach (`Modules/Outreach`)
- Màn hình soạn tin nhắn tiếp cận hàng loạt:
  - Trình soạn thảo mẫu có chèn thẻ động (`{tên_koc}`, `{sản_phẩm}`, `{link_portal}`).
  - Khung xem trước (Preview) mô phỏng giao diện tin nhắn Zalo chuẩn.
- Thao tác bán tự động (Semi-auto):
  - Nút bấm `Mở Zalo & Copy`: Tự động sao chép văn bản đã cá nhân hóa vào clipboard và kích hoạt deep-link `zalo.me/<sđt>`.
  - Đánh dấu trạng thái "Đã gửi tin" ngay sau khi click mà không cần tải lại trang.

### 2.5. Module Vận Chuyển & Gửi Mẫu (`Modules/Shipment`)
- Màn hình Gom đơn gửi hàng:
  - Bảng gom nhóm các Creator đã xác nhận địa chỉ nhận mẫu nhưng chưa xuất kho.
  - Nút thao tác hàng loạt (Bulk Actions): "Tạo mã vận đơn GHN/GHTK hàng loạt", "In phiếu đóng gói".
  - Hiển thị mã vận đơn kèm link tra cứu trạng thái thời gian thực.

### 2.6. Module Nội Dung & Video (`Modules/Content`)
- Bảng giám sát video đã xuất bản:
  - Cột Link Video: Bấm mở tab mới xem trực tiếp.
  - Các cột số liệu: Lượt xem (Views), Tim (Likes), Bình luận (Comments), Doanh thu gắn kèm (GMV).
  - Nút 1-chạm: "Duyệt nghiệm thu video" hoặc "Yêu cầu chỉnh sửa".

### 2.7. Module Báo Cáo & Thống Kê (`Modules/Report`)
- Sử dụng thư viện `Recharts` tuân thủ bảng màu token quy định tại [design-system.md](./design-system.md#63-báo-cáo--biểu-đồ-dashboard-recharts):
  - Biểu đồ Phễu (Funnel Chart): Đo lường tỷ lệ rớt từ lúc Tiếp cận -> Chốt mẫu -> Nhận hàng -> Lên video.
  - Biểu đồ Đường/Vùng (Area Chart): Tăng trưởng lượt xem video và doanh thu theo ngày.
  - Bảng xếp hạng TOP 10 Creator mang lại GMV cao nhất kèm tỷ lệ hoàn vốn (ROI).

---

## 3. Quy Chuẩn Xử Lý 5 Trạng Thái Giao Diện (States Management)

Để ứng dụng chuyên nghiệp và không gây ức chế cho người dùng vận hành, mọi trang phải xử lý đầy đủ:

1. **Đang tải (Loading State)**:
   - Khi chuyển trang hoặc tải dữ liệu bảng: Dùng `LoadingSkeleton` (các hàng chữ nhật xám bo góc nhấp nháy `animate-pulse`). Tuyệt đối không để màn hình trắng xóa hoặc chỉ xoay vòng tròn vô định.
2. **Không có dữ liệu (Empty State)**:
   - Áp dụng component `EmptyState`: Icon minh họa nét mảnh (Lucide), dòng thông báo ý nghĩa tiếng Việt và nút bấm kêu gọi hành động (ví dụ: *"Chưa có chiến dịch nào đang chạy. Tạo chiến dịch ngay"*).
3. **Thao tác lỗi (Error State)**:
   - Lỗi Form validate: Chữ đỏ `text-rose-600 text-xs` xuất hiện ngay dưới ô nhập liệu qua `FormField`.
   - Lỗi hệ thống / Không kết nối được API: Hiển thị Banner đỏ có nút "Thử lại".
4. **Thành công (Success State)**:
   - Sau khi lưu form hoặc chuyển trạng thái: Hiển thị component `Toast` góc trên phải trong 4 giây kèm âm báo nhẹ hoặc icon tích xanh `CheckCircle2`.
5. **Phân quyền (Permission State)**:
   - Nhân viên không có quyền (ví dụ: Staff không được duyệt xóa hoặc xem dữ liệu nhạy cảm): Ẩn hoàn toàn nút hoặc hiển thị trạng thái disabled kèm tooltip: *"Bạn không có quyền thực hiện thao tác này. Liên hệ Quản trị viên."*

---

## 4. Chuẩn Hóa Ngôn Ngữ & Thông Điệp Tiếng Việt

100% nhãn, nút bấm, thông báo và tin nhắn trong ứng dụng phải bằng tiếng Việt doanh nghiệp chuẩn mực:

- **Hành động**: `Lưu thay đổi`, `Hủy bỏ`, `Tạo chiến dịch`, `Thêm Creator`, `Xác nhận gửi mẫu`, `Duyệt video`, `Gộp trùng hồ sơ`, `Xóa vĩnh viễn`.
- **Thông báo thành công**:
  - *"Đã lưu thông tin Creator thành công."*
  - *"Đã chuyển trạng thái sang [Đã nhận mẫu]. Bắt đầu đếm ngược deadline lên video 7 ngày."*
  - *"Đã xuất dữ liệu ra file Excel thành công."*
- **Cảnh báo & Chặn**:
  - *"Creator này chưa có địa chỉ nhận hàng hợp lệ. Vui lòng cập nhật trước khi gửi mẫu."*
  - *"Chiến dịch đã kết thúc, không thể thêm Creator mới."*
- **Định dạng dữ liệu chuẩn Việt Nam**:
  - Tiền tệ: `15.000.000 đ` (có dấu chấm phân cách hàng nghìn).
  - Ngày tháng: `27/10/2026` hoặc `27/10/2026 15:30`.
  - Số điện thoại: Định dạng nhóm số dễ đọc `0912 345 678`.
