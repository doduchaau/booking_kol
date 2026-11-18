<?php

namespace Modules\Settings\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class Setting extends Model
{
    protected $table = 'settings';

    protected $fillable = [
        'key',
        'value',
        'group',
        'is_encrypted',
    ];

    protected $casts = [
        'is_encrypted' => 'boolean',
    ];

    /**
     * Bộ nhớ đệm runtime trong cùng một vòng đời request
     */
    protected static ?array $runtimeCache = null;

    protected static function booted(): void
    {
        static::saved(fn () => static::clearCache());
        static::deleted(fn () => static::clearCache());
    }

    /**
     * Tải và giải mã toàn bộ cấu hình vào cache (giảm từ N câu query xuống 0 query trong request)
     */
    public static function loadAll(): array
    {
        if (static::$runtimeCache !== null) {
            return static::$runtimeCache;
        }

        try {
            static::$runtimeCache = Cache::remember('system_settings_map', 3600, function () {
                $rows = static::query()->get();
                $map = [];
                foreach ($rows as $row) {
                    $val = $row->value;
                    if ($row->is_encrypted && $val !== null && $val !== '') {
                        try {
                            $val = Crypt::decryptString($val);
                        } catch (\Throwable $e) {
                            Log::warning("Không thể giải mã cấu hình [{$row->key}]: " . $e->getMessage());
                        }
                    }
                    $map[$row->key] = $val;
                }
                return $map;
            });
        } catch (\Throwable $e) {
            static::$runtimeCache = [];
        }

        return static::$runtimeCache ?? [];
    }

    /**
     * Lấy giá trị của một cài đặt (Đọc trực tiếp từ bộ nhớ đệm Cache/Runtime)
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $all = static::loadAll();
        if (array_key_exists($key, $all) && $all[$key] !== null) {
            return $all[$key];
        }

        return $default;
    }

    /**
     * Lưu hoặc cập nhật một cài đặt và làm mới cache
     */
    public static function set(string $key, mixed $value, string $group = 'general', bool $isEncrypted = false): static
    {
        $storedValue = $value;
        if ($isEncrypted && $value !== null && $value !== '') {
            $storedValue = Crypt::encryptString((string) $value);
        }

        $result = static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $storedValue,
                'group' => $group,
                'is_encrypted' => $isEncrypted,
            ]
        );

        static::clearCache();

        return $result;
    }

    /**
     * Xóa sạch cache cấu hình hệ thống
     */
    public static function clearCache(): void
    {
        static::$runtimeCache = null;
        Cache::forget('system_settings_map');
    }
}

