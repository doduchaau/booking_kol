<?php

namespace Modules\Outreach\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OptOut extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone',
        'email',
        'reason',
        'channel',
        'requested_at',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
    ];
}

