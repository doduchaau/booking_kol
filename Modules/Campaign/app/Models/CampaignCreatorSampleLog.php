<?php

namespace Modules\Campaign\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignCreatorSampleLog extends Model
{
    use HasFactory;

    protected $table = 'campaign_creator_sample_logs';

    protected $fillable = [
        'campaign_creator_id',
        'sent_by_user_id',
        'shipped_at',
        'notes',
        'shipping_address',
        'phone',
        'tracking_code',
        'carrier_name',
        'items',
        'total_items_count',
    ];

    protected $casts = [
        'shipped_at' => 'date:Y-m-d',
        'items' => 'array',
        'total_items_count' => 'integer',
    ];

    public function campaignCreator(): BelongsTo
    {
        return $this->belongsTo(CampaignCreator::class, 'campaign_creator_id');
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }
}
