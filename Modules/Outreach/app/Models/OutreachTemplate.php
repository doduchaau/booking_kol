<?php

namespace Modules\Outreach\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OutreachTemplate extends Model
{
    use HasFactory;

    public const TYPE_REMIND_DEADLINE = 'remind_deadline';
    public const TYPE_REMIND_RECEIPT = 'remind_receipt';
    public const TYPE_BRIEF_OUTREACH = 'brief_outreach';
    public const TYPE_SHIPPING_NOTICE = 'shipping_notice';
    public const TYPE_CUSTOM = 'custom';

    protected $fillable = [
        'name',
        'type',
        'channel',
        'subject',
        'content_template',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(OutreachMessage::class, 'template_id');
    }

    public function getTypeLabel(): string
    {
        return match ($this->type) {
            self::TYPE_REMIND_DEADLINE => 'Nhắc Zalo: Đôn đốc Hạn nộp Video',
            self::TYPE_REMIND_RECEIPT => 'Nhắc Zalo: Nhắc Xác nhận Nhận Mẫu',
            self::TYPE_BRIEF_OUTREACH => 'Nhắc Zalo: Gửi Brief & Chào mời',
            self::TYPE_SHIPPING_NOTICE => 'Nhắc Zalo: Báo Đã Chuyển Kho',
            default => 'Mẫu tin nhắn chung',
        };
    }
}

