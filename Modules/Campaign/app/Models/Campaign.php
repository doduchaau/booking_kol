<?php

namespace Modules\Campaign\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Creator\Models\Creator;

class Campaign extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'campaigns';

    protected $fillable = [
        'name',
        'product_name',
        'product_sku',
        'budget',
        'target_creators_count',
        'start_date',
        'end_date',
        'content_guidelines',
        'content_guidelines_file',
        'key_messages',
        'hashtags',
        'dos_and_donts',
        'discount_code',
        'affiliate_link',
        'sample_requirement',
        'sample_requirement_file',
        'video_deadline_days',
        'commission_rate',
        'status',
        'created_by',
    ];

    protected $appends = [
        'content_guidelines_file_url',
        'content_guidelines_file_name',
        'sample_requirement_file_url',
        'sample_requirement_file_name',
    ];

    protected $casts = [
        'budget' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'target_creators_count' => 'integer',
        'video_deadline_days' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'status' => CampaignStatusEnum::class,
    ];

    /**
     * URL tải file hướng dẫn kịch bản
     */
    public function getContentGuidelinesFileUrlAttribute(): ?string
    {
        return $this->content_guidelines_file ? asset('storage/' . $this->content_guidelines_file) : null;
    }

    /**
     * Tên file hướng dẫn kịch bản
     */
    public function getContentGuidelinesFileNameAttribute(): ?string
    {
        return $this->content_guidelines_file ? basename($this->content_guidelines_file) : null;
    }

    /**
     * URL tải file quy định gửi mẫu
     */
    public function getSampleRequirementFileUrlAttribute(): ?string
    {
        return $this->sample_requirement_file ? asset('storage/' . $this->sample_requirement_file) : null;
    }

    /**
     * Tên file quy định gửi mẫu
     */
    public function getSampleRequirementFileNameAttribute(): ?string
    {
        return $this->sample_requirement_file ? basename($this->sample_requirement_file) : null;
    }

    /**
     * Danh sách liên kết với Creator trong Pipeline
     */
    public function campaignCreators(): HasMany
    {
        return $this->hasMany(CampaignCreator::class, 'campaign_id');
    }

    /**
     * Danh sách Creator tham gia chiến dịch
     */
    public function creators(): BelongsToMany
    {
        return $this->belongsToMany(Creator::class, 'campaign_creators', 'campaign_id', 'creator_id')
            ->withPivot([
                'id',
                'status',
                'assigned_to',
                'booking_fee',
                'commission_rate',
                'portal_token',
                'notes',
                'sample_received_at',
                'posted_at',
            ])
            ->withTimestamps();
    }

    /**
     * Người tạo chiến dịch
     */
    public function creatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope bộ lọc tìm kiếm
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('name', 'like', "%{$search}%")
                        ->orWhere('product_name', 'like', "%{$search}%")
                        ->orWhere('product_sku', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] ?? null, function ($q, $status) {
                $q->where('status', $status);
            });
    }
}
