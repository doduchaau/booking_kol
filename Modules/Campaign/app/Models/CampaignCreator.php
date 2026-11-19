<?php

namespace Modules\Campaign\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Modules\Campaign\Enums\CollaborationTypeEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Creator\Models\Creator;

class CampaignCreator extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'campaign_creators';

    protected $fillable = [
        'campaign_id',
        'creator_id',
        'assigned_to',
        'status',
        'collaboration_type',
        'booking_platforms',
        'total_samples_assigned',
        'total_samples_sent',
        'live_target_gmv',
        'booking_fee',
        'commission_rate',
        'ads_commission_rate',
        'portal_token',
        'portal_token_expires_at',
        'notes',
        'contacted_at',
        'waiting_approval_at',
        'approved_cost_at',
        'approver_name',
        'approval_notes',
        'agreed_at',
        'address_confirmed_at',
        'sample_sent_at',
        'sample_received_at',
        'posted_at',
        'completed_at',
        'declined_at',
        'no_show_at',
    ];

    protected $appends = [
        'platform_deliverables',
    ];

    protected $casts = [
        'status' => PipelineStatusEnum::class,
        'collaboration_type' => CollaborationTypeEnum::class,
        'booking_platforms' => 'array',
        'total_samples_assigned' => 'integer',
        'total_samples_sent' => 'integer',
        'live_target_gmv' => 'decimal:2',
        'booking_fee' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'ads_commission_rate' => 'decimal:2',
        'portal_token_expires_at' => 'datetime',
        'contacted_at' => 'datetime',
        'waiting_approval_at' => 'datetime',
        'approved_cost_at' => 'datetime',
        'agreed_at' => 'datetime',
        'address_confirmed_at' => 'datetime',
        'sample_sent_at' => 'datetime',
        'sample_received_at' => 'datetime',
        'posted_at' => 'datetime',
        'completed_at' => 'datetime',
        'declined_at' => 'datetime',
        'no_show_at' => 'datetime',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Creator::class, 'creator_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Danh sách các video KOC đã lên trong chiến dịch (hỗ trợ lên nhiều video)
     */
    public function contentPosts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Content\Models\ContentPost::class, 'campaign_creator_id')->latest('id');
    }

    /**
     * Danh sách các tin nhắn Outreach đã gửi cho KOC
     */
    public function outreachMessages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Outreach\Models\OutreachMessage::class, 'campaign_creator_id')->latest('sent_at');
    }

    /**
     * Danh sách sản phẩm mẫu KOC được phân bổ & gửi trong chiến dịch
     */
    public function creatorProducts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CampaignCreatorProduct::class, 'campaign_creator_id')->with('campaignProduct');
    }

    /**
     * Danh sách lời mời nhóm trao đổi chiến dịch
     */
    public function groupInvites(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Outreach\Models\GroupInvite::class, 'campaign_creator_id')->latest('id');
    }

    /**
     * Sinh token truy cập cổng Portal an toàn ngẫu nhiên 64 ký tự
     */
    public function generatePortalToken(int $expireDays = 14): string
    {
        $token = Str::random(64);
        $this->update([
            'portal_token' => $token,
            'portal_token_expires_at' => now()->addDays($expireDays),
        ]);

        return $token;
    }

    /**
     * Kiểm tra KOC có đang ở trạng thái chờ duyệt chi phí hay không
     */
    public function isWaitingApproval(): bool
    {
        return $this->status === PipelineStatusEnum::WAITING_APPROVAL;
    }

    /**
     * Kiểm tra chi phí cast đã được xác nhận duyệt hay chưa
     * (Miễn phí = true; Có phí thì cần approved_cost_at != null)
     */
    public function hasApprovedCost(): bool
    {
        if ((float) $this->booking_fee <= 0) {
            return true;
        }

        return !is_null($this->approved_cost_at);
    }

    /**
     * Danh sách nền tảng KOC cam kết làm (Mặc định tiktok nếu chưa thiết lập)
     */
    public function getBookingPlatformsAttribute($value): array
    {
        if (is_array($value)) {
            return !empty($value) ? array_values(array_unique($value)) : ['tiktok'];
        }

        if (is_string($value) && !empty($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded) && !empty($decoded)) {
                return array_values(array_unique($decoded));
            }
        }

        return ['tiktok'];
    }

    /**
     * Bảng tổng hợp trạng thái tiến độ video theo từng nền tảng KOC được giao
     */
    public function getPlatformDeliverablesAttribute(): array
    {
        $platforms = $this->booking_platforms;
        $posts = $this->relationLoaded('contentPosts') ? $this->contentPosts : $this->contentPosts()->get();

        $deliverables = [];
        $completedCount = 0;

        foreach ($platforms as $platform) {
            $matchedPosts = $posts->filter(function ($post) use ($platform) {
                return strtolower((string) $post->platform) === strtolower((string) $platform);
            })->values();

            $hasPost = $matchedPosts->isNotEmpty();
            $latestPost = $hasPost ? $matchedPosts->first() : null;
            $isCompleted = $hasPost && ($latestPost->status === 'published' || $latestPost->status === 'approved' || !empty($latestPost->posted_at));

            if ($isCompleted) {
                $completedCount++;
            }

            $deliverables[] = [
                'platform' => $platform,
                'has_post' => $hasPost,
                'is_completed' => $isCompleted,
                'posts_count' => $matchedPosts->count(),
                'latest_post' => $latestPost ? [
                    'id' => $latestPost->id,
                    'post_url' => $latestPost->post_url,
                    'video_title' => $latestPost->video_title,
                    'status' => $latestPost->status,
                    'views_count' => (int) ($latestPost->views_count ?? 0),
                    'posted_at' => $latestPost->posted_at ? $latestPost->posted_at->format('d/m/Y') : null,
                ] : null,
            ];
        }

        return [
            'total_platforms' => count($platforms),
            'completed_platforms' => $completedCount,
            'is_all_completed' => count($platforms) > 0 && $completedCount >= count($platforms),
            'items' => $deliverables,
        ];
    }
}
