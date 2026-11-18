<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Role;

class AuthHelper
{
    protected static ?bool $hasRoles = null;

    /**
     * Kiểm tra xem hệ thống phân quyền Roles đã được khởi tạo hay chưa (có memoization và cache để tránh truy vấn DB lặp lại)
     */
    public static function hasRoles(): bool
    {
        if (app()->environment('testing')) {
            return Role::count() > 0;
        }

        if (static::$hasRoles !== null) {
            return static::$hasRoles;
        }

        return static::$hasRoles = (bool) Cache::remember('system_has_roles_initialized', 3600, function () {
            return Role::query()->exists();
        });
    }

    /**
     * Kiểm tra nhanh xem người dùng có phải là Admin hoặc Leader hay không
     */
    public static function isLeaderOrAdmin(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (!static::hasRoles()) {
            return true;
        }

        return $user->hasAnyRole(['Admin', 'Leader']);
    }

    /**
     * Xóa cache trạng thái Roles khi có thay đổi vai trò
     */
    public static function clearCache(): void
    {
        static::$hasRoles = null;
        Cache::forget('system_has_roles_initialized');
    }
}
