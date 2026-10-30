<?php

namespace Modules\Outreach\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OutreachTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'channel',
        'subject',
        'content_template',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(OutreachMessage::class, 'template_id');
    }
}

