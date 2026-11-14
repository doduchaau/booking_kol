<?php

namespace Modules\Campaign\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Campaign\Enums\SampleStatusEnum;

class CampaignCreatorProduct extends Model
{
    use HasFactory;

    protected $table = 'campaign_creator_products';

    protected $fillable = [
        'campaign_creator_id',
        'campaign_product_id',
        'quantity_assigned',
        'quantity_sent',
        'sample_variant',
        'sample_status',
        'sent_at',
        'received_at',
        'notes',
    ];

    protected $casts = [
        'quantity_assigned' => 'integer',
        'quantity_sent' => 'integer',
        'sample_status' => SampleStatusEnum::class,
        'sent_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function campaignCreator(): BelongsTo
    {
        return $this->belongsTo(CampaignCreator::class, 'campaign_creator_id');
    }

    public function campaignProduct(): BelongsTo
    {
        return $this->belongsTo(CampaignProduct::class, 'campaign_product_id');
    }
}

