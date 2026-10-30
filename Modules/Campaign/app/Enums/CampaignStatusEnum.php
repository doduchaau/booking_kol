<?php

namespace Modules\Campaign\Enums;

enum CampaignStatusEnum: string
{
    case DRAFT = 'draft';
    case ACTIVE = 'active';
    case COMPLETED = 'completed';
    case PAUSED = 'paused';

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Bản nháp',
            self::ACTIVE => 'Đang chạy',
            self::COMPLETED => 'Đã kết thúc',
            self::PAUSED => 'Tạm dừng',
        };
    }

    public function badgeVariant(): string
    {
        return match ($this) {
            self::DRAFT => 'default',
            self::ACTIVE => 'success',
            self::COMPLETED => 'primary',
            self::PAUSED => 'warning',
        };
    }
}
