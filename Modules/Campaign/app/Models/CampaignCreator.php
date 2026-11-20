<?php

namespace Modules\Campaign\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
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
        'sample_shipment_history',
        'chat_evidences_count',
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
     * Danh sách lịch sử các đợt gửi mẫu cho KOC (Evidence history)
     */
    public function sampleLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CampaignCreatorSampleLog::class, 'campaign_creator_id')
            ->orderBy('shipped_at', 'desc')
            ->orderBy('id', 'desc');
    }

    /**
     * Danh sách bằng chứng / bằng chứng tin nhắn đối soát với KOC
     */
    public function chatEvidences(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CampaignCreatorChatEvidence::class, 'campaign_creator_id')
            ->latest('id');
    }

    public function getChatEvidencesCountAttribute(): int
    {
        if ($this->relationLoaded('chatEvidences')) {
            return $this->chatEvidences->count();
        }

        return (int) ($this->attributes['chat_evidences_count'] ?? $this->chatEvidences()->count());
    }

    /**
     * Danh sách lời mời nhóm trao đổi chiến dịch
     */
    public function groupInvites(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\Modules\Outreach\Models\GroupInvite::class, 'campaign_creator_id')->latest('id');
    }

    /**
     * Sinh token truy cập cổng Portal an toàn ngẫu nhiên 64 ký tự.
     * Nếu $expireDays = null, sẽ đọc từ cấu hình hệ thống Setting::get('portal_token_expire_days', 30).
     * Nếu số ngày <= 0, token sẽ không bao giờ hết hạn (portal_token_expires_at = null).
     */
    public function generatePortalToken(?int $expireDays = null): string
    {
        if ($expireDays === null) {
            $expireDays = class_exists(\Modules\Settings\Models\Setting::class)
                ? (int) \Modules\Settings\Models\Setting::get('portal_token_expire_days', 30)
                : 30;
        }

        $token = Str::random(64);
        $expiresAt = $expireDays > 0 ? now()->addDays($expireDays) : null;

        $this->update([
            'portal_token' => $token,
            'portal_token_expires_at' => $expiresAt,
        ]);

        return $token;
    }

    /**
     * Gia hạn thêm thời gian sử dụng cho đường link Portal hiện tại.
     * Nếu không truyền $days, sẽ lấy từ cấu hình Setting::get('portal_token_extend_days', 14).
     */
    public function extendPortalToken(?int $days = null): void
    {
        if ($days === null) {
            $days = class_exists(\Modules\Settings\Models\Setting::class)
                ? (int) \Modules\Settings\Models\Setting::get('portal_token_extend_days', 14)
                : 14;
        }

        // Nếu token chưa có thì sinh mới
        if (!$this->portal_token) {
            $this->generatePortalToken();
            return;
        }

        // Tính mốc bắt đầu gia hạn: nếu chưa hết hạn thì cộng nối tiếp, nếu đã quá hạn thì tính từ now()
        $baseTime = ($this->portal_token_expires_at && $this->portal_token_expires_at->isFuture())
            ? $this->portal_token_expires_at
            : now();

        $this->update([
            'portal_token_expires_at' => $baseTime->copy()->addDays($days),
        ]);
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
     * Danh sách nền tảng KOC cam kết làm (null nếu chưa giao kênh)
     */
    public function getBookingPlatformsAttribute($value): ?array
    {
        if (is_array($value)) {
            return !empty($value) ? array_values(array_unique($value)) : null;
        }

        if (is_string($value) && !empty($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded) && !empty($decoded)) {
                return array_values(array_unique($decoded));
            }
        }

        return null;
    }

    /**
     * Bảng tổng hợp trạng thái tiến độ video theo từng nền tảng KOC được giao
     */
    public function getPlatformDeliverablesAttribute(): array
    {
        $platforms = $this->booking_platforms ?: [];
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

    /**
     * Lịch sử các đợt gửi mẫu (Evidence) theo dòng thời gian
     */
    public function getSampleShipmentHistoryAttribute(): array
    {
        $logs = $this->relationLoaded('sampleLogs') ? $this->sampleLogs : $this->sampleLogs()->with('sentBy:id,name')->get();

        if ($logs->isNotEmpty()) {
            return $logs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'shipped_at' => $log->shipped_at ? Carbon::parse($log->shipped_at)->format('Y-m-d') : null,
                    'notes' => $log->notes,
                    'shipping_address' => $log->shipping_address,
                    'phone' => $log->phone,
                    'tracking_code' => $log->tracking_code,
                    'carrier_name' => $log->carrier_name,
                    'items' => $log->items ?: [],
                    'total_items_count' => (int) $log->total_items_count,
                    'sent_by' => $log->sentBy ? [
                        'id' => $log->sentBy->id,
                        'name' => $log->sentBy->name,
                    ] : null,
                    'created_at' => $log->created_at ? $log->created_at->toISOString() : null,
                ];
            })->values()->toArray();
        }

        // Tương thích ngược: Nếu KOC cũ đã có sample_sent_at nhưng chưa có bản ghi trong sample_logs
        if (!empty($this->sample_sent_at)) {
            $sentDate = Carbon::parse($this->sample_sent_at)->format('Y-m-d');
            $creatorProducts = $this->relationLoaded('creatorProducts')
                ? $this->creatorProducts
                : $this->creatorProducts()->with('campaignProduct')->get();

            $legacyItems = [];
            foreach ($creatorProducts as $cp) {
                $qty = (int) ($cp->quantity_sent ?: $cp->quantity_assigned ?: 1);
                $prod = $cp->campaignProduct;
                $legacyItems[] = [
                    'product_id' => $cp->campaign_product_id,
                    'product_name' => $prod ? $prod->name : 'Sản phẩm mẫu',
                    'sku' => $prod ? $prod->sku : null,
                    'quantity' => $qty,
                    'variant' => $cp->sample_variant,
                ];
            }

            return [
                [
                    'id' => 0,
                    'shipped_at' => $sentDate,
                    'notes' => $this->notes ?: 'Đợt gửi mẫu ban đầu',
                    'shipping_address' => $this->creator?->shipping_address,
                    'phone' => $this->creator?->phone,
                    'tracking_code' => null,
                    'carrier_name' => null,
                    'items' => $legacyItems,
                    'total_items_count' => !empty($legacyItems) ? array_sum(array_column($legacyItems, 'quantity')) : 1,
                    'sent_by' => null,
                    'created_at' => Carbon::parse($this->sample_sent_at)->toISOString(),
                ],
            ];
        }

        return [];
    }
}
