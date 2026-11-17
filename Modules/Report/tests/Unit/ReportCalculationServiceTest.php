<?php

namespace Modules\Report\Tests\Unit;

use App\Services\SystemCacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Modules\Report\Services\ReportCalculationService;
use Tests\TestCase;

class ReportCalculationServiceTest extends TestCase
{
    use RefreshDatabase;
    public function test_flush_report_cache_updates_version_with_timestamp(): void
    {
        // Ban đầu chưa có key, Cache::get trả về giá trị mặc định 1
        Cache::forget('report_cache_ver:global');
        $this->assertEquals(1, Cache::get('report_cache_ver:global', 1));

        // Kích hoạt flushReportCache
        ReportCalculationService::flushReportCache();

        $updatedVer = (int) Cache::get('report_cache_ver:global');
        $this->assertGreaterThan(1, $updatedVer);
        $this->assertLessThanOrEqual(time(), $updatedVer);

        // Kiểm tra cho campaign cụ thể
        $campaignId = 999;
        ReportCalculationService::flushReportCache($campaignId);
        $campaignVer = (int) Cache::get("report_cache_ver:campaign_{$campaignId}");
        $this->assertGreaterThan(1, $campaignVer);
    }

    public function test_system_cache_service_flush_all_updates_dashboard_and_workspace(): void
    {
        Cache::forget('dashboard_cache_ver');
        Cache::forget('workspace_cache_ver');

        $this->assertEquals(1, SystemCacheService::getDashboardCacheVersion());
        $this->assertEquals(1, SystemCacheService::getWorkspaceCacheVersion());

        SystemCacheService::flushAll();

        $dashVer = SystemCacheService::getDashboardCacheVersion();
        $wsVer = SystemCacheService::getWorkspaceCacheVersion();

        $this->assertGreaterThan(1, $dashVer);
        $this->assertGreaterThan(1, $wsVer);
    }

    public function test_report_service_platform_comparison_structure(): void
    {
        $service = new ReportCalculationService();
        $metrics = $service->getPlatformComparisonMetrics();

        $this->assertIsArray($metrics);
        $this->assertArrayHasKey('platforms', $metrics);
        $this->assertArrayHasKey('total_platforms', $metrics);
        $this->assertArrayHasKey('total_views', $metrics);
        $this->assertArrayHasKey('total_cost', $metrics);
    }
}
