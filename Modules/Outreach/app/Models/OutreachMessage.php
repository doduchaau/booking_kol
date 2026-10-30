<?php

namespace Modules\Outreach\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Campaign\Models\CampaignCreator;

class OutreachMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_creator_id',
        'channel',
        'sender_id',
        'template_id',
        'sent_content',
        'status',
        'external_message_id',
        'sent_at',
        'read_at',
        'replied_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'replied_at' => 'datetime',
    ];

    public function campaignCreator(): BelongsTo
    {
        return $this->belongsTo(CampaignCreator::class, 'campaign_creator_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(OutreachTemplate::class, 'template_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}

