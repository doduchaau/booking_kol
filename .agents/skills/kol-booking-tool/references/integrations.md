# Quy Tắc Tích Hợp & Bảo Mật Dữ Liệu (Integrations & Compliance)

Tài liệu này quy định các chuẩn mực kỹ thuật và nguyên tắc an toàn bắt buộc khi kết nối hệ thống với các nền tảng mạng xã hội, dịch vụ bên thứ ba và bảo vệ dữ liệu cá nhân.

---

## 1. Nguyên Tắc An Toàn & Tuân Thủ Điều Khoản Nền Tảng

> [!CAUTION]
> **QUY TẮC BẤT KHẢ XÂM PHẠM:**
> - **KHÔNG** xây dựng các công cụ cào dữ liệu tự động (automated scraping) vi phạm Terms of Service của TikTok, Facebook, Shopee hoặc Instagram.
> - **KHÔNG** lập trình các cơ chế tự động hóa đăng nhập/spam tin nhắn hàng loạt trên tài khoản Zalo cá nhân (dùng headless browser, user bot token không chính thống).
> - **HƯỚNG DẪN KHI NGƯỜI DÙNG YÊU CẦU**: Nếu người dùng yêu cầu thực hiện hành vi vi phạm ToS (như spam Zalo tự động hoặc cào dữ liệu lậu), Claude **bắt buộc phải từ chối phần vi phạm**, giải thích rủi ro (bị khóa số điện thoại, chặn IP, rủi ro pháp lý) và **đề xuất phương án bán tự động hoặc API chính thống tương đương**.

---

## 2. Chiến Lược Thu Thập & Nhập Liệu Hồ Sơ KOL/KOC

Hệ thống áp dụng kiến trúc **Connector Pattern** (`Interface + Adapter`) để mở rộng các nguồn dữ liệu mà không làm thay đổi logic lõi:

```mermaid
classOfInterfaces
classDiagram
    class CreatorDataConnectorInterface {
        <<interface>>
        +parse(mixed payload) Collection
        +validate(array record) bool
        +syncMetrics(string externalId) array
    }
    class ExcelCsvConnector {
        +parse(file)
    }
    class KalodataExportConnector {
        +parse(file)
    }
    class FastMossExportConnector {
        +parse(file)
    }
    class ChromeExtensionConnector {
        +parse(jsonPayload)
    }
    class OfficialPartnerApiConnector {
        +syncMetrics(externalId)
    }

    CreatorDataConnectorInterface <|.. ExcelCsvConnector
    CreatorDataConnectorInterface <|.. KalodataExportConnector
    CreatorDataConnectorInterface <|.. FastMossExportConnector
    CreatorDataConnectorInterface <|.. ChromeExtensionConnector
    CreatorDataConnectorInterface <|.. OfficialPartnerApiConnector
```

### Các Kênh Nhập Dữ Liệu Hợp Lệ:
1. **Import File Excel / CSV**: Hỗ trợ định dạng chuẩn nội bộ hoặc file xuất từ các nền tảng phân tích (Kalodata, FastMoss, Shoplus).
2. **Chrome Extension "Lưu Vào CRM"**: Nhân viên khi lướt xem profile Creator trên TikTok/Facebook bấm nút tiện ích trên trình duyệt để trích xuất các thông tin công khai (Tên, Handle, Followers, Bio) và gửi về API nội bộ của Web Tool qua token xác thực an toàn.
3. **Cổng Tự Điền (Creator Portal)**: Form đăng ký hợp tác dành cho Creator tự cung cấp thông tin.
4. **API Đối Tác Chính Thống**: Sử dụng API được cấp phép khi có thỏa thuận trực tiếp với nền tảng.
5. **Automated API & Data Provider Pipeline (Tự Động 100%)**: Hệ thống đóng vai trò Data Aggregator kết nối qua RESTful API / Webhooks (Official APIs & 3rd-Party Social Data Providers như Kalodata, FastMoss, Shoplus, Apify, RapidAPI) kết hợp Queue Job, Rate Limiting và Caching 24h theo chuẩn [kol-automated-sync.skill.md](../../kol-automated-sync/SKILL.md).

---

## 3. Tích Hợp Zalo: Hai Chế Độ Hợp Chuẩn

Hệ thống hỗ trợ 2 chế độ vận hành Zalo đáp ứng đúng chính sách:

### Chế độ A: Zalo OA & ZNS (Zalo Notification Service) Chính Thức
- Dành cho doanh nghiệp có Zalo Official Account đã xác thực.
- Sử dụng API chính thức của Zalo Cloud để gửi thông báo theo các mẫu (template) đã được Zalo duyệt trước (ví dụ: Thông báo gửi mẫu, Xác nhận địa chỉ, Nhắc hạn video).
- Có webhook tiếp nhận trạng thái tin nhắn (`sent`, `delivered`, `read`).

### Chế độ B: Bán Tự Động (Semi-Automated Deep Link) Cho Zalo Cá Nhân
- Dành cho nhân viên booking dùng Zalo cá nhân chăm sóc Creator mà không bị rủi ro khóa nick:
  1. Hệ thống cá nhân hóa nội dung tin nhắn dựa trên mẫu: thay thế tên Creator, tên sản phẩm, link Portal riêng.
  2. Hệ thống sinh nút bấm: `Mở Zalo nhắn tin` trỏ tới deep-link `https://zalo.me/<số_điện_thoại_đã_chuẩn_hóa>`.
  3. Khi nhân viên click, trình duyệt tự mở ứng dụng Zalo chat với Creator kèm nút `Copy nội dung đã soạn`.
  4. Sau khi gửi tin xong trên Zalo, nhân viên bấm nút `Đã gửi tin` trên web tool để hệ thống ghi log và chuyển trạng thái Pipeline.

### Mời Vào Nhóm Zalo (Group Invites):
- Không dùng bot tự kéo người vào nhóm.
- Hệ thống lưu trữ link nhóm Zalo chiến dịch. Nhân viên gửi link mời Creator hoặc nhân viên chủ động add Creator sau khi kết bạn.
- Bảng `group_invites` đóng vai trò checklist kiểm soát xem Creator nào đã vào nhóm thành công.

---

## 4. Bảo Vệ Dữ Liệu Cá Nhân (Nghị Định 13/2023/NĐ-CP)

Dữ liệu SĐT và địa chỉ nhà riêng của Creator là dữ liệu cá nhân nhạy cảm, phải được bảo vệ nghiêm ngặt:

1. **Che Mờ Thông Tin (Data Masking)**:
   - Các vai trò không trực tiếp phụ trách giao hàng (ví dụ: Content Reviewer, Khách ngoài) chỉ thấy SĐT dạng `091****789` và địa chỉ hiển thị cấp Tỉnh/Thành phố.
   - Chỉ nhân viên được phân công (`assigned_to`) hoặc `Admin / Leader` mới có quyền xem đầy đủ hoặc bấm nút hiện chi tiết.
2. **Nhật Ký Truy Cập Dữ Liệu (Audit Logging)**:
   - Mọi hành vi bấm "Hiện số điện thoại đầy đủ" hoặc "Xuất file Excel thông tin Creator" đều phải được ghi lại trong `activity_logs` kèm `user_id`, thời điểm và địa chỉ IP.
3. **Tuân Thủ Quyền Từ Chối (Opt-Out)**:
   - Khi Creator yêu cầu không nhận tin nhắn mời hợp tác, nhân viên phải đánh dấu vào bảng `opt_outs`.
   - Hệ thống chặn toàn bộ thao tác gửi tin hoặc tạo chiến dịch mới hướng tới số điện thoại này.
