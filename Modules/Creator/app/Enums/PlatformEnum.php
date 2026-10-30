<?php

namespace Modules\Creator\Enums;

enum PlatformEnum: string
{
    case TIKTOK = 'tiktok';
    case FACEBOOK = 'facebook';
    case SHOPEE = 'shopee';
    case ZALO = 'zalo';
    case YOUTUBE = 'youtube';
    case INSTAGRAM = 'instagram';

    public function label(): string
    {
        return match ($this) {
            self::TIKTOK => 'TikTok',
            self::FACEBOOK => 'Facebook',
            self::SHOPEE => 'Shopee',
            self::ZALO => 'Zalo',
            self::YOUTUBE => 'YouTube',
            self::INSTAGRAM => 'Instagram',
        };
    }
}
