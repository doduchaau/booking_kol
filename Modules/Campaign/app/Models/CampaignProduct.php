<?php

namespace Modules\Campaign\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignProduct extends Model
{
    use HasFactory;

    protected $table = 'campaign_products';

    protected $fillable = [
        'campaign_id',
        'name',
        'product_name',
        'sku',
        'product_sku',
        'thumbnail_url',
        'product_url',
        'retail_price',
        'brief_content',
        'brief_file',
        'hashtags',
        'sample_requirement',
        'sort_order',
    ];

    protected $casts = [
        'retail_price' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    protected $appends = [
        'product_name',
        'product_sku',
        'brief_file_url',
        'brief_file_name',
    ];

    public function getProductNameAttribute(): ?string
    {
        return $this->attributes['name'] ?? null;
    }

    public function setProductNameAttribute(?string $value): void
    {
        $this->attributes['name'] = $value;
    }

    public function getProductSkuAttribute(): ?string
    {
        return $this->attributes['sku'] ?? null;
    }

    public function setProductSkuAttribute(?string $value): void
    {
        $this->attributes['sku'] = $value;
    }

    public function getBriefFileUrlAttribute(): ?string
    {
        return $this->brief_file ? asset('storage/' . $this->brief_file) : null;
    }

    public function getBriefFileNameAttribute(): ?string
    {
        return $this->brief_file ? basename($this->brief_file) : null;
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function creatorProducts(): HasMany
    {
        return $this->hasMany(CampaignCreatorProduct::class, 'campaign_product_id');
    }
}
