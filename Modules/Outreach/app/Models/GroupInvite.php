<?php

namespace Modules\Outreach\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Campaign\Models\CampaignCreator;

class GroupInvite extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_creator_id',
        'group_name',
        'group_link',
        'status',
        'invited_at',
        'verified_at',
        'verified_by',
        'notes',
    ];

    protected $casts = [
        'invited_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function campaignCreator(): BelongsTo
    {
        return $this->belongsTo(CampaignCreator::class, 'campaign_creator_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}

