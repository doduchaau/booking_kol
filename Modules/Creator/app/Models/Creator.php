<?php

namespace Modules\Creator\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Creator\Enums\CreatorTierEnum;

class Creator extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'shipping_address',
        'city_province',
        'district',
        'ward',
        'niche',
        'tier',
        'trust_score',
        'blacklist_status',
        'blacklist_reason',
        'notes',
        'merged_into_creator_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tier' => CreatorTierEnum::class,
        'trust_score' => 'integer',
        'blacklist_status' => 'boolean',
    ];

    /**
     * Danh sách tài khoản mạng xã hội của Creator
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(CreatorAccount::class, 'creator_id');
    }

    /**
     * Bảng giá dịch vụ của Creator
     */
    public function rateCards(): HasMany
    {
        return $this->hasMany(CreatorRateCard::class, 'creator_id');
    }

    /**
     * Hồ sơ gốc master (nếu hồ sơ này đã bị gộp)
     */
    public function masterProfile(): BelongsTo
    {
        return $this->belongsTo(Creator::class, 'merged_into_creator_id');
    }

    /**
     * Danh sách các hồ sơ con đã bị gộp vào hồ sơ này
     */
    public function mergedProfiles(): HasMany
    {
        return $this->hasMany(Creator::class, 'merged_into_creator_id');
    }

    /**
     * Người tạo hồ sơ
     */
    public function creatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope tìm kiếm đa năng (theo Tên, Số điện thoại, Email hoặc Handle)
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        if (empty($term)) {
            return $query;
        }

        $term = trim($term);

        return $query->where(function (Builder $q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('phone', 'like', "%{$term}%")
              ->orWhere('email', 'like', "%{$term}%")
              ->orWhereHas('accounts', function (Builder $accountQuery) use ($term) {
                  $accountQuery->where('handle', 'like', "%{$term}%");
              });
        });
    }

    /**
     * Scope bộ lọc đa điều kiện
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['tier'] ?? null, fn (Builder $q, $tier) => $q->where('tier', $tier))
            ->when($filters['niche'] ?? null, fn (Builder $q, $niche) => $q->where('niche', $niche))
            ->when(isset($filters['blacklist']), fn (Builder $q) => $q->where('blacklist_status', (bool) $filters['blacklist']))
            ->when($filters['search'] ?? null, fn (Builder $q, $search) => $q->search($search));
    }
}
