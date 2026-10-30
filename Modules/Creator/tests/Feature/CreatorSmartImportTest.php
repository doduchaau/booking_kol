<?php

namespace Modules\Creator\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Modules\Creator\Jobs\SyncCreatorMetricsJob;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Tests\TestCase;

class CreatorSmartImportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_analyze_file_with_offset_header_and_fuzzy_columns(): void
    {
        $csvContent = "DANH SACH BAO GIA KOC AGENCY THANG 10/2026\n"
            . "Ngay cap nhat: 29/10/2026\n"
            . "Ho va ten,So dien thoai,Kenh TikTok,Luot Follow,Bao gia video,Ty le tuong tac\n"
            . "Nguyen Van A,981234567,@nguyenvana,500k,4tr5,\"4,5%\"\n"
            . "Tran Thi B,84912345678,https://www.tiktok.com/@tranthib,1.2M,10 cu,0.0385\n";

        $file = UploadedFile::fake()->createWithContent('koc_agency_pricing.csv', $csvContent);

        $response = $this->actingAs($this->user)
            ->postJson(route('creators.import.analyze'), [
                'file' => $file,
            ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.header_row_index', 2);
        $response->assertJsonPath('data.total_rows', 2);
        
        $data = $response->json('data');
        $this->assertCount(2, $data['preview_rows']);

        // Dòng 1 preview: 981234567 -> 0981234567; 4tr5 -> 4,500,000; 4,5% -> 4.5
        $firstRow = $data['preview_rows'][0];
        $this->assertEquals('Nguyen Van A', $firstRow['name']);
        $this->assertEquals('0981234567', $firstRow['phone']);
        $this->assertEquals('nguyenvana', $firstRow['handle']);
        $this->assertEquals(500_000, $firstRow['followers_count']);
        $this->assertEquals(4_500_000.0, $firstRow['rate_price']);
        $this->assertEquals(4.5, $firstRow['engagement_rate']);
    }

    public function test_can_confirm_import_and_trigger_auto_enrichment_queue(): void
    {
        Queue::fake();

        $csvContent = "Ten KOC,So Dien Thoai,Kenh,Followers,Gia Clip\n"
            . "Linh Barbie,0981112233,@linhbarbie,0,5 củ\n"
            . "Dang Thu Ha,0982223344,@dangthuha,150K,Liên hệ\n";

        $file = UploadedFile::fake()->createWithContent('koc_test.csv', $csvContent);

        $response = $this->actingAs($this->user)
            ->postJson(route('creators.import.confirm'), [
                'file' => $file,
                'format' => 'auto',
                'auto_enrich' => true,
            ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('result.imported', 2);

        // Kiểm tra Database
        $this->assertDatabaseHas('creators', [
            'name' => 'Linh Barbie',
            'phone' => '0981112233',
        ]);

        $this->assertDatabaseHas('creators', [
            'name' => 'Dang Thu Ha',
            'phone' => '0982223344',
        ]);

        // Kiểm tra CreatorAccount
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'linhbarbie',
            'platform' => 'tiktok',
        ]);

        // Kiểm tra Auto-Enrichment Queue:
        // Linh Barbie có followers = 0 -> phải được đẩy vào Queue SyncCreatorMetricsJob
        Queue::assertPushed(SyncCreatorMetricsJob::class, function ($job) {
            return $job->handle === 'linhbarbie';
        });
    }
}
