<?php

namespace Modules\Campaign\Enums;

enum PipelineStatusEnum: string
{
    case NEW = 'new';
    case CONTACTED = 'contacted';
    case AGREED = 'agreed';
    case ADDRESS_CONFIRMED = 'address_confirmed';
    case SAMPLE_SENT = 'sample_sent';
    case SAMPLE_RECEIVED = 'sample_received';
    case POSTED = 'posted';
    case COMPLETED = 'completed';
    case DECLINED = 'declined';
    case NO_SHOW = 'no_show';

    public function label(): string
    {
        return match ($this) {
            self::NEW => 'Mới thêm',
            self::CONTACTED => 'Đã liên hệ',
            self::AGREED => 'Đồng ý / Chốt',
            self::ADDRESS_CONFIRMED => 'Đã chốt địa chỉ',
            self::SAMPLE_SENT => 'Đã gửi mẫu',
            self::SAMPLE_RECEIVED => 'Đã nhận mẫu',
            self::POSTED => 'Đã lên video',
            self::COMPLETED => 'Hoàn tất',
            self::DECLINED => 'Từ chối',
            self::NO_SHOW => 'Bom hàng / Mất tích',
        };
    }

    /**
     * Tên cột timestamp tương ứng trong DB khi chuyển trạng thái
     */
    public function timestampColumn(): ?string
    {
        return match ($this) {
            self::CONTACTED => 'contacted_at',
            self::AGREED => 'agreed_at',
            self::ADDRESS_CONFIRMED => 'address_confirmed_at',
            self::SAMPLE_SENT => 'sample_sent_at',
            self::SAMPLE_RECEIVED => 'sample_received_at',
            self::POSTED => 'posted_at',
            self::COMPLETED => 'completed_at',
            self::DECLINED => 'declined_at',
            self::NO_SHOW => 'no_show_at',
            default => null,
        };
    }

    /**
     * Danh sách các cột chính hiển thị trên bảng Kanban tiêu chuẩn
     */
    public static function kanbanColumns(): array
    {
        return [
            self::NEW,
            self::CONTACTED,
            self::AGREED,
            self::ADDRESS_CONFIRMED,
            self::SAMPLE_SENT,
            self::SAMPLE_RECEIVED,
            self::POSTED,
            self::COMPLETED,
            self::DECLINED,
            self::NO_SHOW,
        ];
    }
}
