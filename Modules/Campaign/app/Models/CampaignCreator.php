<?php

namespace Modules\Campaign\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Creator\Models\Creator;

class CampaignCreator extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'campaign_creators';

    protected $fillable = [
        'campaign_id',
        'creator_id',
        'assigned_to',
        'status',
        'booking_fee',
        'commission_rate',
        'portal_token',
        'portal_token_expires_at',
        'notes',
        'contacted_at',
        'agreed_at',
        'address_confirmed_at',
        'sample_sent_at',
        'sample_received_at',
        'posted_at',
        'completed_at',
        'declined_at',
        'no_show_at',
    ];

    protected $casts = [
        'status' => PipelineStatusEnum::class,
        'booking_fee' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'portal_token_expires_at' => 'datetime',
        'contacted_at' => 'datetime',
        'agreed_at' => 'datetime',
        'address_confirmed_at' => 'datetime',
        'sample_sent_at' => 'datetime',
        'sample_received_at' => 'datetime',
        'posted_at' => 'datetime',
        'completed_at' => 'datetime',
        'declined_at' => 'datetime',
        'no_show_at' => 'datetime',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Creator::class, 'creator_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Danh sách các video KOC đã lên trong chiến dịch (hỗ trợ lên nhiều video)
     */
    public function contentPosts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Content\Models\ContentPost::class, 'campaign_creator_id')->latest('id');
    }

    /**
     * Danh sách các tin nhắn Outreach đã gửi cho KOC
     */
    public function outreachMessages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Outreach\Models\OutreachMessage::class, 'campaign_creator_id')->latest('sent_at');
    }

    /**
     * Danh sách lời mời nhóm trao đổi chiến dịch
     */
    public function groupInvites(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Outreach\Models\GroupInvite::class, 'campaign_creator_id')->latest('id');
    }

    /**
     * Sinh token truy cập cổng Portal an toàn ngẫu nhiên 64 ký tự
     */
    public function generatePortalToken(int $expireDays = 14): string
    {
        $token = Str::random(64);
        $this->update([
            'portal_token' => $token,
            'portal_token_expires_at' => now()->addDays($expireDays),
        ]);

        return $token;
    }
}
