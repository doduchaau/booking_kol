<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthCheckController extends Controller
{
    /**
     * Kiểm tra trạng thái sức khỏe hạ tầng hệ thống
     */
    public function __invoke(): JsonResponse
    {
        $checks = [];
        $isHealthy = true;

        // 1. Kiểm tra Cơ sở dữ liệu (Database)
        try {
            $dbStart = microtime(true);
            DB::connection()->getPdo();
            DB::select('SELECT 1');
            $dbLatency = round((microtime(true) - $dbStart) * 1000, 2);

            $checks['database'] = [
                'status' => 'ok',
                'latency_ms' => $dbLatency,
            ];
        } catch (\Throwable $e) {
            $isHealthy = false;
            $checks['database'] = [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
            Log::error('HealthCheck: Database failure - ' . $e->getMessage());
        }

        // 2. Kiểm tra Cache / Redis
        try {
            $testKey = 'health_check_' . time();
            Cache::put($testKey, 'ok', 10);
            $cachedVal = Cache::get($testKey);
            Cache::forget($testKey);

            $checks['cache'] = [
                'status' => $cachedVal === 'ok' ? 'ok' : 'degraded',
                'driver' => config('cache.default'),
            ];
        } catch (\Throwable $e) {
            $isHealthy = false;
            $checks['cache'] = [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
            Log::error('HealthCheck: Cache failure - ' . $e->getMessage());
        }

        // 3. Kiểm tra Dung lượng Ổ đĩa (Storage Free Space)
        try {
            $storagePath = storage_path();
            $freeBytes = disk_free_space($storagePath);
            $totalBytes = disk_total_space($storagePath);
            $freeGb = round($freeBytes / (1024 * 1024 * 1024), 2);
            $totalGb = round($totalBytes / (1024 * 1024 * 1024), 2);

            $checks['storage'] = [
                'status' => $freeGb > 1.0 ? 'ok' : 'warning',
                'free_space_gb' => $freeGb,
                'total_space_gb' => $totalGb,
            ];
        } catch (\Throwable $e) {
            $checks['storage'] = [
                'status' => 'unknown',
            ];
        }

        return response()->json([
            'status' => $isHealthy ? 'healthy' : 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'version' => '1.0.0',
            'checks' => $checks,
        ], $isHealthy ? 200 : 503);
    }
}

