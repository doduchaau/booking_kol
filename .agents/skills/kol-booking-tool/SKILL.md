---
name: kol-booking-tool
description: >-
  Hướng dẫn xây dựng và phát triển web tool quản lý toàn bộ quy trình booking KOL/KOC (CRM, pipeline, gửi mẫu, theo dõi video, outreach Zalo, báo cáo ROI). Kích hoạt khi người dùng nhắc tới: tool booking KOL/KOC, CRM KOL, pipeline KOL, gửi mẫu cho KOC, theo dõi lên video, outreach Zalo, báo cáo hiệu quả KOL, hoặc yêu cầu code/sửa bất kỳ module nào của dự án này.
---

# Hướng Dẫn Phát Triển Hệ Thống Web Tool Booking KOL / KOC

> [!CAUTION]
> **QUY TẮC BẤT BIẾN - LOẠI BỎ HOÀN TOÀN VẬN ĐƠN (SHIPMENT / HÃNG VẬN CHUYỂN):**
> 1. Nhân viên Booking **TUYỆT ĐỐI KHÔNG LÀM VẬN ĐƠN / VẬN CHUYỂN**. Việc giao nhận thực tế do bộ phận kho & đối tác vận chuyển bên ngoài tự xử lý.
> 2. **CẤM** tạo, đề xuất hay code module `Shipment`, bảng `shipments`, API GHN/GHTK/ViettelPost, mã tracking vận đơn, hay tính phí ship.
> 3. Hệ thống chỉ quản lý quy trình gửi mẫu tinh gọn qua 3 trạng thái trong Pipeline:
>    - `address_confirmed`: KOC đã điền địa chỉ nhận hàng (qua Portal hoặc nhân viên lưu).
>    - `sample_sent`: Nhân viên xác nhận đã chuyển mẫu (`sample_sent_at`).
>    - `sample_received`: Đã nhận mẫu (`sample_received_at`), bắt đầu đếm ngược hạn nộp video.
> 4. **Trợ lý (Agent) tuyệt đối không được hỏi lại người dùng về vấn đề vận đơn, module Shipment hay tích hợp giao hàng.**

Skill này đóng vai trò là "kim chỉ nam" hướng dẫn phát triển (vibe coding) từng bước một ứng dụng Web chuyên dụng thay thế Excel và chat thủ công cho đội ngũ booking KOL/KOC nội bộ của doanh nghiệp.

---

## 1. Ngăn Xếp Công Nghệ Bắt Buộc (Tech Stack)

- **Backend**: Laravel 11 kết hợp kiến trúc mô-đun `nwidart/laravel-modules`.
- **Frontend**: React (TypeScript/JSX) + Inertia.js (SPA không cần viết REST API rời rạc).
- **Styling & Design System**: Tailwind CSS với tokens mở rộng, hỗ trợ tiếng Việt mượt mà.
- **Database & Cache**: MySQL 8.0, Redis (quản lý Queue và Job xử lý nền).
- **Thư viện chuyên dụng**:
  - Kéo thả Kanban: `@dnd-kit/core`, `@dnd-kit/sortable`.
  - Biểu đồ Dashboard: `Recharts`.
  - Icon hệ thống: `lucide-react`.
  - Phân quyền: `spatie/laravel-permission`.
  - Xử lý Excel: `maatwebsite/excel`.
  - Kiểm thử: `Pest PHP` hoặc `PHPUnit`.

---

## 2. Tài Liệu Tham Chiếu Chuyên Sâu (Progressive Disclosure)

Khi thực hiện từng tác vụ cụ thể, chỉ đọc tài liệu tương ứng, **không đọc hết toàn bộ cùng lúc**:

- [Thuật ngữ nghiệp vụ (domain.md)](./references/domain.md): Phân hạng KOL/KOC (nano/micro/macro), rate card, air/lên video, affiliate, GMV, bom hàng, seeding.
- [Thiết kế Database chi tiết (database.md)](./references/database.md): Lược đồ 15 bảng, chỉ mục (indexing), quy tắc chuẩn hóa SĐT, cơ chế phát hiện trùng và gộp hồ sơ.
- [Đặc tả 8 Module độc lập (modules.md)](./references/modules.md): Màn hình, quy tắc nghiệp vụ, quyền hạn, route, job, event và tiêu chí nghiệm thu cho từng module: `Creator`, `Campaign`, `Pipeline`, `Outreach`, `Content`, `Report`, `Portal`, `Settings` (Không có module Shipment).
- [Quy chuẩn hệ thống thiết kế dùng chung (design-system.md)](./references/design-system.md): Bố cục khung `AppLayout`, hệ màu Enterprise SaaS B2B, typography tiếng Việt, Tailwind tokens và bộ Shared Components dùng chung.
- [Hướng dẫn thực thi giao diện nghiệp vụ (ui-guidelines.md)](./references/ui-guidelines.md): Ứng dụng Design System vào từng màn hình module: Kanban dnd-kit, bảng dữ liệu, form Inertia, biểu đồ Recharts, xử lý 5 trạng thái và ngôn ngữ tiếng Việt.
- [Quy tắc tích hợp & An toàn (integrations.md)](./references/integrations.md): Nguyên tắc an toàn kết nối, 2 chế độ Zalo (OA chính thức vs bán tự động deep-link `zalo.me`), tuân thủ Nghị định 13/2023 bảo vệ dữ liệu cá nhân.
- [Đồng bộ tự động & Thu thập dữ liệu (kol-automated-sync.skill.md)](../kol-automated-sync/SKILL.md): Pipeline tự động hóa 100% thu thập, đồng bộ chỉ số đa nền tảng qua Data Provider, Rate Limiting, Auto-Refresh Scheduler và KolDataAdapter.
- [Lộ trình 5 giai đoạn (phases.md)](./references/phases.md): GĐ1 (Nền tảng & Kanban) -> GĐ2 (Portal & Gửi Mẫu Tinh Gọn) -> GĐ3 (Zalo Outreach) -> GĐ4 (Collector & Metrics) -> GĐ5 (Báo cáo & ROI).
- [File dữ liệu mẫu (assets/import-creators-template.csv)](./assets/import-creators-template.csv): File CSV chuẩn mẫu để import Creator.

---

## 3. Quy Trình Làm Việc Bắt Buộc Của Claude (Workflow)

Mọi phản hồi và thao tác code của Claude phải tuân thủ nghiêm ngặt 6 bước sau:

```mermaid
flowchart LR
    A[1. Định vị Giai đoạn/Module] --> B[2. Kiểm tra hiện trạng & Design System]
    B --> C[3. Cắt lát dọc hoàn chỉnh]
    C --> D[4. Viết Test & Kiểm tra chéo]
    D --> E[5. Build & Bàn giao]
    E --> F[6. Đề xuất bước kế tiếp]
```

1. **Định vị phạm vi**: Xác định task thuộc Giai đoạn nào (trong [phases.md](./references/phases.md)) và Module nào (trong [modules.md](./references/modules.md)). Chỉ đọc file reference liên quan trực tiếp.
2. **Kiểm tra hiện trạng kiến trúc & UI (Inspect First)**:
   - Trước khi viết giao diện, kiểm tra cấu trúc dự án, layout hiện có (`resources/js/Layouts`), `tailwind.config.js` và các Shared Components (`resources/js/Components`).
   - Ưu tiên tái sử dụng component sẵn có. Nếu dự án chưa có nền tảng Design System chuẩn, xây dựng bộ component dùng chung trước rồi mới phát triển màn hình nghiệp vụ.
3. **Phát triển theo lát cắt dọc nhỏ (Vertical Slice)**:
   - Một lượt làm việc chỉ giải quyết một lát cắt hoàn chỉnh chạy được ngay: `Migration -> Model & Quan hệ -> Service/Action -> Form Request & Policy -> Controller/Inertia -> Component React`.
   - **Tuyệt đối không** viết dở dang hoặc để mã giả/placeholder (như `// ...phần còn lại tương tự`). Code phải đầy đủ 100%.
4. **Kiểm tra tác động chéo & Viết Test**:
   - Khi chỉnh sửa layout hoặc shared component, phải kiểm tra xem có ảnh hưởng tiêu cực đến các module đã xây dựng trước đó hay không.
   - Luôn viết test (Pest/PHPUnit) cho logic lõi: gộp trùng hồ sơ, chuyển trạng thái Pipeline ràng buộc, tính deadline lên video, tính số liệu báo cáo ROI/Funnel và phân quyền.
5. **Kiểm tra bản build & Bàn giao**:
   - Chạy lệnh `npm run build` để kiểm tra TypeScript và CSS không bị lỗi trước khi bàn giao.
   - Kiểm tra hiển thị responsive (ưu tiên laptop 13"-16", mobile hỗ trợ xem dữ liệu và thao tác nhanh).
   - Nội dung bàn giao: Danh sách file tạo/sửa (kèm link), lệnh terminal cần chạy, hướng dẫn kiểm tra thủ công, rủi ro/lưu ý và 1 bước tiếp theo đề xuất.
6. **Xử lý yêu cầu mơ hồ**:
   - Nếu ảnh hưởng tới cấu trúc Database hoặc luồng nghiệp vụ: **Hỏi tối đa 3 câu ngắn** trước khi làm.
   - Nếu là chi tiết nhỏ (UI, label, màu sắc): **Tự chọn mặc định tối ưu nhất theo [design-system.md](./references/design-system.md)** và giải thích rõ trong phản hồi.

---

## 4. Quy Chuẩn Thiết Kế Giao Diện Thống Nhất (UI Consistency Rules)

Để tránh hiện tượng "mỗi trang một phong cách", mọi giao diện phải tuân thủ nghiêm ngặt 5 nguyên tắc sau:

1. **Kiến trúc Layout duy nhất (Unified Layout)**:
   - Tất cả các module quản trị (`Creator`, `Campaign`, `Pipeline`, `Outreach`, `Content`, `Report`, `Settings`) đều phải sử dụng chung layout `AppLayout` gồm: `Sidebar` (menu phân nhóm cố định bên trái), `Topbar` (header sticky trên cùng có breadcrumb), `PageHeader` (tiêu đề trang H1 + mô tả + nút CTA) và Vùng nội dung chính.
   - Tuyệt đối không tự tạo Blade layout riêng (`master.blade.php`) hay layout React riêng cho từng module.
   - Cổng KOL Portal (`/p/{token}`) dùng layout tối giản dạng đơn cột cho di động, nhưng bắt buộc dùng chung Design Tokens và Shared Components.
2. **Hệ màu Enterprise SaaS B2B**:
   - Màu chủ đạo (Primary): `Indigo-600` (`#4f46e5`) - Hover `Indigo-700` (`#4338ca`) - Muted `Indigo-50` (`#eef2ff`).
   - Bề mặt: App Background `bg-slate-50`, Card/Table/Modal Surface `bg-white`, Border `border-slate-200`.
   - Màu trạng thái: `Success` (Emerald), `Warning` (Amber), `Danger` (Rose), `Info` (Blue). Tuyệt đối không hardcode mã màu lạ.
3. **Thư viện Thành phần Dùng chung (Shared Components)**:
   - Bắt buộc tái sử dụng các component chuẩn tại `resources/js/Components/`: `AppLayout`, `Sidebar`, `Topbar`, `PageHeader`, `Button`, `Badge`, `DataTable`, `FilterBar`, `FormField`, `Modal`, `Toast`, `EmptyState`, `LoadingSkeleton`, `ConfirmDialog`.
4. **Xử lý 5 Trạng Thái Giao Diện (States)**:
   - Mọi màn hình phải xử lý đủ: `Loading` (Skeleton nhấp nháy), `Empty` (EmptyState có nút kêu gọi), `Error` (lỗi form chữ đỏ, lỗi mạng có nút thử lại), `Success` (Toast tự tắt sau 4s), `Permission` (ẩn/disable nút khi thiếu quyền kèm tooltip).
5. **Ngôn ngữ 100% Tiếng Việt Chuẩn**:
   - Toàn bộ nhãn, nút bấm, thông báo toast và validate đều bằng tiếng Việt doanh nghiệp chuẩn mực. Định dạng tiền tệ `1.500.000 đ`, ngày tháng `DD/MM/YYYY`.

---

## 5. Nguyên Tắc An Toàn & Từ Chối Thao Tác Vi Phạm (Safety Guidelines)

Khi người dùng yêu cầu:
1. **Cào dữ liệu tự động hàng loạt từ TikTok/Facebook/Shopee**:
   - *Hành động*: Từ chối lịch sự phần cào lậu; nêu rõ rủi ro bị khóa IP/tài khoản.
   - *Giải pháp thay thế*: Đề xuất dùng file import Excel/CSV, dữ liệu xuất từ Kalodata/FastMoss, hoặc Chrome Extension "Lưu thủ công vào CRM".
2. **Spam tin nhắn tự động bằng tài khoản Zalo cá nhân**:
   - *Hành động*: Từ chối viết bot giả lập đăng nhập tự động tài khoản Zalo cá nhân (dễ bị khóa số vĩnh viễn).
   - *Giải pháp thay thế*: Đề xuất sử dụng Zalo OA/ZNS chính thức hoặc chế độ bán tự động (deep-link `zalo.me/<sđt>` kết hợp soạn sẵn nội dung).
3. **Bảo mật dữ liệu cá nhân (Nghị định 13/2023)**:
   - Số điện thoại và địa chỉ nhận hàng phải được che mờ (`091****789`) đối với vai trò không cần thiết; ghi log truy cập khi xem chi tiết hoặc export.

---

## 6. Quy Chuẩn Lập Trình (Code Conventions)

### 6.1. Backend Laravel
- **Enums**: Dùng PHP 8.1+ Enum cho các trạng thái (ví dụ: `PipelineStatusEnum`, `CreatorTierEnum`, `PlatformEnum`).
- **Form Request**: Không validate trong Controller, tạo Form Request riêng với thông báo lỗi tiếng Việt thân thiện.
- **Service/Action Pattern**: Mọi nghiệp vụ phức tạp đặt trong `Modules/<ModuleName>/Services/` hoặc `Actions/`.
- **Chuẩn hóa dữ liệu**: Múi giờ hệ thống `Asia/Ho_Chi_Minh`. Tiền tệ hiển thị dạng `1.500.000 đ`. SĐT bắt buộc chuẩn hóa 10 số.

### 6.2. Frontend React + Inertia
- **Vị trí Component**: Trang chức năng đặt trong `resources/js/Pages/<ModuleName>/`, các component dùng chung đặt trong `resources/js/Components/` và `resources/js/Layouts/`.
- **Form**: Luôn sử dụng `useForm` của Inertia để tận dụng cơ chế xử lý lỗi và trạng thái `processing` hiển thị spinner.
- **Bảng**: Tìm kiếm debounce 300ms, filter và phân trang gửi qua `router.get` với `preserveState: true`.
