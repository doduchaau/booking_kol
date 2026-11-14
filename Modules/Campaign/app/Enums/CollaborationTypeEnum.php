<?php

namespace Modules\Campaign\Enums;

enum CollaborationTypeEnum: string
{
    case VIDEO = 'video';
    case LIVESTREAM = 'livestream';
    case BOTH = 'both';

    public function label(): string
    {
        return match ($this) {
            self::VIDEO => 'Lên Video',
            self::LIVESTREAM => 'Livestream',
            self::BOTH => 'Cả Video & Live',
        };
    }
}

