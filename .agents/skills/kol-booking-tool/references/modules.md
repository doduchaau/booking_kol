# Đặc Tả Kiến Trúc Các Module (nwidart/laravel-modules)

Dự án hiện có 7 Laravel module theo `nwidart/laravel-modules`: `Creator`, `Campaign`, `Outreach`, `Content`, `Portal`, `Report`, `Settings`. Pipeline là chức năng trong `Campaign`, không phải module riêng.

> [!CAUTION]
> **PHẠM VI GỬI MẪU HIỆN TẠI:**
> Không có Laravel module vận chuyển độc lập hoặc tích hợp API hãng vận chuyển. Campaign hiện lưu từng đợt gửi mẫu trong `campaign_creator_sample_logs`; bản ghi có snapshot địa chỉ/số điện thoại, sản phẩm, ghi chú và trường tùy chọn `carrier_name`/`tracking_code`. Không tự tạo vận đơn hay tra cứu tracking qua nhà cung cấp. Không loại bỏ hoặc đổi các trường nhật ký đang có nếu chưa có yêu cầu nghiệp vụ mới.

> **Cách đọc tài liệu:** nội dung dưới đây mô tả hành vi đã tìm thấy trong code tại thời điểm cập nhật. Khi khác với migrations/routes/services/controllers/tests, ưu tiên code hiện tại; các lộ trình chưa triển khai phải được ghi là kế hoạch, không coi là tính năng đang chạy.

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
  - Trust score mặc định là 100 theo schema hiện tại. Khi chuyển sang `no_show`, service tự trừ 30 điểm (chặn dưới 0); nếu kết quả dưới 40 thì tự bật blacklist.
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
- **Đồng bộ dữ liệu**: có import Excel/CSV, connector cho dữ liệu nhập và đồng bộ metrics; đối chiếu job/service hiện có trước khi thêm luồng mới.
- Các mục như event và ngưỡng hiệu năng là yêu cầu thiết kế, không khẳng định đã được cài đặt nếu chưa có class/test tương ứng.

---

## 2. Module Campaign (Quản Lý Chiến Dịch)

- **Màn hình**:
  - `CampaignIndex`: Danh sách chiến dịch, thanh tiến độ thực hiện (ví dụ: 15/20 video đã hoàn thành), ngân sách đã giải ngân.
  - `CampaignForm`: Tạo mới / chỉnh sửa chiến dịch (tên, sản phẩm, deadline, guideline nội dung, ngân sách, hoa hồng).
  - `CampaignDetail`: Tổng quan chiến dịch, thống kê nhanh, chuyển hướng sang Pipeline Kanban.
- **Hành động**: Tạo chiến dịch, Đóng/Tạm dừng chiến dịch, Thêm hàng loạt Creator từ danh sách master vào chiến dịch.
- **Quy tắc nghiệp vụ**:
  - Xóa chiến dịch là soft delete và bị chặn nếu đã có Creator gửi mẫu (`sample_sent_at`).
- **Phân quyền**:
  - `Admin / Leader`: Tạo, sửa ngân sách, đóng chiến dịch.
  - `Staff`: Xem chiến dịch, thêm Creator vào chiến dịch được phân công.
- **API & Routes**:
  - `GET /campaigns`, `POST /campaigns`, `GET /campaigns/{id}`, `PUT /campaigns/{id}`.
  - `POST /campaigns/{id}/add-creators`: Gán Creator vào chiến dịch.
- **Tiêu chí nghiệm thu (DoD)**: Tính toán chính xác tỷ lệ hoàn thành mục tiêu số lượng video và % giải ngân ngân sách theo thời gian thực.

---

## 3. Pipeline Trong Module Campaign (Quản Lý Phễu Hợp Tác Kanban)

- **Màn hình**:
  - `PipelineBoard`: Bảng Kanban kéo thả (sử dụng `@dnd-kit`), cột là các trạng thái:
    `Mới -> Đã liên hệ -> Chốt hợp tác -> Đã chốt địa chỉ -> Đã gửi mẫu -> Đã nhận mẫu -> Đã lên video -> Hoàn tất (Thành công) | Từ chối | Bom hàng (Thất bại)`.
  - Có bộ lọc theo nhân viên phụ trách, phân hạng tier, tìm kiếm Creator theo tên.
- **Hành động**: Kéo thả đổi trạng thái thẻ, gán nhân viên phụ trách, cập nhật mức phí booking thỏa thuận, tạo link Portal.
- **Quy tắc nghiệp vụ (Ràng buộc chuyển bước)**:
  - Chỉ được kéo sang `sample_sent` nếu hồ sơ Creator có địa chỉ nhận mẫu.
  - Chỉ được kéo sang `posted` (Đã lên video) nếu đã có link bài viết trong bảng `content_posts`.
  - Deal có `booking_fee > 0` cần được xác nhận duyệt chi phí; `agreed` có thể chuyển thành `waiting_approval` cho tới khi duyệt.
  - Khi chuyển sang `no_show`, code hiện trừ 30 điểm trust score (không xuống dưới 0), bật blacklist nếu điểm dưới 40 và gửi thông báo cho Admin/Leader.
  - `PipelineStatusEnum` là danh sách chuẩn trạng thái và timestamp. Chưa có cơ sở để khẳng định mọi thao tác được ghi vào bảng audit chung `activity_logs`.
- **API & Routes**:
  - `GET /campaigns/{id}/pipeline`: Dữ liệu Kanban; có thêm workspace `/workspace` và pipeline tổng `/pipeline`.
  - `PATCH /pipeline/{campaignCreatorId}/status`: Cập nhật trạng thái khi kéo thả.
  - `PATCH /pipeline/{campaignCreatorId}/assign`: Gán người phụ trách.
- **Tiêu chí nghiệm thu (DoD)**: Kéo thả mượt mà, cập nhật ngay lập tức (optimistic UI update), tự động rollback và báo lỗi tiếng Việt nếu vi phạm điều kiện chuyển bước.

---

## 4. Module Outreach (Tiếp Cận & Trao Đổi Zalo)

- **Màn hình**:
  - Màn hình `/outreach` quản lý mẫu tin nhắn và lịch sử tiếp cận theo các kênh đang cấu hình.
  - `OutreachActionModal`: Hộp thoại chuẩn bị gửi tin (tự động điền tên Creator, tên sản phẩm, link Portal).
  - `GroupInviteManager`: Bảng checklist quản lý việc mời Creator vào nhóm Zalo chiến dịch.
- **Hành động hiện có**: Soạn nội dung, chuẩn bị deep-link Zalo cá nhân (`zalo.me/<phone>`), ghi nhận gửi/nhắc việc, quản lý opt-out và trạng thái mời vào nhóm.
- **Quy tắc nghiệp vụ**:
  - Tuyệt đối không tích hợp bot cào/gửi tự động tài khoản cá nhân.
  - Chế độ Zalo cá nhân hoạt động bán tự động: hệ thống tạo sẵn nội dung cá nhân hóa + nút bấm mở `zalo.me/<phone>`, nhân viên bấm gửi thủ công và xác nhận kết quả trên web tool.
  - Service kiểm tra số điện thoại/email trong `opt_outs` trước khi ghi nhận gửi; không xây dựng bot đăng nhập tài khoản cá nhân.
  - Chưa thấy job/service gửi Zalo OA/ZNS trong module hiện tại; không mô tả OA như tính năng đã triển khai.

---

## 5. Quy Trình Gửi Mẫu Tinh Gọn (Nằm trực tiếp trong Campaign & Pipeline)

- **Màn hình**: Nằm trong Ma trận KOC (`KocMatrixTable`) và Workspace; nhật ký gửi mẫu có thể lưu nhiều đợt.
- **Hành động**:
  - Khi KOC cập nhật địa chỉ trên Portal (hoặc nhân viên lưu địa chỉ) -> Trạng thái sang `address_confirmed`.
  - Nút **"Sao chép gửi kho"**: Sao chép thông tin Họ tên, SĐT, Địa chỉ để gửi cho bộ phận kho bên ngoài xuất hàng.
  - Form **"Xác nhận đã gửi mẫu"**: Ghi nhận ngày gửi, người thao tác, snapshot địa chỉ/số điện thoại, sản phẩm/số lượng và ghi chú trong `campaign_creator_sample_logs`; các trường hãng/mã vận chuyển hiện là tùy chọn. Đồng bộ tổng số mẫu và trạng thái Pipeline `sample_sent`.
  - Khi KOC bấm 1 chạm trên Portal "Đã nhận được hàng" (hoặc admin cập nhật) -> Trạng thái sang `sample_received`, tự động ghi nhận `sample_received_at` và bắt đầu đếm ngược hạn nộp video.
- **Quy tắc bất biến**:
  - Nhật ký trong ứng dụng không thực hiện tạo đơn, đồng bộ trạng thái vận chuyển hay tính phí ship.
  - Giao nhận thực tế do kho/đơn vị vận chuyển xử lý ngoài hệ thống.

---

## 6. Module Content (Theo Dõi Nghiệm Thu Video & Chỉ Số)

- **Màn hình**:
  - `/content`: Danh sách ContentPost có lọc trạng thái duyệt, tuân thủ, tình trạng video và chiến dịch; phân trang 15 bản ghi.
  - `ContentDetailModal`: Xem link video, duyệt nội dung (Approve / Reject), xem biểu đồ tăng trưởng view theo ngày.
- **Hành động**: Nhập link video, Duyệt video, Gửi yêu cầu chỉnh sửa, Cập nhật chỉ số tương tác.
- **Quy tắc nghiệp vụ**:
  - Deadline mặc định: 7 ngày kể từ khi Creator nhận được hàng (`sample_received_at`).
  - Trạng thái duyệt đang dùng: `pending_approval`, `approved`, `changes_requested`. Portal nộp bài sẽ tạo pending approval; Pipeline hiện được cập nhật `posted` khi nộp.
  - Deadline lấy theo `sample_received_at` + số ngày cấu hình chiến dịch (mặc định 7); model ContentPost có fallback tính từ `sample_sent_at` hoặc ngày tạo khi thiếu mốc nhận mẫu.
  - Có command/job đồng bộ metrics theo lịch; xác minh scheduler/worker môi trường trước khi khẳng định đã chạy tự động.
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
  - `GET /portal/{token}`: Giao diện form; các route dùng tiền tố `/portal`, không phải `/p`.
  - `POST /portal/{token}/address`: Gửi địa chỉ.
  - `POST /portal/{token}/confirm-received`: Xác nhận đã nhận hàng.
  - `POST /portal/{token}/precheck-video`: Kiểm tra trước video.
  - `POST /portal/{token}/submit-video`: Nộp link video.
- **Tiêu chí nghiệm thu (DoD)**: Giao diện cực nhẹ, mở mượt mà trên trình duyệt Safari/Chrome của điện thoại; hiển thị thông báo cảm ơn bằng tiếng Việt rõ ràng.

---

## 8. Module Report (Báo Cáo Hiệu Quả & ROI)

- **Màn hình**:
  - `ReportDashboard`: Tổng quan chiến dịch: Phễu chuyển đổi (Funnel Chart), Tổng chi phí, Tổng GMV, Tỷ lệ ROI.
  - Có dashboard, phân tích funnel/tài chính, so sánh nền tảng và export Excel theo các phần hiện có.
  - `StaffPerformanceReport`: Thống kê số lượng KOL phụ trách, tỷ lệ chốt thành công, số lượng đơn gửi mẫu của từng nhân viên booking.
- **Hành động hiện có**: Lọc và xuất báo cáo Excel. Chưa thấy `GenerateWeeklyReportJob` hoặc cấu hình gửi email định kỳ trong code hiện tại.
- **Quy tắc nghiệp vụ**:
  - Không ghi cố định công thức ROI/Funnel ở tài liệu này; dùng `ReportCalculationService` và test tương ứng làm nguồn chuẩn để tránh lệch số liệu.

---

## 9. Module Settings (Cấu Hình Hệ Thống & Tích Hợp)

- **Màn hình**:
  - Settings quản lý cấu hình chung, Portal, tích hợp, người dùng và vai trò theo các trường đang có trong `SettingsController`/migrations.
  - `UserRoleSettings`: Quản lý tài khoản nhân viên và phân quyền (Spatie Permissions).
  - `GeneralSettings`: Cấu hình hạn deadline mặc định, điểm trừ uy tín khi bom hàng.
- **Quy tắc nghiệp vụ**:
  - Khóa API và Secret được mã hóa an toàn trong database (`Crypt::encryptString`) hoặc cấu hình qua `.env`.
  - Phạm vi quyền thực tế cần đối chiếu middleware/controller; không giả định chỉ một vai trò được truy cập nếu route hiện chỉ dùng `auth` và `verified`.
