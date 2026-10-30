<?php

namespace Modules\Creator\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Services\KolDiscoveryService;
use Tests\TestCase;

class KolDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_search_creators_by_keyword_and_niche(): void
    {
        $service = new KolDiscoveryService();
        $results = $service->search([
            'keyword' => 'son môi',
            'niche' => 'beauty',
            'platform' => 'tiktok',
            'limit' => 5,
        ]);

        $this->assertCount(5, $results);
        $this->assertEquals('tiktok', $results[0]['platform']);
        $this->assertNotEmpty($results[0]['handle']);
        $this->assertGreaterThan(0, $results[0]['followers_count']);
        $this->assertNotNull($results[0]['engagement_rate']);
    }

    public function test_can_import_selected_discovered_creators(): void
    {
        $service = new KolDiscoveryService();
        $items = [
            ['handle' => 'discovered_kol_test_1', 'platform' => 'tiktok'],
            ['handle' => 'discovered_kol_test_2', 'platform' => 'tiktok'],
        ];

        $imported = $service->importSelected($items);

        $this->assertEquals(2, $imported);
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'discovered_kol_test_1',
            'platform' => 'tiktok',
        ]);
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'discovered_kol_test_2',
            'platform' => 'tiktok',
        ]);
    }
}
