<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorRateCard;

/**
 * Class Kol
 * Đại diện thực thể KOL / KOC trong hệ thống Booking (Ánh xạ bảng creators)
 */
class Kol extends Creator
{
    protected $table = 'creators';

    /**
     * Tài khoản mạng xã hội chính hoặc đầu tiên của KOL
     */
    public function primaryAccount(): HasOne
    {
        return $this->hasOne(CreatorAccount::class, 'creator_id')->oldestOfMany();
    }

    /**
     * Tài khoản TikTok
     */
    public function tiktokAccount(): HasOne
    {
        return $this->hasOne(CreatorAccount::class, 'creator_id')->where('platform', 'tiktok');
    }

    /**
     * Danh sách tài khoản đa nền tảng
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(CreatorAccount::class, 'creator_id');
    }

    /**
     * Bảng giá dịch vụ
     */
    public function rateCards(): HasMany
    {
        return $this->hasMany(CreatorRateCard::class, 'creator_id');
    }
}

