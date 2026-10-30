# Đặc Tả Kiến Trúc Các Module (nwidart/laravel-modules)

Dự án được phân rã thành 8 module độc lập theo chuẩn `nwidart/laravel-modules` (Không có module Shipment vì nhân viên booking không làm vận đơn): `Creator`, `Campaign`, `Pipeline`, `Outreach`, `Content`, `Portal`, `Report`, `Settings`.

> [!CAUTION]
> **LOẠI BỎ HOÀN TOÀN MODULE SHIPMENT / VẬN ĐƠN:**
> Bộ phận booking chỉ ghi nhận trạng thái gửi mẫu tinh gọn trực tiếp trong `campaign_creators` (`address_confirmed` -> `sample_sent` -> `sample_received`). Tuyệt đối không xây dựng module Shipment, bảng shipments, tracking vận chuyển hay kết nối hãng bưu điện.

---

## 1. Module Creator (Quản Lý Hồ Sơ Creator)

- **Màn hình**:
  - `CreatorIndex`: Danh sách Creator, bộ lọc (tier, niche, trạng thái blacklist, tìm kiếm theo tên/SĐT/handle), phân trang server-side.
  - `CreatorDetail`: Xem thông tin chi tiết, danh sách tài khoản social, lịch sử các chiến dịch đã tham gia, điểm uy tín, rate card.
  - `CreatorForm`: Thêm mới hoặc chỉnh sửa thông tin Creator + danh sách tài khoản social.
  - `CreatorImport`: Giao diện tải file Excel, xem trước dữ liệu, mapping cột, kiểm tra lỗi và xác nhận import.
  - `CreatorMergeModal`: Hộp thoại so sánh 2 hồ sơ trùng và thực hiện gộp.
- **Hành động**: Tạo/Sửa/Xóa (soft delete), Thêm tài khoản social, Cập nhật rate card, Bật/tắt blacklist, Import Excel, Gộp hồ sơ trùng.
- **Quy tắc nghiệp vụ**:
  - Tự động chuẩn hóa số điện thoại về định dạng 10 chữ số.
  - Kiểm tra trùng SĐT, email hoặc `platform + handle` khi tạo hoặc import.
  - Điểm uy tín mặc định là 100. Khi có sự cố bom hàng (no-show), tự động trừ 30 điểm. Khi điểm < 40, tự động đề xuất đưa vào blacklist.
- **Phân quyền**:
  - `Admin / Leader`: Toàn quyền; duyệt gộp hồ sơ, đưa vào/xóa khỏi blacklist.
  - `Staff`: Xem danh sách, tạo mới, cập nhật thông tin cơ bản; không được xóa vĩnh viễn hoặc gỡ blacklist.
- **API & Routes**:
  - `GET /creators`: Danh sách (Inertia).
  - `POST /creators`: Tạo mới.
  - `GET /creators/{id}`: Chi tiết.
  - `PUT /creators/{id}`: Cập nhật.
  - `POST /creators/import`: Upload & xử lý file Excel.
  - `POST /creators/merge`: Gộp hồ sơ trùng.
- **Job Queue**: `ImportCreatorsJob` (xử lý file Excel lớn bất đồng bộ).
- **Events**: `CreatorCreatedEvent`, `CreatorBlacklistedEvent`, `CreatorMergedEvent`.
- **Tiêu chí nghiệm thu (DoD)**: Import thành công file 1000 dòng trong < 30 giây; phát hiện đúng 100% bản ghi trùng SĐT/handle; giao diện hiển thị mượt mà.

---

## 2. Module Campaign (Quản Lý Chiến Dịch)

- **Màn hình**:
  - `CampaignIndex`: Danh sách chiến dịch, thanh tiến độ thực hiện (ví dụ: 15/20 video đã hoàn thành), ngân sách đã giải ngân.
  - `CampaignForm`: Tạo mới / chỉnh sửa chiến dịch (tên, sản phẩm, deadline, guideline nội dung, ngân sách, hoa hồng).
  - `CampaignDetail`: Tổng quan chiến dịch, thống kê nhanh, chuyển hướng sang Pipeline Kanban.
- **Hành động**: Tạo chiến dịch, Đóng/Tạm dừng chiến dịch, Thêm hàng loạt Creator từ danh sách master vào chiến dịch.
- **Quy tắc nghiệp vụ**:
  - Không được xóa chiến dịch đã có phát sinh chi phí hoặc đã gửi mẫu.
  - Khi chiến dịch chuyển sang `completed`, khóa các hành động thêm mới Creator.
- **Phân quyền**:
  - `Admin / Leader`: Tạo, sửa ngân sách, đóng chiến dịch.
  - `Staff`: Xem chiến dịch, thêm Creator vào chiến dịch được phân công.
- **API & Routes**:
  - `GET /campaigns`, `POST /campaigns`, `GET /campaigns/{id}`, `PUT /campaigns/{id}`.
  - `POST /campaigns/{id}/add-creators`: Gán Creator vào chiến dịch.
- **Tiêu chí nghiệm thu (DoD)**: Tính toán chính xác tỷ lệ hoàn thành mục tiêu số lượng video và % giải ngân ngân sách theo thời gian thực.

---

## 3. Module Pipeline (Quản Lý Phễu Hợp Tác Kanban)

- **Màn hình**:
  - `PipelineBoard`: Bảng Kanban kéo thả (sử dụng `@dnd-kit`), cột là các trạng thái:
    `Mới -> Đã liên hệ -> Chốt hợp tác -> Đã chốt địa chỉ -> Đã gửi mẫu -> Đã nhận mẫu -> Đã lên video -> Hoàn tất (Thành công) | Từ chối | Bom hàng (Thất bại)`.
  - Có bộ lọc theo nhân viên phụ trách, phân hạng tier, tìm kiếm Creator theo tên.
- **Hành động**: Kéo thả đổi trạng thái thẻ, gán nhân viên phụ trách, cập nhật mức phí booking thỏa thuận, tạo link Portal.
- **Quy tắc nghiệp vụ (Ràng buộc chuyển bước)**:
  - Chỉ được kéo sang `sample_sent` (Đã gửi mẫu) nếu đã có thông tin địa chỉ đầy đủ và đơn vận chuyển trong bảng `shipments`.
  - Chỉ được kéo sang `posted` (Đã lên video) nếu đã có link bài viết trong bảng `content_posts`.
  - Khi kéo sang `no_show` (Bom hàng), tự động kích hoạt cảnh báo, trừ điểm uy tín của Creator và thông báo cho Leader.
  - Mọi thao tác đổi cột đều tự động cập nhật timestamp tương ứng (`contacted_at`, `agreed_at`, ...) và ghi nhật ký `activity_logs`.
- **API & Routes**:
  - `GET /campaigns/{id}/pipeline`: Dữ liệu Kanban.
  - `PATCH /pipeline/{campaignCreatorId}/status`: Cập nhật trạng thái khi kéo thả.
  - `PATCH /pipeline/{campaignCreatorId}/assign`: Gán người phụ trách.
- **Tiêu chí nghiệm thu (DoD)**: Kéo thả mượt mà, cập nhật ngay lập tức (optimistic UI update), tự động rollback và báo lỗi tiếng Việt nếu vi phạm điều kiện chuyển bước.

---

## 4. Module Outreach (Tiếp Cận & Trao Đổi Zalo)

- **Màn hình**:
  - `OutreachTemplateIndex`: Quản lý danh sách mẫu tin nhắn (Zalo OA, SMS, Zalo cá nhân).
  - `OutreachActionModal`: Hộp thoại chuẩn bị gửi tin (tự động điền tên Creator, tên sản phẩm, link Portal).
  - `GroupInviteManager`: Bảng checklist quản lý việc mời Creator vào nhóm Zalo chiến dịch.
- **Hành động**: Soạn mẫu, Bấm gửi tin Zalo OA (ZNS), Tạo deep-link Zalo cá nhân (`zalo.me/<phone>`), Xác nhận đã vào nhóm.
- **Quy tắc nghiệp vụ**:
  - Tuyệt đối không tích hợp bot cào/gửi tự động tài khoản cá nhân.
  - Chế độ Zalo cá nhân hoạt động bán tự động: hệ thống tạo sẵn nội dung cá nhân hóa + nút bấm mở `zalo.me/<phone>`, nhân viên bấm gửi thủ công và xác nhận kết quả trên web tool.
  - Kiểm tra bảng `opt_outs` trước khi tạo nội dung tiếp cận. Nếu SĐT đã từ chối, chặn thao tác gửi.
- **Job Queue**: `SendZaloOaMessageJob` (gọi API Zalo OA kèm rate-limit 5 req/giây).
- **Tiêu chí nghiệm thu (DoD)**: Không bao giờ gửi tin cho Creator đã opt-out; ghi nhận đầy đủ lịch sử mọi lần liên hệ.

---

## 5. Quy Trình Gửi Mẫu Tinh Gọn (Nằm trực tiếp trong Campaign & Pipeline)

- **Màn hình**: Nằm trực tiếp trên Ma trận KOC (`KocMatrixTable`).
- **Hành động**:
  - Khi KOC cập nhật địa chỉ trên Portal (hoặc nhân viên lưu địa chỉ) -> Trạng thái sang `address_confirmed`.
  - Nút **"Sao chép gửi kho"**: Sao chép thông tin Họ tên, SĐT, Địa chỉ để gửi cho bộ phận kho bên ngoài xuất hàng.
  - Form **"Xác nhận đã gửi mẫu"**: Ghi nhận ngày gửi `sample_sent_at` và ghi chú sản phẩm gửi -> Trạng thái sang `sample_sent`.
  - Khi KOC bấm 1 chạm trên Portal "Đã nhận được hàng" (hoặc admin cập nhật) -> Trạng thái sang `sample_received`, tự động ghi nhận `sample_received_at` và bắt đầu đếm ngược hạn nộp video.
- **Quy tắc bất biến**:
  - Không tạo bảng `shipments`, không tích hợp API hãng vận chuyển, không tracking bưu điện, không tính phí ship.
  - Vận chuyển thực tế do kho xử lý bên ngoài công cụ này.

---

## 6. Module Content (Theo Dõi Nghiệm Thu Video & Chỉ Số)

- **Màn hình**:
  - `ContentTracker`: Bảng danh sách video cần nghiệm thu, đồng hồ đếm ngược deadline (còn X ngày/quá hạn X ngày).
  - `ContentDetailModal`: Xem link video, duyệt nội dung (Approve / Reject), xem biểu đồ tăng trưởng view theo ngày.
- **Hành động**: Nhập link video, Duyệt video, Gửi yêu cầu chỉnh sửa, Cập nhật chỉ số tương tác.
- **Quy tắc nghiệp vụ**:
  - Deadline mặc định: 7 ngày kể từ khi Creator nhận được hàng (`sample_received_at`).
  - Hệ thống tự động gửi thông báo nhắc lịch khi còn 2 ngày trước deadline và khi quá hạn.
- **Job Queue**: `SyncPostMetricsDailyJob` (chạy định kỳ nửa đêm để đồng bộ lượt view, like, comment, GMV từ nguồn dữ liệu).
- **Tiêu chí nghiệm thu (DoD)**: Đếm ngược chính xác theo múi giờ `Asia/Ho_Chi_Minh`; cảnh báo màu đỏ nổi bật đối với các Creator chậm trễ.

---

## 7. Module Portal (Cổng Tự Điền Dành Riêng Cho Creator)

- **Màn hình (Mobile-first, không yêu cầu đăng nhập tài khoản)**:
  - `PortalLanding`: Màn hình chào mừng với thương hiệu chiến dịch.
  - `PortalShippingForm`: Form điền/xác nhận địa chỉ nhận hàng, SĐT, ghi chú giao hàng.
  - `PortalConfirmReceipt`: Nút bấm 1-chạm xác nhận "Tôi đã nhận được sản phẩm".
  - `PortalSubmitVideo`: Form nộp đường link video TikTok/Reels đã lên kèm ngày đăng.
- **Quy tắc nghiệp vụ**:
  - Xác thực qua `portal_token` ngẫu nhiên có độ dài 64 ký tự, có thời hạn sử dụng (`portal_token_expires_at`).
  - Giới hạn tần suất truy cập (Rate limit 30 req/phút/IP) để chống dò quét.
  - Tự động cập nhật trạng thái Pipeline tương ứng khi Creator hoàn tất từng bước trên Portal.
- **API & Routes**:
  - `GET /portal/{token}`: Giao diện form.
  - `POST /portal/{token}/address`: Gửi địa chỉ.
  - `POST /portal/{token}/confirm-received`: Xác nhận đã nhận hàng.
  - `POST /portal/{token}/submit-video`: Nộp link video.
- **Tiêu chí nghiệm thu (DoD)**: Giao diện cực nhẹ, mở mượt mà trên trình duyệt Safari/Chrome của điện thoại; hiển thị thông báo cảm ơn bằng tiếng Việt rõ ràng.

---

## 8. Module Report (Báo Cáo Hiệu Quả & ROI)

- **Màn hình**:
  - `ReportDashboard`: Tổng quan chiến dịch: Phễu chuyển đổi (Funnel Chart), Tổng chi phí, Tổng GMV, Tỷ lệ ROI.
  - `CreatorLeaderboard`: Bảng xếp hạng KOL theo lượt view, theo GMV tạo ra, theo chi phí trên mỗi view (CPV).
  - `StaffPerformanceReport`: Thống kê số lượng KOL phụ trách, tỷ lệ chốt thành công, số lượng đơn gửi mẫu của từng nhân viên booking.
- **Hành động**: Lọc theo khoảng ngày / chiến dịch / nhân viên, Xuất báo cáo ra file Excel (.xlsx), Cấu hình gửi email báo cáo tuần tự động.
- **Quy tắc nghiệp vụ**:
  - Công thức tính Funnel: `Tỷ lệ chốt = (Agreed / Contacted) * 100%`, `Tỷ lệ lên video = (Posted / Sample Sent) * 100%`.
  - Công thức tính ROI: `((Doanh thu GMV * % Biên LN) - Tổng chi phí booking & mẫu) / Tổng chi phí`.
- **Job Queue**: `GenerateWeeklyReportJob` (chạy vào 8h00 sáng thứ Hai hằng tuần, gửi bản tóm tắt qua email cho Leader/Admin).
- **Tiêu chí nghiệm thu (DoD)**: Biểu đồ Recharts hiển thị trực quan; xuất file Excel đầy đủ công thức và format tiền tệ VND chuẩn.

---

## 9. Module Settings (Cấu Hình Hệ Thống & Tích Hợp)

- **Màn hình**:
  - `IntegrationSettings`: Cấu hình Zalo OA (App ID, Secret Key, OA ID), Cấu hình hãng vận chuyển (GHN Token, Shop ID), Webhook URL.
  - `UserRoleSettings`: Quản lý tài khoản nhân viên và phân quyền (Spatie Permissions).
  - `GeneralSettings`: Cấu hình hạn deadline mặc định, điểm trừ uy tín khi bom hàng.
- **Quy tắc nghiệp vụ**:
  - Khóa API và Secret được mã hóa an toàn trong database (`Crypt::encryptString`) hoặc cấu hình qua `.env`.
  - Chỉ duy nhất vai trò `Admin` được truy cập module này.
