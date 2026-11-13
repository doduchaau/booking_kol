<?php

namespace Tests\Unit;

use App\Services\SystemCacheService;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SystemCacheServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_get_dashboard_cache_version_defaults_to_one(): void
    {
        $version = SystemCacheService::getDashboardCacheVersion();
        $this->assertSame(1, $version);
    }

    public function test_flush_dashboard_cache_increments_version(): void
    {
        $v1 = SystemCacheService::getDashboardCacheVersion();
        SystemCacheService::flushDashboardCache();
        $v2 = SystemCacheService::getDashboardCacheVersion();

        $this->assertGreaterThan($v1, $v2);
    }

    public function test_get_workspace_cache_version_defaults_to_one(): void
    {
        $version = SystemCacheService::getWorkspaceCacheVersion();
        $this->assertSame(1, $version);
    }

    public function test_flush_workspace_cache_increments_version(): void
    {
        $v1 = SystemCacheService::getWorkspaceCacheVersion();
        SystemCacheService::flushWorkspaceCache();
        $v2 = SystemCacheService::getWorkspaceCacheVersion();

        $this->assertGreaterThan($v1, $v2);
    }

    public function test_remember_dashboard_caches_and_invalidates_on_flush(): void
    {
        $callCount = 0;
        $evaluator = function () use (&$callCount) {
            $callCount++;
            return ['metric' => 100 * $callCount];
        };

        $result1 = SystemCacheService::rememberDashboard('test_key', 300, $evaluator);
        $this->assertSame(1, $callCount);
        $this->assertSame(100, $result1['metric']);

        // Gọi lại: nhận giá trị cache cũ
        $result2 = SystemCacheService::rememberDashboard('test_key', 300, $evaluator);
        $this->assertSame(1, $callCount);
        $this->assertSame(100, $result2['metric']);

        // Vô hiệu hóa cache
        SystemCacheService::flushDashboardCache();

        // Gọi lại: tính toán giá trị mới
        $result3 = SystemCacheService::rememberDashboard('test_key', 300, $evaluator);
        $this->assertSame(2, $callCount);
        $this->assertSame(200, $result3['metric']);
    }

    public function test_remember_workspace_caches_and_invalidates_on_flush(): void
    {
        $count = 0;
        $cb = function () use (&$count) {
            $count++;
            return $count * 5;
        };

        $r1 = SystemCacheService::rememberWorkspace('unassigned', 300, $cb);
        $this->assertSame(5, $r1);
        $this->assertSame(1, $count);

        $r2 = SystemCacheService::rememberWorkspace('unassigned', 300, $cb);
        $this->assertSame(5, $r2);
        $this->assertSame(1, $count);

        SystemCacheService::flushWorkspaceCache();

        $r3 = SystemCacheService::rememberWorkspace('unassigned', 300, $cb);
        $this->assertSame(10, $r3);
        $this->assertSame(2, $count);
    }

    public function test_flush_all_increments_all_versions(): void
    {
        $d1 = SystemCacheService::getDashboardCacheVersion();
        $w1 = SystemCacheService::getWorkspaceCacheVersion();

        SystemCacheService::flushAll();

        $d2 = SystemCacheService::getDashboardCacheVersion();
        $w2 = SystemCacheService::getWorkspaceCacheVersion();

        $this->assertGreaterThan($d1, $d2);
        $this->assertGreaterThan($w1, $w2);
    }
}

