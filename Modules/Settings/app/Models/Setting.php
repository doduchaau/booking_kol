<?php

namespace Modules\Settings\Models;

use Illuminate\Database\Eloquent\Model;
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
     * Lấy giá trị của một cài đặt
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (!$setting || $setting->value === null) {
            return $default;
        }

        if ($setting->is_encrypted) {
            try {
                return Crypt::decryptString($setting->value);
            } catch (\Exception $e) {
                Log::warning("Không thể giải mã cấu hình [{$key}]: " . $e->getMessage());
                return $default;
            }
        }

        return $setting->value;
    }

    /**
     * Lưu hoặc cập nhật một cài đặt
     */
    public static function set(string $key, mixed $value, string $group = 'general', bool $isEncrypted = false): static
    {
        $storedValue = $value;
        if ($isEncrypted && $value !== null && $value !== '') {
            $storedValue = Crypt::encryptString((string) $value);
        }

        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $storedValue,
                'group' => $group,
                'is_encrypted' => $isEncrypted,
            ]
        );
    }
}

