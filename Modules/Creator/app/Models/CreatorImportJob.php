<?php

namespace Modules\Creator\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CreatorImportJob extends Model
{
    protected $fillable = [
        'user_id',
        'file_name',
        'file_token',
        'file_path',
        'file_format',
        'total_rows',
        'processed_rows',
        'imported_count',
        'updated_count',
        'skipped_count',
        'status',
        'custom_mapping',
        'auto_enrich',
        'header_row_index',
        'headers',
        'errors',
        'error_message',
        'completed_at',
    ];

    protected $casts = [
        'custom_mapping' => 'array',
        'headers' => 'array',
        'errors' => 'array',
        'auto_enrich' => 'boolean',
        'total_rows' => 'integer',
        'processed_rows' => 'integer',
        'imported_count' => 'integer',
        'updated_count' => 'integer',
        'skipped_count' => 'integer',
        'header_row_index' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getProgressPercentAttribute(): int
    {
        if ($this->total_rows <= 0) {
            return $this->status === 'completed' ? 100 : 0;
        }

        return (int) min(100, round(($this->processed_rows / $this->total_rows) * 100));
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isProcessing(): bool
    {
        return $this->status === 'processing';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}

