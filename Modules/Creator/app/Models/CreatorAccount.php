<?php

namespace Modules\Creator\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Creator\Enums\PlatformEnum;

class CreatorAccount extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'creator_id',
        'platform',
        'handle',
        'url',
        'followers_count',
        'engagement_rate',
        'view_engagement_rate',
        'average_views',
        'average_likes',
        'average_comments',
        'average_shares',
        'posts_sample_count',
        'gmv_estimate',
        'data_source',
        'last_metrics_updated_at',
        'last_synced_at',
        'sync_status',
        'sync_error_message',
        'raw_metrics',
    ];

    protected $casts = [
        'platform' => PlatformEnum::class,
        'followers_count' => 'integer',
        'engagement_rate' => 'float',
        'view_engagement_rate' => 'float',
        'average_views' => 'integer',
        'average_likes' => 'integer',
        'average_comments' => 'integer',
        'average_shares' => 'integer',
        'posts_sample_count' => 'integer',
        'gmv_estimate' => 'integer',
        'last_metrics_updated_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'raw_metrics' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Creator::class, 'creator_id');
    }

    public function metricsHistories(): HasMany
    {
        return $this->hasMany(CreatorMetricsHistory::class, 'creator_account_id');
    }
}
