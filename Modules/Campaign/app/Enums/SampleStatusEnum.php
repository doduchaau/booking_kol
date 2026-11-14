<?php

namespace Modules\Campaign\Enums;

enum SampleStatusEnum: string
{
    case ASSIGNED = 'assigned';
    case SENT = 'sent';
    case RECEIVED = 'received';

    public function label(): string
    {
        return match ($this) {
            self::ASSIGNED => 'Chờ gửi mẫu',
            self::SENT => 'Đã gửi mẫu',
            self::RECEIVED => 'Đã nhận mẫu',
        };
    }
}

