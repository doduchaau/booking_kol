<?php

namespace Modules\Creator\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreatorMetricsHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'creator_account_id',
        'followers_count',
        'average_views',
        'average_likes',
        'average_comments',
        'average_shares',
        'engagement_rate',
        'view_engagement_rate',
        'posts_sample_count',
        'snapshot_date',
    ];

    protected $casts = [
        'followers_count' => 'integer',
        'average_views' => 'integer',
        'average_likes' => 'integer',
        'average_comments' => 'integer',
        'average_shares' => 'integer',
        'engagement_rate' => 'float',
        'view_engagement_rate' => 'float',
        'posts_sample_count' => 'integer',
        'snapshot_date' => 'date',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(CreatorAccount::class, 'creator_account_id');
    }
}
