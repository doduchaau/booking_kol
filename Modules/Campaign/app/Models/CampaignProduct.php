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
        'images',
        'product_url',
        'retail_price',
        'brief_content',
        'brief_file',
        'brief_files',
        'hashtags',
        'sample_requirement',
        'sort_order',
    ];

    protected $casts = [
        'retail_price' => 'decimal:2',
        'sort_order' => 'integer',
        'images' => 'array',
        'brief_files' => 'array',
    ];

    protected $appends = [
        'product_name',
        'product_sku',
        'brief_file_url',
        'brief_file_name',
        'image_urls',
        'brief_file_items',
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

    public function getThumbnailUrlAttribute(): ?string
    {
        $thumb = $this->attributes['thumbnail_url'] ?? null;
        if ($thumb) {
            return str_starts_with($thumb, 'http://') || str_starts_with($thumb, 'https://')
                ? $thumb
                : asset('storage/' . $thumb);
        }

        // Fallback vào ảnh đầu tiên trong mảng images nếu có
        $images = $this->images ?? [];
        if (!empty($images) && is_array($images)) {
            $first = $images[0];
            $path = is_array($first) ? ($first['path'] ?? null) : $first;
            if ($path) {
                return str_starts_with($path, 'http://') || str_starts_with($path, 'https://')
                    ? $path
                    : asset('storage/' . $path);
            }
        }

        return null;
    }

    public function getImageUrlsAttribute(): array
    {
        $images = $this->images ?? [];
        if (empty($images) || !is_array($images)) {
            $thumb = $this->attributes['thumbnail_url'] ?? null;
            if ($thumb) {
                return [[
                    'path' => $thumb,
                    'url' => str_starts_with($thumb, 'http') ? $thumb : asset('storage/' . $thumb),
                    'name' => basename($thumb),
                ]];
            }
            return [];
        }

        $result = [];
        foreach ($images as $img) {
            $path = is_array($img) ? ($img['path'] ?? null) : $img;
            if (!$path) continue;

            $result[] = [
                'path' => $path,
                'url' => str_starts_with($path, 'http') ? $path : asset('storage/' . $path),
                'name' => is_array($img) && !empty($img['name']) ? $img['name'] : basename($path),
            ];
        }

        return $result;
    }

    public function getBriefFileItemsAttribute(): array
    {
        $files = $this->brief_files ?? [];
        if (!empty($files) && is_array($files)) {
            $result = [];
            foreach ($files as $f) {
                if (is_array($f) && !empty($f['path'])) {
                    $result[] = [
                        'path' => $f['path'],
                        'name' => $f['name'] ?? basename($f['path']),
                        'size' => $f['size'] ?? null,
                        'type' => $f['type'] ?? null,
                        'url' => asset('storage/' . $f['path']),
                    ];
                } elseif (is_string($f)) {
                    $result[] = [
                        'path' => $f,
                        'name' => basename($f),
                        'size' => null,
                        'type' => null,
                        'url' => asset('storage/' . $f),
                    ];
                }
            }
            return $result;
        }

        // Fallback file brief đơn cũ
        if ($this->brief_file) {
            return [[
                'path' => $this->brief_file,
                'name' => $this->brief_file_name ?? basename($this->brief_file),
                'size' => null,
                'type' => null,
                'url' => $this->brief_file_url,
            ]];
        }

        return [];
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
