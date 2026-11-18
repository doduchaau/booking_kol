<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class SystemCacheService
{
    /**
     * Lấy version cache của Dashboard (hỗ trợ mọi Cache driver: Redis, File, Database, Array)
     */
    public static function getDashboardCacheVersion(): int
    {
        return (int) Cache::get('dashboard_cache_ver', 1);
    }

    /**
     * Vô hiệu hóa cache Dashboard bằng cách gán Version timestamp mới
     */
    public static function flushDashboardCache(): void
    {
        $timestamp = time();
        try {
            Cache::forever('dashboard_cache_ver', $timestamp);
        } catch (\Throwable $e) {
            Cache::put('dashboard_cache_ver', $timestamp, 86400 * 30);
        }
    }

    /**
     * Ghi nhớ cache dữ liệu Dashboard theo Version
     */
    public static function rememberDashboard(string $key, int $ttlSeconds, callable $callback): mixed
    {
        $ver = self::getDashboardCacheVersion();
        $cacheKey = "dashboard:v{$ver}:{$key}";

        return Cache::remember($cacheKey, $ttlSeconds, $callback);
    }

    /**
     * Lấy version cache của Bàn làm việc (Workspace)
     */
    public static function getWorkspaceCacheVersion(): int
    {
        return (int) Cache::get('workspace_cache_ver', 1);
    }

    /**
     * Vô hiệu hóa cache Bàn làm việc bằng cách gán Version timestamp mới
     */
    public static function flushWorkspaceCache(): void
    {
        $timestamp = time();
        try {
            Cache::forever('workspace_cache_ver', $timestamp);
        } catch (\Throwable $e) {
            Cache::put('workspace_cache_ver', $timestamp, 86400 * 30);
        }
    }

    /**
     * Ghi nhớ cache Bàn làm việc theo Version
     */
    public static function rememberWorkspace(string $key, int $ttlSeconds, callable $callback): mixed
    {
        $ver = self::getWorkspaceCacheVersion();
        $cacheKey = "workspace:v{$ver}:{$key}";

        return Cache::remember($cacheKey, $ttlSeconds, $callback);
    }

    /**
     * Làm mới toàn bộ cache hệ thống
     */
    public static function flushAll(): void
    {
        self::flushDashboardCache();
        self::flushWorkspaceCache();

        if (class_exists(\Modules\Report\Services\ReportCalculationService::class)) {
            \Modules\Report\Services\ReportCalculationService::flushReportCache();
        }

        if (class_exists(\Modules\Settings\Models\Setting::class)) {
            \Modules\Settings\Models\Setting::clearCache();
        }

        \App\Services\AuthHelper::clearCache();

        Cache::forget('creators:available_niches');
    }
}

