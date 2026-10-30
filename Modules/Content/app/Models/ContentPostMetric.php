<?php

namespace Modules\Content\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentPostMetric extends Model
{
    use HasFactory;

    protected $table = 'content_post_metrics';

    protected $fillable = [
        'content_post_id',
        'recorded_date',
        'views_count',
        'likes_count',
        'comments_count',
        'shares_count',
        'orders_count',
        'gmv_amount',
    ];

    protected $casts = [
        'recorded_date' => 'string',
        'views_count' => 'integer',
        'likes_count' => 'integer',
        'comments_count' => 'integer',
        'shares_count' => 'integer',
        'orders_count' => 'integer',
        'gmv_amount' => 'decimal:2',
    ];

    public function setRecordedDateAttribute($value): void
    {
        $this->attributes['recorded_date'] = $value instanceof \Carbon\CarbonInterface
            ? $value->format('Y-m-d')
            : (is_string($value) ? substr($value, 0, 10) : (string) $value);
    }

    public function contentPost(): BelongsTo
    {
        return $this->belongsTo(ContentPost::class, 'content_post_id');
    }
}
