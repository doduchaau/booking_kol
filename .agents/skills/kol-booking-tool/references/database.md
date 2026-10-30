# Thiết Kế Cơ Sở Dữ Liệu Chi Tiết (Database Schema & Indexing)

Tài liệu này đặc tả toàn bộ lược đồ cơ sở dữ liệu MySQL cho hệ thống Booking KOL/KOC, bao gồm quan hệ, chỉ mục (indexes), quy tắc ràng buộc, chuẩn hóa dữ liệu và cơ chế phát hiện trùng/gộp hồ sơ.

---

## 1. Nguyên Tắc Thiết Kế Chung

1. **Chuẩn hóa số điện thoại**: Mọi số điện thoại Việt Nam đều được chuẩn hóa về định dạng 10 chữ số bắt đầu bằng `0` (ví dụ: `0912345678`) trước khi lưu và tìm kiếm.
2. **Khóa chính**: Dùng `id` (bigint unsigned auto_increment) hoặc `uuid` cho các bản ghi chia sẻ ra ngoài (ví dụ: token bảo mật portal).
3. **Soft Deletes**: Áp dụng `deleted_at` cho các thực thể dữ liệu quan trọng (`creators`, `creator_accounts`, `campaigns`, `campaign_creators`).
4. **Audit Trail**: Bảng `activity_logs` ghi nhận mọi hành vi thay đổi trạng thái, sửa đổi thông tin nhạy cảm.
5. **Tiền tệ & Số liệu**: Cột tiền dùng `decimal(14,2)` hoặc `bigint` (VND không có số thập phân). Tỷ lệ tương tác dùng `decimal(5,2)` (%).

---

## 2. Danh Sách & Cấu Trúc Các Bảng Chính

### 2.1. Phân Hệ Quản Lý Hồ Sơ Creator

#### Bảng `creators`
Lưu trữ thông tin định danh chính của Creator.
```sql
CREATE TABLE `creators` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL COMMENT 'Tên thật hoặc nghệ danh của Creator',
  `phone` VARCHAR(20) NULL COMMENT 'Số điện thoại chuẩn hóa (bắt đầu bằng 0)',
  `email` VARCHAR(150) NULL,
  `shipping_address` VARCHAR(255) NULL COMMENT 'Địa chỉ nhận hàng chi tiết',
  `city_province` VARCHAR(100) NULL COMMENT 'Tỉnh / Thành phố',
  `district` VARCHAR(100) NULL COMMENT 'Quận / Huyện',
  `ward` VARCHAR(100) NULL COMMENT 'Phường / Xã',
  `niche` VARCHAR(100) NOT NULL COMMENT 'Ngành/Lĩnh vực: beauty, fashion, tech, food, lifestyle, baby, etc.',
  `tier` ENUM('nano', 'micro', 'macro', 'mega') NOT NULL DEFAULT 'nano',
  `trust_score` TINYINT UNSIGNED NOT NULL DEFAULT 100 COMMENT 'Điểm uy tín (0 - 100). Bị trừ khi trễ hạn/bom hàng',
  `blacklist_status` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Trạng thái cấm hợp tác',
  `blacklist_reason` TEXT NULL,
  `notes` TEXT NULL COMMENT 'Ghi chú phong cách làm việc, lưu ý giao tiếp',
  `merged_into_creator_id` BIGINT UNSIGNED NULL COMMENT 'ID của hồ sơ gốc nếu đã gộp',
  `created_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  UNIQUE KEY `uk_creators_phone_deleted` (`phone`, `deleted_at`),
  INDEX `idx_creators_tier_niche` (`tier`, `niche`),
  INDEX `idx_creators_blacklist` (`blacklist_status`),
  INDEX `idx_creators_trust_score` (`trust_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `creator_accounts`
Một Creator có thể sở hữu nhiều kênh trên các nền tảng mạng xã hội khác nhau.
```sql
CREATE TABLE `creator_accounts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `platform` ENUM('tiktok', 'facebook', 'shopee', 'zalo', 'youtube', 'instagram') NOT NULL,
  `handle` VARCHAR(150) NOT NULL COMMENT 'Username/Handle không dấu (vd: @duchauchannell)',
  `url` VARCHAR(255) NOT NULL COMMENT 'Đường link dẫn tới trang cá nhân',
  `followers_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `engagement_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Tỷ lệ tương tác (%)',
  `average_views` INT UNSIGNED NOT NULL DEFAULT 0,
  `gmv_estimate` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Ước tính GMV mang lại',
  `data_source` VARCHAR(50) NOT NULL DEFAULT 'manual' COMMENT 'manual, excel_import, kalodata, fastmoss, extension',
  `last_metrics_updated_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  UNIQUE KEY `uk_platform_handle_deleted` (`platform`, `handle`, `deleted_at`),
  INDEX `idx_creator_accounts_creator_id` (`creator_id`),
  FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `creator_rate_cards`
Bảng giá dịch vụ theo từng định dạng nội dung của Creator.
```sql
CREATE TABLE `creator_rate_cards` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `content_type` ENUM('tiktok_video', 'facebook_post', 'youtube_video', 'shopee_video', 'reels', 'livestream') NOT NULL,
  `price` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Giá booking tiêu chuẩn',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
  `notes` VARCHAR(255) NULL COMMENT 'Ghi chú gói (kèm bản quyền ảnh, link bio, etc.)',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_rate_cards_creator` (`creator_id`, `content_type`),
  FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.2. Phân Hệ Chiến Dịch & Pipeline Hợp Tác

#### Bảng `campaigns`
```sql
CREATE TABLE `campaigns` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `product_sku` VARCHAR(100) NULL,
  `budget` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `target_creators_count` SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `content_guidelines` TEXT NULL COMMENT 'Mô tả kịch bản, quy định cấm kỵ, hashtag bắt buộc',
  `sample_requirement` TEXT NULL COMMENT 'Quy định về mẫu sản phẩm trải nghiệm',
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '% hoa hồng affiliate nếu có',
  `status` ENUM('draft', 'active', 'completed', 'paused') NOT NULL DEFAULT 'draft',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  INDEX `idx_campaigns_status` (`status`),
  INDEX `idx_campaigns_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `campaign_creators`
Bảng nối trung tâm quản lý trạng thái luồng làm việc (Pipeline Kanban) của Creator trong một chiến dịch.
```sql
CREATE TABLE `campaign_creators` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `campaign_id` BIGINT UNSIGNED NOT NULL,
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `assigned_to` BIGINT UNSIGNED NULL COMMENT 'Nhân viên booking phụ trách',
  `status` ENUM(
    'new',               -- Mới thêm vào danh sách
    'contacted',         -- Đã liên hệ
    'agreed',            -- Creator đồng ý tham gia
    'address_confirmed', -- Đã xác nhận địa chỉ nhận hàng
    'sample_sent',       -- Đã tạo đơn chuyển mẫu
    'sample_received',   -- Creator đã nhận được sản phẩm
    'posted',            -- Đã lên video
    'completed',         -- Hoàn thành chiến dịch (nghiệm thu + đối soát)
    'declined',          -- Creator từ chối
    'no_show'            -- Nhận hàng nhưng bom/mất tích
  ) NOT NULL DEFAULT 'new',
  `booking_fee` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `commission_rate` DECIMAL(5,2) NULL,
  `portal_token` VARCHAR(64) NULL UNIQUE COMMENT 'Token bảo mật truy cập cổng tự điền',
  `portal_token_expires_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  -- Dấu mốc thời gian lưu vết từng trạng thái
  `contacted_at` TIMESTAMP NULL,
  `agreed_at` TIMESTAMP NULL,
  `address_confirmed_at` TIMESTAMP NULL,
  `sample_sent_at` TIMESTAMP NULL,
  `sample_received_at` TIMESTAMP NULL,
  `posted_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `declined_at` TIMESTAMP NULL,
  `no_show_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  UNIQUE KEY `uk_campaign_creator` (`campaign_id`, `creator_id`, `deleted_at`),
  INDEX `idx_pipeline_status` (`campaign_id`, `status`),
  INDEX `idx_pipeline_assigned` (`assigned_to`, `status`),
  INDEX `idx_pipeline_portal_token` (`portal_token`),
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.3. Phân Hệ Outreach & Nhóm Trao Đổi

#### Bảng `outreach_templates`
```sql
CREATE TABLE `outreach_templates` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `channel` ENUM('zalo_oa', 'zalo_personal', 'email', 'direct_message') NOT NULL,
  `subject` VARCHAR(200) NULL,
  `content_template` TEXT NOT NULL COMMENT 'Chứa placeholder: {creator_name}, {product_name}, {rate}, {portal_link}',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `outreach_messages`
```sql
CREATE TABLE `outreach_messages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `campaign_creator_id` BIGINT UNSIGNED NOT NULL,
  `channel` ENUM('zalo_oa', 'zalo_personal', 'email', 'direct_message') NOT NULL,
  `sender_id` BIGINT UNSIGNED NOT NULL COMMENT 'User thực hiện',
  `template_id` BIGINT UNSIGNED NULL,
  `sent_content` TEXT NOT NULL,
  `status` ENUM('draft', 'sent', 'delivered', 'read', 'replied', 'failed') NOT NULL DEFAULT 'sent',
  `external_message_id` VARCHAR(100) NULL,
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` TIMESTAMP NULL,
  `replied_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_outreach_cc` (`campaign_creator_id`),
  FOREIGN KEY (`campaign_creator_id`) REFERENCES `campaign_creators`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `group_invites`
Theo dõi việc thêm Creator vào group Zalo/Facebook trao đổi chiến dịch.
```sql
CREATE TABLE `group_invites` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `campaign_creator_id` BIGINT UNSIGNED NOT NULL,
  `group_name` VARCHAR(150) NOT NULL,
  `group_link` VARCHAR(255) NULL,
  `status` ENUM('pending', 'invited', 'joined', 'failed') NOT NULL DEFAULT 'pending',
  `invited_at` TIMESTAMP NULL,
  `verified_at` TIMESTAMP NULL,
  `verified_by` BIGINT UNSIGNED NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  FOREIGN KEY (`campaign_creator_id`) REFERENCES `campaign_creators`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `opt_outs`
Danh sách Creator từ chối nhận tin nhắn tiếp thị.
```sql
CREATE TABLE `opt_outs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(150) NULL,
  `reason` VARCHAR(255) NULL,
  `channel` VARCHAR(50) NOT NULL DEFAULT 'all',
  `requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_optout_phone` (`phone`),
  INDEX `idx_optout_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.4. Phân Hệ Nghiệm Thu Video (Content)

> [!NOTE]
> Bảng `shipments` đã bị loại bỏ hoàn toàn. Quy trình gửi mẫu được theo dõi trực tiếp qua các trường `sample_sent_at`, `sample_received_at` và `status` trong bảng `campaign_creators`.

#### Bảng `content_posts`
```sql
CREATE TABLE `content_posts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `campaign_creator_id` BIGINT UNSIGNED NOT NULL,
  `platform` ENUM('tiktok', 'facebook', 'youtube', 'instagram', 'shopee') NOT NULL,
  `post_url` VARCHAR(500) NOT NULL,
  `post_identifier` VARCHAR(100) NULL COMMENT 'Mã video/bài viết trên nền tảng',
  `deadline_at` DATE NOT NULL COMMENT 'Hạn chót phải lên video',
  `posted_at` TIMESTAMP NULL COMMENT 'Thời điểm lên video thực tế',
  `status` ENUM('pending_review', 'approved', 'published', 'rejected') NOT NULL DEFAULT 'pending_review',
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `likes_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `comments_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `shares_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `orders_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `revenue_gmv` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `last_metrics_fetched_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_content_posts_deadline` (`deadline_at`, `posted_at`),
  FOREIGN KEY (`campaign_creator_id`) REFERENCES `campaign_creators`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `content_post_metrics`
Lưu lịch sử tăng trưởng chỉ số theo ngày để vẽ biểu đồ và phân tích độ bền tương tác của video.
```sql
CREATE TABLE `content_post_metrics` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `content_post_id` BIGINT UNSIGNED NOT NULL,
  `recorded_date` DATE NOT NULL,
  `views_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `likes_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `comments_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `shares_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `orders_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `revenue_gmv` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NULL,
  UNIQUE KEY `uk_post_metric_date` (`content_post_id`, `recorded_date`),
  FOREIGN KEY (`content_post_id`) REFERENCES `content_posts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2.5. Phân Hệ Tài Chính & Nhật Ký Hoạt Động

#### Bảng `payments`
```sql
CREATE TABLE `payments` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `campaign_creator_id` BIGINT UNSIGNED NOT NULL,
  `payment_type` ENUM('booking_fee', 'milestone', 'commission', 'reimbursement') NOT NULL DEFAULT 'booking_fee',
  `amount` DECIMAL(14,2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
  `bank_name` VARCHAR(100) NULL,
  `bank_account_number` VARCHAR(50) NULL,
  `bank_account_holder` VARCHAR(150) NULL,
  `status` ENUM('draft', 'pending_approval', 'paid', 'rejected') NOT NULL DEFAULT 'draft',
  `proof_file_path` VARCHAR(255) NULL COMMENT 'Ủy nhiệm chi / hóa đơn chuyển khoản',
  `paid_at` TIMESTAMP NULL,
  `paid_by` BIGINT UNSIGNED NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  INDEX `idx_payments_status` (`status`),
  FOREIGN KEY (`campaign_creator_id`) REFERENCES `campaign_creators`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Bảng `activity_logs`
```sql
CREATE TABLE `activity_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `subject_type` VARCHAR(100) NOT NULL,
  `subject_id` BIGINT UNSIGNED NOT NULL,
  `causer_id` BIGINT UNSIGNED NULL,
  `event` VARCHAR(50) NOT NULL COMMENT 'created, updated, status_changed, merged, deleted',
  `description` VARCHAR(255) NOT NULL,
  `properties` JSON NULL COMMENT 'Lưu old_values và new_values',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_activity_subject` (`subject_type`, `subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Cơ Chế Phát Hiện Trùng & Gộp Hồ Sơ (Deduplication & Merge)

### 3.1. Quy Tắc Phát Hiện Trùng (Duplicate Detection)
Hệ thống kích hoạt cảnh báo trùng lặp khi một hồ sơ mới có ít nhất một trong các điều kiện:
1. Trùng số điện thoại đã chuẩn hóa (`creators.phone`).
2. Trùng tài khoản mạng xã hội (`platform` + `handle` trong `creator_accounts`).
3. Trùng `email` (nếu có cung cấp).

### 3.2. Quy Trình Gộp Hồ Sơ (Profile Merge Strategy)
Khi Leader/Admin xác nhận gộp `Creator B` vào `Creator A` (Hồ sơ gốc Master):
1. Cập nhật `Creator B`: đặt `merged_into_creator_id = Creator A.id` và thực hiện `soft delete`.
2. Chuyển toàn bộ các kênh `creator_accounts` của B sang cho A (nếu tài khoản đã tồn tại ở A thì giữ bản ghi có số follower/tương tác mới nhất).
3. Chuyển toàn bộ các liên kết `campaign_creators`, `payments`, `shipments` của B sang gắn với A.
4. Ghi nhận log chi tiết vào bảng `activity_logs` với `event = 'merged'` để có thể kiểm toán hoặc phục hồi khi cần.
