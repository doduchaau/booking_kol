<?php

namespace Modules\Content\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Campaign\Models\CampaignCreator;

class ContentPost extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'content_posts';

    protected $fillable = [
        'campaign_creator_id',
        'platform',
        'post_url',
        'post_id',
        'video_title',
        'posted_at',
        'status',
        'views_count',
        'likes_count',
        'comments_count',
        'shares_count',
        'gmv_amount',
        'last_synced_at',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'views_count' => 'integer',
        'likes_count' => 'integer',
        'comments_count' => 'integer',
        'shares_count' => 'integer',
        'gmv_amount' => 'decimal:2',
    ];

    public function campaignCreator(): BelongsTo
    {
        return $this->belongsTo(CampaignCreator::class, 'campaign_creator_id');
    }

    public function metrics(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ContentPostMetric::class, 'content_post_id')->orderBy('recorded_date', 'asc');
    }

    public function latestMetric(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ContentPostMetric::class, 'content_post_id')->latestOfMany('recorded_date');
    }

    /**
     * Tính deadline lên video theo cấu hình chiến dịch (mặc định 7 ngày kể từ khi nhận hàng sample_received_at)
     */
    public function getCalculatedDeadlineAttribute(): ?\Carbon\Carbon
    {
        $deadlineDays = (int) ($this->campaignCreator?->campaign?->video_deadline_days ?: 7);

        $receivedAt = $this->campaignCreator?->sample_received_at;
        if ($receivedAt) {
            return $receivedAt->copy()->addDays($deadlineDays);
        }

        $sampleSentAt = $this->campaignCreator?->sample_sent_at;
        if ($sampleSentAt) {
            return $sampleSentAt->copy()->addDays(3 + $deadlineDays); // 3 ngày vận chuyển + số ngày quay video
        }

        return $this->created_at ? $this->created_at->copy()->addDays($deadlineDays + 7) : null;
    }
}
