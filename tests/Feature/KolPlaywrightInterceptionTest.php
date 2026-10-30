<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\SyncKolProfileJob;
use App\Models\Kol;
use App\Services\Kol\KolDataAdapter;
use App\Services\Kol\PlaywrightNetworkConnector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Tests\TestCase;

class KolPlaywrightInterceptionTest extends TestCase
{
    use RefreshDatabase;

    protected KolDataAdapter $adapter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adapter = new KolDataAdapter();
    }

    /**
     * Test KolDataAdapter: Lọc bài ghim, lấy tối đa 15 bài, tính views, likes, comments, shares, ER% và trích xuất bio
     */
    public function test_kol_data_adapter_transforms_telemetry_correctly(): void
    {
        $posts = [
            // Pinned post 1: isPinnedItem = true -> Phải bị lọc bỏ
            [
                'id' => 'pin1',
                'isPinnedItem' => true,
                'stats' => ['playCount' => 5_000_000, 'diggCount' => 500_000, 'commentCount' => 10_000, 'shareCount' => 5_000],
            ],
            // Pinned post 2: is_top = 1 -> Phải bị lọc bỏ
            [
                'id' => 'pin2',
                'is_top' => 1,
                'stats' => ['playCount' => 2_000_000, 'diggCount' => 200_000, 'commentCount' => 5_000, 'shareCount' => 2_000],
            ],
            // Regular post 1
            [
                'id' => 'reg1',
                'isPinnedItem' => false,
                'stats' => ['playCount' => 100_000, 'diggCount' => 8_000, 'commentCount' => 400, 'shareCount' => 100],
            ],
            // Regular post 2
            [
                'id' => 'reg2',
                'isPinnedItem' => false,
                'stats' => ['playCount' => 200_000, 'diggCount' => 12_000, 'commentCount' => 600, 'shareCount' => 400],
            ],
        ];

        $telemetry = [
            'success' => true,
            'platform' => 'tiktok',
            'profile' => [
                'uniqueId' => 'anh_review_official',
                'nickname' => 'Anh Review Công Nghệ',
                'avatarLarger' => 'https://p16-sign.tiktokcdn.com/avatar.jpeg',
                'signature' => 'Booking Zalo: 098.765.4321 - Mail: contact.review@gmail.com',
                'followerCount' => 350_000,
                'heartCount' => 4_500_000,
                'videoCount' => 180,
            ],
            'posts' => $posts,
            'xhr_dumps' => [
                [
                    'url' => 'https://kalodata.com/api/creator/performance',
                    'status' => 200,
                    'data' => [
                        'gmv_30d' => 150000000,
                        'avg_live_views' => 2500,
                    ],
                ],
            ],
        ];

        $transformed = $this->adapter->transform($telemetry, 'tiktok');

        // 1. Kiểm tra định danh & liên hệ
        $this->assertEquals('Anh Review Công Nghệ', $transformed['name']);
        $this->assertEquals('anh_review_official', $transformed['handle']);
        $this->assertEquals('tiktok', $transformed['platform']);
        $this->assertEquals('0987654321', $transformed['phone']);
        $this->assertEquals('contact.review@gmail.com', $transformed['email']);
        $this->assertEquals('macro', $transformed['tier']); // 350k followers -> macro

        // 2. Kiểm tra lọc bài ghim (chỉ còn 2 bài regular)
        $this->assertEquals(2, $transformed['posts_sample_count']);

        // 3. Kiểm tra chỉ số trung bình:
        // avg_views = (100k + 200k) / 2 = 150,000
        $this->assertEquals(150_000, $transformed['average_views']);
        // avg_likes = (8k + 12k) / 2 = 10,000
        $this->assertEquals(10_000, $transformed['average_likes']);
        // avg_comments = (400 + 600) / 2 = 500
        $this->assertEquals(500, $transformed['average_comments']);
        // avg_shares = (100 + 400) / 2 = 250
        $this->assertEquals(250, $transformed['average_shares']);

        // 4. Kiểm tra ER% trên Views:
        // avgInteractions = 10,000 + 500 + 250 = 10,750
        // ER% = round((10,750 / 150,000) * 100, 2) = 7.17%
        $this->assertEquals(7.17, $transformed['engagement_rate']);
        $this->assertEquals(7.17, $transformed['view_engagement_rate']);

        // 5. Kiểm tra GMV Kalodata trích xuất
        $this->assertEquals(150_000_000, $transformed['gmv_estimate']);
        $this->assertEquals(150_000_000, $transformed['raw_metrics']['gmv_30d']);
        $this->assertEquals(2500, $transformed['raw_metrics']['avg_live_views']);
    }

    /**
     * Test Regex bóc tách SĐT Việt Nam các định dạng phức tạp
     */
    public function test_extract_phone_handles_complex_formats(): void
    {
        $this->assertEquals('0987654321', $this->adapter->extractPhone('Liên hệ: 098.765.4321'));
        $this->assertEquals('0912345678', $this->adapter->extractPhone('Zalo: 0912 345 678'));
        $this->assertEquals('0376543210', $this->adapter->extractPhone('Booking: +84 37 654 3210'));
        $this->assertEquals('0866554433', $this->adapter->extractPhone('Tel: (+84) 866.554.433'));
        $this->assertEquals('0799887766', $this->adapter->extractPhone('Work: 84799887766'));
        $this->assertNull($this->adapter->extractPhone('Tài khoản review đồ ăn, không có sđt'));
    }

    /**
     * Test PlaywrightNetworkConnector phân giải link rút gọn
     */
    public function test_connector_resolves_short_links(): void
    {
        Http::fake([
            'vt.tiktok.com/*' => Http::response('', 301, [
                'Location' => 'https://www.tiktok.com/@creator_real?is_from_webapp=1&sender_device=pc&utm_source=copy',
            ]),
        ]);

        $connector = app(PlaywrightNetworkConnector::class);
        $finalUrl = $connector->resolveFinalUrl('https://vt.tiktok.com/ZSjX1234/');

        // Link phải được resolve và làm sạch các tham số rác
        $this->assertEquals('https://www.tiktok.com/@creator_real', $finalUrl);
    }

    /**
     * Test API batch sync: Kiểm tra cơ chế Cache 24h và Staggered Delay
     */
    public function test_batch_sync_dispatches_with_staggered_delay_and_skips_cached(): void
    {
        Queue::fake();

        // 1. Tạo 1 CreatorAccount đã được sync gần đây (cách đây 2 giờ)
        $creator = Creator::create([
            'name' => 'KOL Đã Sync',
            'niche' => 'beauty',
            'tier' => 'micro',
        ]);

        CreatorAccount::create([
            'creator_id' => $creator->id,
            'platform' => 'tiktok',
            'handle' => 'kol_cached',
            'url' => 'https://www.tiktok.com/@kol_cached',
            'followers_count' => 50000,
            'last_synced_at' => now()->subHours(2),
            'sync_status' => 'completed',
        ]);

        // 2. Gửi request batch-sync gồm 2 URL: 1 URL đã cache và 1 URL mới
        $response = $this->postJson('/api/kols/batch-sync', [
            'platform' => 'tiktok',
            'force' => false,
            'urls' => [
                'https://www.tiktok.com/@kol_cached',
                'https://www.tiktok.com/@kol_new_1',
                'https://www.tiktok.com/@kol_new_2',
            ],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'total_received' => 3,
                'dispatched_count' => 2,
                'skipped_cached_count' => 1,
            ],
        ]);

        // 3. Kiểm tra Queue chỉ nhận 2 job cho các URL chưa cache
        Queue::assertPushed(SyncKolProfileJob::class, 2);

        // 4. Thử lại với force = true -> Phải dispatch cả 3 job
        $responseForce = $this->postJson('/api/kols/batch-sync', [
            'platform' => 'tiktok',
            'force' => true,
            'urls' => [
                'https://www.tiktok.com/@kol_cached',
                'https://www.tiktok.com/@kol_new_1',
            ],
        ]);

        $responseForce->assertStatus(200);
        $responseForce->assertJson([
            'success' => true,
            'data' => [
                'dispatched_count' => 2,
                'skipped_cached_count' => 0,
            ],
        ]);
    }

    /**
     * Test SyncKolProfileJob handle: Cập nhật status, tính toán chỉ số và lưu vào DB
     */
    public function test_sync_kol_profile_job_execution(): void
    {
        $mockConnector = $this->createMock(PlaywrightNetworkConnector::class);
        $mockConnector->method('fetchKolTelemetry')->willReturn([
            'success' => true,
            'platform' => 'tiktok',
            'profile' => [
                'uniqueId' => 'job_test_user',
                'nickname' => 'Job Test User',
                'signature' => 'Zalo: 0912345678 - Email: job@test.com',
                'followerCount' => 25000,
            ],
            'posts' => [
                ['id' => '1', 'isPinnedItem' => false, 'stats' => ['playCount' => 10000, 'diggCount' => 500, 'commentCount' => 50, 'shareCount' => 20]],
            ],
            'xhr_dumps' => [],
        ]);

        $this->app->instance(PlaywrightNetworkConnector::class, $mockConnector);

        $job = new SyncKolProfileJob(
            url: 'https://www.tiktok.com/@job_test_user',
            platform: 'tiktok',
            kolId: null,
            force: true
        );

        $job->handle(
            connector: $mockConnector,
            adapter: app(KolDataAdapter::class),
            importService: app(\Modules\Creator\Services\CreatorImportService::class)
        );

        // Kiểm tra Creator được tạo
        $creator = Creator::where('email', 'job@test.com')->first();
        $this->assertNotNull($creator);
        $this->assertEquals('0912345678', $creator->phone);
        $this->assertEquals('Job Test User', $creator->name);

        // Kiểm tra CreatorAccount được lưu và trạng thái completed
        $account = CreatorAccount::where('handle', 'job_test_user')->first();
        $this->assertNotNull($account);
        $this->assertEquals('completed', $account->sync_status);
        $this->assertNotNull($account->last_synced_at);
        $this->assertEquals(10000, $account->average_views);
        $this->assertEquals(500, $account->average_likes);
    }
}
