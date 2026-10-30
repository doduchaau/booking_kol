# Lộ Trình Triển Khai 5 Giai Đoạn (Phased Roadmap)

Để dự án được xây dựng ổn định theo phương pháp "vibe coding" bền vững và chạy được sản phẩm thực tế sớm nhất, toàn bộ quá trình phát triển được chia làm 5 giai đoạn tuần tự.

---

## Giai Đoạn 1: Nền Tảng Hồ Sơ Creator, Chiến Dịch & Pipeline Kanban

- **Phạm vi**: Xây dựng kho dữ liệu Creator tập trung, công cụ nhập liệu từ Excel, tạo chiến dịch và quản lý tiến độ bằng bảng Kanban kéo thả kèm phân quyền cơ bản.
- **Danh sách Task theo thứ tự lát cắt dọc**:
  1. Cấu hình Laravel 11, kết nối MySQL, cài đặt `nwidart/laravel-modules`, Inertia React và Tailwind CSS.
  2. Tạo module `Creator`: Migration bảng `creators`, `creator_accounts`, `creator_rate_cards`; Model và quan hệ.
  3. Xây dựng Service chuẩn hóa SĐT, phát hiện trùng lặp và logic gộp hồ sơ.
  4. Tạo tính năng Import file Excel danh sách Creator (hỗ trợ preview và kiểm tra lỗi).
  5. Xây dựng giao diện Danh sách Creator và Chi tiết hồ sơ với tìm kiếm/lọc server-side.
  6. Tạo module `Campaign`: Bảng `campaigns`, `campaign_creators`; Form tạo chiến dịch và gán Creator.
  7. Xây dựng giao diện `PipelineBoard` (Kanban với `@dnd-kit`), xử lý cập nhật trạng thái kéo thả qua API.
  8. Cài đặt phân quyền Spatie: Role Admin, Leader, Staff.
- **Tiêu chí hoàn thành (Definition of Done)**:
  - Import được file Excel 500 Creator không lỗi.
  - Kéo thả thẻ trên bảng Kanban đổi trạng thái mượt mà, lưu vết đúng vào DB.
  - Phân quyền hoạt động: Staff chỉ thấy chiến dịch mình phụ trách nếu được chỉ định.
- **Những thứ cố tình KHÔNG làm ở GĐ1**:
  - Không nối API hãng vận chuyển (chưa gửi hàng tự động).
  - Không tích hợp Zalo (chưa gửi tin nhắn tự động).
  - Không tạo cổng Portal cho Creator (nhân viên nhập tay thông tin nhận hàng).

---

## Giai Đoạn 2: Quản Lý Mẫu Thử Tinh Gọn, Cổng Creator Portal & Theo Dõi Deadline

> [!CAUTION]
> **LƯU Ý QUAN TRỌNG**: Nhân viên booking không làm vận đơn và không quản lý hãng vận chuyển. Không tạo module Shipment, không tạo bảng shipments. Chỉ theo dõi trạng thái gửi/nhận mẫu tinh gọn trong `campaign_creators`.

- **Phạm vi**: Tự động hóa khâu thu thập thông tin nhận hàng qua cổng riêng không cần login, nhân viên xác nhận gửi mẫu tinh gọn, KOC xác nhận nhận mẫu và giám sát hạn chót lên video.
- **Danh sách Task theo thứ tự lát cắt dọc**:
  1. Tạo module `Portal`: Cơ chế sinh token bảo mật 64 ký tự kèm hạn dùng trong `campaign_creators`.
  2. Xây dựng giao diện `Portal` (Mobile-first): Form xác nhận địa chỉ, nút 1-chạm báo "Đã nhận hàng", form nộp link video.
  3. Quản lý gửi mẫu tinh gọn: Nút xác nhận gửi mẫu trong ma trận KOC (chuyển trạng thái `sample_sent`, lưu `sample_sent_at` và ghi chú sản phẩm gửi, nút sao chép địa chỉ KOC để gửi bộ phận kho).
  4. Tạo module `Content`: Bảng `content_posts`, tính deadline (mặc định 7 ngày hoặc theo cấu hình chiến dịch kể từ khi nhận hàng), đồng hồ đếm ngược trên ma trận KOC và màn hình quản lý video.
  5. Viết Console Command / Scheduled Job quét các Creator sắp đến hạn hoặc quá hạn để hiển thị cảnh báo trên Action Center Dashboard.
- **Tiêu chí hoàn thành (Definition of Done)**:
  - Creator mở link Portal trên điện thoại điền địa chỉ -> Pipeline trên màn hình admin lập tức cập nhật `address_confirmed`.
  - Creator bấm xác nhận đã nhận hàng (hoặc admin cập nhật) -> Chuyển sang cột `Đã nhận mẫu` và kích hoạt đếm ngược deadline.
- **Những thứ cố tình KHÔNG làm ở GĐ2**:
  - **TUYỆT ĐỐI KHÔNG làm Module Shipment / Vận đơn / Hãng vận chuyển (GHN/GHTK)**.
  - Chưa làm hệ thống nhắn Zalo tự động (vẫn gửi link portal cho Creator bằng Zalo thủ công).
  - Chưa tự động cào số liệu view của video.

---

## Giai Đoạn 3: Tích Hợp Outreach Zalo & Quản Lý Nhóm Trao Đổi

- **Phạm vi**: Chuẩn hóa quy trình tiếp cận Creator qua Zalo (hỗ trợ cả Zalo OA chính thức và cơ chế bán tự động an toàn cho Zalo cá nhân) và quản lý nhóm trao đổi chiến dịch.
- **Danh sách Task theo thứ tự lát cắt dọc**:
  1. Tạo module `Outreach`: Bảng `outreach_templates`, `outreach_messages`, `opt_outs`.
  2. Xây dựng cơ chế tạo tin nhắn cá nhân hóa (thay biến `{creator_name}`, `{product_name}`, `{portal_link}`).
  3. Xây dựng chế độ Bán tự động: Nút mở deep-link `zalo.me/<phone>` kèm tự động copy nội dung để nhân viên gửi qua Zalo Desktop/App.
  4. Xây dựng chế độ Zalo OA: Service gửi tin ZNS qua Zalo Cloud API cho các tài khoản đã xác thực.
  5. Xây dựng tính năng kiểm tra `opt_outs` chặn liên hệ các số từ chối.
  6. Xây dựng module quản lý `group_invites`: checklist theo dõi việc mời Creator vào nhóm Zalo chiến dịch.
- **Tiêu chí hoàn thành (Definition of Done)**:
  - Nhân viên bấm 1 click là mở đúng khung chat Zalo của Creator với nội dung soạn sẵn chuẩn xác.
  - Không bao giờ gửi được tin cho số điện thoại đã nằm trong danh sách opt-out.
  - Lịch sử tương tác được lưu trữ đầy đủ trong chi tiết Creator.
- **Những thứ cố tình KHÔNG làm ở GĐ3**:
  - Không viết bot đăng nhập tài khoản Zalo cá nhân để spam tin.
  - Chưa xây dựng Chrome extension.

---

## Giai Đoạn 4: Trình Thu Thập Dữ Liệu & Tự Động Cập Nhật Chỉ Số Video

- **Phạm vi**: Tiện ích Chrome Extension giúp nhân viên lưu nhanh Creator từ TikTok/Facebook vào hệ thống và tự động cập nhật số liệu bài đăng.
- **Danh sách Task theo thứ tự lát cắt dọc**:
  1. Thiết kế lớp `Connector` (Interface + Adapter) trong module `Creator` để chuẩn hóa các nguồn cấp dữ liệu.
  2. Xây dựng API Token và Endpoint tiếp nhận dữ liệu từ Chrome Extension.
  3. Viết mã nguồn Chrome Extension cơ bản (Manifest V3): Đọc thông tin công khai trên trang profile TikTok (Tên, Handle, Followers) và nút "Lưu vào Booking CRM".
  4. Xây dựng adapter đọc file xuất từ các công cụ bên thứ ba (Kalodata, FastMoss).
  5. Tạo bảng `content_post_metrics` và Job `SyncPostMetricsDailyJob` cập nhật chỉ số lượt view/like theo chu kỳ.
- **Tiêu chí hoàn thành (Definition of Done)**:
  - Nhân viên lướt TikTok thấy Creator hay, bấm nút trên extension là hồ sơ được tạo ngay trong web tool kèm tài khoản TikTok.
  - Bảng số liệu video ghi nhận lịch sử tăng trưởng view theo ngày.
- **Những thứ cố tình KHÔNG làm ở GĐ4**:
  - Không chạy headless browser bot trực tiếp trên web server chính để cào lậu dữ liệu; thay vào đó, toàn bộ quy trình tự động hóa 100% phải tuân thủ chuẩn **Automated API & Data Provider Pipeline** (Official API / Data Provider + Redis Queue + Rate Limiting) theo quy định tại [kol-automated-sync.skill.md](../../kol-automated-sync/SKILL.md).

---

## Giai Đoạn 5: Báo Cáo Hiệu Quả, Phân Tích ROI & Tự Động Hóa Xuất Báo Cáo

- **Phạm vi**: Màn hình Dashboard phân tích chuyên sâu cho Leader/Ban Giám Đốc, tính toán ROI, xếp hạng hiệu quả và báo cáo tự động hằng tuần.
- **Danh sách Task theo thứ tự lát cắt dọc**:
  1. Tạo module `Report`: Xây dựng Service tổng hợp dữ liệu phễu chuyển đổi (Funnel Service).
  2. Xây dựng giao diện `ReportDashboard` sử dụng Recharts (Biểu đồ phễu, Biểu đồ chi phí & GMV).
  3. Xây dựng bảng xếp hạng Leaderboard: Top Creator có doanh thu cao nhất, Top Creator có chi phí trên mỗi view (CPV) rẻ nhất.
  4. Báo cáo hiệu suất nhân viên booking (tỷ lệ chốt, số lượng video hoàn thành đúng hạn).
  5. Tính năng xuất toàn bộ dữ liệu chiến dịch ra file Excel (.xlsx) chuẩn mẫu kế toán/đối soát.
  6. Thiết lập Job `GenerateWeeklyReportJob` gửi email tóm tắt hiệu quả vào sáng thứ Hai.
- **Tiêu chí hoàn thành (Definition of Done)**:
  - Biểu đồ hiển thị đúng 100% số liệu thực tế từ database.
  - Xuất file Excel trong < 5 giây với định dạng số tiền VND và ngày tháng chuẩn xác.
  - Email báo cáo tuần tự động gửi đi đúng lịch cấu hình.
