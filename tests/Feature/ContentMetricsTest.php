<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Jobs\SyncPostMetricsDailyJob;
use Modules\Content\Models\ContentPost;
use Modules\Content\Models\ContentPostMetric;
use Modules\Content\Services\ContentMetricsSyncService;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class ContentMetricsTest extends TestCase
{
    use RefreshDatabase;

    protected function createSamplePost(): ContentPost
    {
        $user = User::factory()->create();

        $campaign = Campaign::create([
            'name' => 'Chiến dịch Kem Chống Nắng Hè 2026',
            'product_name' => 'Kem Chống Nắng SPF50',
            'budget' => 50000000,
            'start_date' => Carbon::now()->toDateString(),
            'end_date' => Carbon::now()->addDays(30)->toDateString(),
            'created_by' => $user->id,
        ]);

        $creator = Creator::create([
            'name' => 'Mai Anh Review',
            'phone' => '0988112233',
            'tier' => 'micro',
            'niche' => 'beauty',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => 'sample_received',
            'sample_received_at' => Carbon::now()->subDays(2),
        ]);

        return ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@maianh/video/7212345678',
            'video_title' => 'Review kem chống nắng siêu kiềm dầu',
            'status' => 'approved',
            'views_count' => 15000,
            'likes_count' => 1200,
            'comments_count' => 85,
            'shares_count' => 30,
            'gmv_amount' => 4500000,
        ]);
    }

    public function test_sync_post_updates_content_post_and_creates_metric_snapshot(): void
    {
        $post = $this->createSamplePost();
        $service = app(ContentMetricsSyncService::class);

        $custom = [
            'views_count' => 25000,
            'likes_count' => 1800,
            'comments_count' => 120,
            'shares_count' => 45,
            'gmv_amount' => 7500000,
            'orders_count' => 15,
        ];

        $result = $service->syncPost($post, $custom);

        $this->assertEquals(25000, $result['post']->views_count);
        $this->assertEquals(7500000, $result['post']->gmv_amount);
        $this->assertNotNull($result['post']->last_synced_at);

        $today = Carbon::today()->toDateString();
        $this->assertDatabaseHas('content_post_metrics', [
            'content_post_id' => $post->id,
            'recorded_date' => $today,
            'views_count' => 25000,
            'likes_count' => 1800,
            'gmv_amount' => 7500000,
            'orders_count' => 15,
        ]);
    }

    public function test_sync_post_metrics_daily_job_executes_successfully(): void
    {
        $post = $this->createSamplePost();

        // Dispatch Job
        SyncPostMetricsDailyJob::dispatchSync();

        $today = Carbon::today()->toDateString();
        $this->assertDatabaseHas('content_post_metrics', [
            'content_post_id' => $post->id,
            'recorded_date' => $today,
        ]);
    }

    public function test_artisan_sync_metrics_command(): void
    {
        $post = $this->createSamplePost();

        $this->artisan('content:sync-metrics', ['--post' => $post->id])
            ->assertSuccessful();

        $today = Carbon::today()->toDateString();
        $this->assertDatabaseHas('content_post_metrics', [
            'content_post_id' => $post->id,
            'recorded_date' => $today,
        ]);
    }

    public function test_content_controller_web_endpoints(): void
    {
        $user = User::factory()->create();
        $post = $this->createSamplePost();

        // 1. Danh sách video
        $response = $this->actingAs($user)->get('/content');
        $response->assertStatus(200);

        // 2. Cập nhật trạng thái duyệt
        $updateResp = $this->actingAs($user)->patch("/contents/{$post->id}/status", [
            'status' => 'approved',
        ]);
        $updateResp->assertRedirect();
        $this->assertDatabaseHas('content_posts', [
            'id' => $post->id,
            'status' => 'approved',
        ]);

        // 3. Đồng bộ chỉ số đơn lẻ
        $syncResp = $this->actingAs($user)->post("/contents/{$post->id}/sync", [
            'views_count' => 30000,
            'likes_count' => 2500,
        ]);
        $syncResp->assertRedirect();
        $this->assertDatabaseHas('content_posts', [
            'id' => $post->id,
            'views_count' => 30000,
        ]);

        // 4. Đồng bộ toàn bộ
        $syncAllResp = $this->actingAs($user)->post('/contents/sync-all');
        $syncAllResp->assertRedirect();

        // 5. Lấy lịch sử biến động cho biểu đồ
        $historyResp = $this->actingAs($user)->getJson("/contents/{$post->id}/history");
        $historyResp->assertStatus(200)
            ->assertJsonStructure([
                'post' => ['id', 'title', 'creator_name', 'platform'],
                'history' => [
                    '*' => ['recorded_date', 'views_count', 'likes_count'],
                ],
            ]);
    }
}
