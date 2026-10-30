<?php

namespace Modules\Creator\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Creator\Connectors\DataProviderConnector;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Jobs\SyncCreatorMetricsJob;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorMetricsHistory;
use Modules\Creator\Services\CreatorImportService;
use Modules\Creator\Services\KolDataAdapter;
use Tests\TestCase;

class SyncCreatorMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_job_creates_creator_account_and_metrics_history(): void
    {
        $handle = 'test_kol_auto_' . time();
        $platform = PlatformEnum::TIKTOK;

        $connector = new DataProviderConnector();
        $adapter = new KolDataAdapter();
        $importService = app(CreatorImportService::class);

        $job = new SyncCreatorMetricsJob(
            handle: $handle,
            platform: $platform,
            creatorId: null,
            forceRefresh: true
        );

        $job->handle($connector, $adapter, $importService);

        // Kiểm tra CreatorAccount được tạo thành công với status success
        $account = CreatorAccount::where('handle', $handle)
            ->where('platform', $platform->value)
            ->first();

        $this->assertNotNull($account);
        $this->assertEquals('success', $account->sync_status);
        $this->assertGreaterThan(0, $account->followers_count);
        $this->assertGreaterThan(0, $account->average_views);
        $this->assertNotNull($account->last_synced_at);

        $history = CreatorMetricsHistory::where('creator_account_id', $account->id)
            ->whereDate('snapshot_date', now()->toDateString())
            ->first();

        $this->assertNotNull($history);
        $this->assertEquals($account->followers_count, $history->followers_count);
        $this->assertEquals($account->average_views, $history->average_views);
    }
}
