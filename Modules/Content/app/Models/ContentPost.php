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

    protected $appends = [
        'calculated_deadline',
        'benchmark',
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

    /**
     * Đo lường hiệu quả video so sánh với phong độ trung bình của kênh (Benchmarking)
     */
    public function getBenchmarkAttribute(): array
    {
        $creator = $this->campaignCreator?->creator;
        $platform = $this->platform;
        $account = $creator?->accounts?->firstWhere('platform', $platform);

        $avgViews = (int) ($account?->average_views ?? 0);
        $postViews = (int) $this->views_count;

        // Nếu kênh chưa có chỉ số lượt xem trung bình, lấy mức chuẩn ngành theo phân hạng Tier
        if ($avgViews <= 0) {
            $tier = $creator?->tier?->value ?? ($creator?->tier ?? 'micro');
            $avgViews = match ($tier) {
                'nano' => 5_000,
                'micro' => 25_000,
                'macro' => 120_000,
                'mega' => 500_000,
                default => 20_000,
            };
        }

        $ratio = $avgViews > 0 ? round(($postViews / $avgViews) * 100, 1) : 0.0;

        $status = match (true) {
            $ratio >= 200.0 => 'viral',
            $ratio >= 120.0 => 'exceeded',
            $ratio >= 80.0 => 'expected',
            $ratio >= 50.0 => 'below',
            default => 'underperforming',
        };

        $label = match ($status) {
            'viral' => '🔥 Viral Đột Biến (' . number_format($ratio, 1) . '%)',
            'exceeded' => 'Vượt Kỳ Vọng (' . number_format($ratio, 1) . '%)',
            'expected' => 'Đạt Kỳ Vọng (' . number_format($ratio, 1) . '%)',
            'below' => 'Dưới Kỳ Vọng (' . number_format($ratio, 1) . '%)',
            'underperforming' => 'Kém Hiệu Quả (' . number_format($ratio, 1) . '%)',
        };

        return [
            'average_channel_views' => $avgViews,
            'current_views' => $postViews,
            'ratio' => $ratio,
            'status' => $status,
            'label' => $label,
        ];
    }
}
