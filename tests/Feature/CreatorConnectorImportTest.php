<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Creator\Connectors\ConnectorFactory;
use Modules\Creator\Connectors\ExcelCsvConnector;
use Modules\Creator\Connectors\FastMossExportConnector;
use Modules\Creator\Connectors\KalodataExportConnector;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Services\CreatorImportService;
use Tests\TestCase;

class CreatorConnectorImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_connector_factory_resolves_correct_connector(): void
    {
        // 1. Explicit formats
        $this->assertInstanceOf(KalodataExportConnector::class, ConnectorFactory::make('kalodata'));
        $this->assertInstanceOf(FastMossExportConnector::class, ConnectorFactory::make('fastmoss'));
        $this->assertInstanceOf(ExcelCsvConnector::class, ConnectorFactory::make('standard'));

        // 2. Auto-detection from headers
        $kalodataHeaders = ['Creator', 'TikTok Account', 'Fans', 'Revenue', 'ER', 'Contact'];
        $this->assertInstanceOf(KalodataExportConnector::class, ConnectorFactory::make('auto', $kalodataHeaders));

        $fastmossHeaders = ['Influencer', 'TikTok ID', 'Followers', 'Total GMV', 'Category'];
        $this->assertInstanceOf(FastMossExportConnector::class, ConnectorFactory::make('auto', $fastmossHeaders));

        $standardHeaders = ['name', 'phone', 'handle', 'followers_count', 'niche'];
        $this->assertInstanceOf(ExcelCsvConnector::class, ConnectorFactory::make('auto', $standardHeaders));
    }

    public function test_kalodata_export_connector_parses_metrics_and_contact(): void
    {
        $connector = app(KalodataExportConnector::class);

        $row = [
            'Creator' => 'Hannah Olala',
            'TikTok Account' => '@hannaholala',
            'Fans' => '1.2M',
            'Revenue' => '850000000',
            'ER' => '4.8%',
            'Avg Views' => '450K',
            'Category' => 'beauty',
            'Contact' => 'Zalo booking: 0988776655 | hannah@beauty.vn',
        ];

        $parsed = $connector->parse($row);

        $this->assertEquals('Hannah Olala', $parsed['name']);
        $this->assertEquals('hannaholala', $parsed['handle']);
        $this->assertEquals(1200000, $parsed['followers_count']);
        $this->assertEquals(850000000, $parsed['gmv_estimate']);
        $this->assertEquals(4.8, $parsed['engagement_rate']);
        $this->assertEquals(450000, $parsed['average_views']);
        $this->assertEquals('0988776655', $parsed['phone']);
        $this->assertEquals('hannah@beauty.vn', $parsed['email']);
        $this->assertEquals(CreatorTierEnum::MEGA, $parsed['tier']);
        $this->assertEquals(PlatformEnum::TIKTOK, $parsed['platform']);
        $this->assertEquals('kalodata', $parsed['data_source']);
    }

    public function test_fastmoss_export_connector_parses_metrics_and_contact(): void
    {
        $connector = app(FastMossExportConnector::class);

        $row = [
            'Influencer' => 'Duy Muối',
            'TikTok ID' => 'duymuoi',
            'Followers' => '850K',
            'Total GMV' => '1500000000',
            'Engagement' => '6.2%',
            'Median Views' => '320000',
            'Category' => 'entertainment',
            'Contact Info' => '0911223344 - duymuoi@dcgr.vn',
        ];

        $parsed = $connector->parse($row);

        $this->assertEquals('Duy Muối', $parsed['name']);
        $this->assertEquals('duymuoi', $parsed['handle']);
        $this->assertEquals(850000, $parsed['followers_count']);
        $this->assertEquals(1500000000, $parsed['gmv_estimate']);
        $this->assertEquals(6.2, $parsed['engagement_rate']);
        $this->assertEquals(320000, $parsed['average_views']);
        $this->assertEquals('0911223344', $parsed['phone']);
        $this->assertEquals('duymuoi@dcgr.vn', $parsed['email']);
        $this->assertEquals(CreatorTierEnum::MACRO, $parsed['tier']);
        $this->assertEquals('fastmoss', $parsed['data_source']);
    }

    public function test_creator_import_service_with_kalodata_file(): void
    {
        $csvContent = "Creator,TikTok Account,Fans,Revenue,ER,Avg Views,Contact,Category\n" .
                      "Trinh Pham,trinhpham,1.5M,500000000,4.2%,250000,0912345678,beauty\n" .
                      "An Tech,antech,250K,180000000,3.5%,80000,0987654321,tech\n";

        $file = UploadedFile::fake()->createWithContent('kalodata_export.csv', $csvContent);

        $service = app(CreatorImportService::class);
        $user = User::factory()->create();

        $result = $service->importFile($file, $user, 'auto');

        $this->assertEquals(2, $result['imported']);
        $this->assertEquals(0, $result['skipped']);
        $this->assertEquals('KalodataExportConnector', $result['connector']);

        $this->assertDatabaseHas('creators', [
            'name' => 'Trinh Pham',
            'phone' => '0912345678',
            'tier' => 'mega',
            'niche' => 'beauty',
        ]);

        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'trinhpham',
            'followers_count' => 1500000,
            'gmv_estimate' => 500000000,
            'data_source' => 'kalodata',
        ]);

        $this->assertDatabaseHas('creators', [
            'name' => 'An Tech',
            'phone' => '0987654321',
            'tier' => 'macro',
            'niche' => 'tech',
        ]);

        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'antech',
            'followers_count' => 250000,
            'gmv_estimate' => 180000000,
            'data_source' => 'kalodata',
        ]);
    }

    public function test_creator_import_controller_with_format_parameter(): void
    {
        $user = User::factory()->create();

        $csvContent = "Influencer,TikTok ID,Followers,Total GMV,Engagement,Category\n" .
                      "Chau Bui,chaubui,2.1M,1200000000,5.1%,fashion\n";

        $file = UploadedFile::fake()->createWithContent('fastmoss_export.csv', $csvContent);

        $response = $this->actingAs($user)->post('/creators/import', [
            'file' => $file,
            'format' => 'fastmoss',
        ]);

        $response->assertRedirect('/creators');
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('creators', [
            'name' => 'Chau Bui',
            'niche' => 'fashion',
            'tier' => 'mega',
        ]);

        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'chaubui',
            'followers_count' => 2100000,
            'gmv_estimate' => 1200000000,
            'data_source' => 'fastmoss',
        ]);
    }
}
