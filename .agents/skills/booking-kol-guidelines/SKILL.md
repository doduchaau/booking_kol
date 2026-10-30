---
name: booking-kol-guidelines
description: >-
  Bộ quy chuẩn phát triển dự án Booking KOL sử dụng Laravel (PHP) và MySQL. Bắt buộc đọc và tuân thủ cho mọi yêu cầu code, tạo controller, model, migration, service, giao diện và API.
---

# Quy Chuẩn & Hướng Dẫn Phát Triển Dự Án Booking KOL (Laravel & MySQL)

Tài liệu này chứa các quy tắc kiến trúc, quy chuẩn mã nguồn, bảo mật và quy trình phát triển bắt buộc cho dự án **Booking KOL** chạy trên nền tảng **Laravel & MySQL** (môi trường Laragon).

---

## 1. Công Nghệ & Môi Trường (Tech Stack)

- **Backend**: Laravel (PHP 8.x+)
- **Database**: MySQL (chạy trên Laragon)
- **Frontend**: Blade Components / Vue / React + Tailwind CSS / Vanilla CSS
- **Authentication & RBAC**: Laravel Auth (Sanctum/Breeze/Jetstream), Spatie Laravel Permission (Admin, KOL/Influencer, Brand/Khách hàng)
- **Môi trường cục bộ**: Laragon (`c:\laragon\www\booking_kol`)

---

## 2. Quy Chuẩn Kiến Trúc Mã Nguồn (Laravel Architecture)

1. **Tuân thủ mô hình Service Layer / Action Pattern**:
   - **Controller mỏng (Skinny Controller)**: Chỉ tiếp nhận request, gọi Service/Action, trả về View hoặc JSON response.
   - **Service / Action Layer**: Đặt toàn bộ business logic (tính tiền, tạo hợp đồng, đổi trạng thái booking, gửi thông báo) trong `app/Services/` hoặc `app/Actions/`.
   - **Model giàu nghiệp vụ (Fat Model/Repository)**: Chỉ chứa quan hệ (Relationships), Scopes, Mutators/Accessors, Casts.
2. **Xác thực dữ liệu (Form Request Validation)**:
   - Tất cả request payload phải được validate qua **Form Request** riêng (`app/Http/Requests/...`), không validate inline trong Controller.
3. **Phân quyền (Policies & Gates)**:
   - Sử dụng Laravel Policy (`app/Policies/...`) để kiểm tra quyền truy cập tài nguyên (ví dụ: KOL chỉ xem/sửa được booking của chính mình).
4. **API & Response Format**:
   - Sử dụng **API Resources** (`app/Http/Resources/...`) để format dữ liệu trả về cho client.
   - Chuẩn response thống nhất:
     ```json
     {
       "success": true,
       "message": "Thông báo",
       "data": { ... }
     }
     ```
5. **Database & Migration**:
   - Tên bảng: số nhiều, snake_case (`users`, `kol_profiles`, `services`, `bookings`, `payments`, `reviews`).
   - Khóa ngoại (Foreign Keys): sử dụng `constrained()->onDelete('cascade')` hoặc quy tắc phù hợp.
   - Luôn sử dụng Migration, Factory và Seeder cho dữ liệu mẫu.

---

## 3. Các Phân Hệ & Thực Thể Dữ Liệu Chính

| Thực thể (Model) | Bảng dữ liệu | Trách nhiệm chính |
| :--- | :--- | :--- |
| `User` | `users` | Tài khoản hệ thống (Admin, Brand, KOL) |
| `KolProfile` | `kol_profiles` | Hồ sơ KOL: bio, mạng xã hội, niche (làm đẹp, công nghệ...), rating, follower count |
| `KolService` | `kol_services` | Dịch vụ cung cấp (Post bài, Video TikTok, Livestream, Review sản phẩm, v.v.), bảng giá |
| `Booking` | `bookings` | Quản lý đơn đặt lịch: ngày bắt đầu/kết thúc, yêu cầu chiến dịch, trạng thái |
| `Contract` | `contracts` | Hợp đồng / điều khoản cam kết giữa Brand và KOL |
| `Payment` | `payments` | Giao dịch đặt cọc, thanh toán đợt cuối, trạng thái cổng thanh toán (VNPay, MoMo, ngân hàng) |
| `Review` | `reviews` | Đánh giá, chấm sao sau khi hoàn tất chiến dịch |
| `Notification` | `notifications` | Thông báo trạng thái booking (Database, Mail, Broadcast) |

### Vòng đời Booking (Booking Lifecycle State Machine):
```text
[Khách tạo Booking] -> PENDING
        |
        v
[KOL duyệt / Thương thảo] -> ACCEPTED / REJECTED
        |
        v
[Khách đặt cọc / Escrow] -> DEPOSITED / IN_PROGRESS
        |
        v
[KOL nộp sản phẩm nghiệm thu] -> SUBMITTED
        |
        v
[Khách xác nhận hoàn thành] -> COMPLETED -> [Giải ngân & Đánh giá]
        |
(Trường hợp có tranh chấp) -> DISPUTED / CANCELLED
```

---

## 4. Quy Trình Bắt Buộc Khi Thực Hiện Yêu Cầu (Workflow)

Đối với **mọi tác vụ phát triển**:
1. **Rà soát hiện trạng**: Chạy kiểm tra cấu trúc dự án và các file liên quan trước khi tạo/sửa code.
2. **Áp dụng đúng chuẩn Laravel**: Dùng Artisan command khi cần (`php artisan make:model ... -mcr`), tổ chức code đúng thư mục.
3. **An toàn & Bảo mật**: Validate chặt chẽ, chống SQL Injection (dùng Eloquent/Query Builder bindings), CSRF token trên form, sanitize HTML.
4. **Kiểm thử**: Viết hoặc kiểm tra mã đảm bảo không phát sinh lỗi syntax/runtime.
