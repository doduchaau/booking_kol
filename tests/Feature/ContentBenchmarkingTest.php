<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Tests\TestCase;

class ContentBenchmarkingTest extends TestCase
{
    use RefreshDatabase;

    public function test_benchmark_ratio_and_viral_status(): void
    {
        $creator = Creator::create([
            'name' => 'Chi Pu Review',
            'phone' => '0988001122',
            'tier' => 'macro',
            'niche' => 'lifestyle',
        ]);

        CreatorAccount::create([
            'creator_id' => $creator->id,
            'platform' => 'tiktok',
            'handle' => 'chipureview',
            'url' => 'https://www.tiktok.com/@chipureview',
            'followers_count' => 500000,
            'average_views' => 100000, // Kênh có TB 100.000 views
        ]);

        $campaign = Campaign::create([
            'name' => 'Chiến dịch Son Môi',
            'product_name' => 'Son Tint Bóng',
            'budget' => 20000000,
            'start_date' => Carbon::now()->toDateString(),
            'end_date' => Carbon::now()->addDays(30)->toDateString(),
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => 'sample_received',
        ]);

        // 1. Test Viral: views = 250.000 (> 200% của 100.000)
        $viralPost = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@chipureview/video/1',
            'views_count' => 250000,
            'likes_count' => 15000,
            'status' => 'approved',
        ]);

        $viralBenchmark = $viralPost->benchmark;
        $this->assertEquals(250.0, $viralBenchmark['ratio']);
        $this->assertEquals('viral', $viralBenchmark['status']);
        $this->assertStringContainsString('Viral Đột Biến', $viralBenchmark['label']);

        // 2. Test Exceeded: views = 140.000 (140%)
        $exceededPost = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@chipureview/video/2',
            'views_count' => 140000,
            'status' => 'approved',
        ]);

        $exceededBenchmark = $exceededPost->benchmark;
        $this->assertEquals(140.0, $exceededBenchmark['ratio']);
        $this->assertEquals('exceeded', $exceededBenchmark['status']);
        $this->assertStringContainsString('Vượt Kỳ Vọng', $exceededBenchmark['label']);

        // 3. Test Expected: views = 95.000 (95%)
        $expectedPost = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@chipureview/video/3',
            'views_count' => 95000,
            'status' => 'approved',
        ]);

        $this->assertEquals('expected', $expectedPost->benchmark['status']);

        // 4. Test Below: views = 60.000 (60%)
        $belowPost = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@chipureview/video/4',
            'views_count' => 60000,
            'status' => 'approved',
        ]);

        $this->assertEquals('below', $belowPost->benchmark['status']);

        // 5. Test Underperforming: views = 30.000 (30%)
        $underperformingPost = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@chipureview/video/5',
            'views_count' => 30000,
            'status' => 'approved',
        ]);

        $this->assertEquals('underperforming', $underperformingPost->benchmark['status']);
    }

    public function test_benchmark_fallback_to_tier_when_channel_has_no_avg_views(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Nano Mới',
            'phone' => '0911223344',
            'tier' => 'nano', // Nano baseline = 5.000 views
        ]);

        $campaign = Campaign::create([
            'name' => 'Chiến dịch Test Nano',
            'product_name' => 'Sữa rửa mặt',
            'budget' => 5000000,
            'start_date' => Carbon::now()->toDateString(),
            'end_date' => Carbon::now()->addDays(30)->toDateString(),
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => 'sample_received',
        ]);

        $post = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@nanomoi/video/1',
            'views_count' => 12500, // 12.500 / 5.000 = 250% -> Viral
            'status' => 'approved',
        ]);

        $benchmark = $post->benchmark;
        $this->assertEquals(5000, $benchmark['average_channel_views']);
        $this->assertEquals(250.0, $benchmark['ratio']);
        $this->assertEquals('viral', $benchmark['status']);
    }

    public function test_content_controller_returns_benchmark_in_payload(): void
    {
        $user = User::factory()->create();

        $creator = Creator::create([
            'name' => 'Reviewer Test',
            'phone' => '0933445566',
            'tier' => 'micro',
        ]);

        $campaign = Campaign::create([
            'name' => 'Chiến dịch Test Controller',
            'product_name' => 'Kem Dưỡng Ẩm',
            'budget' => 10000000,
            'start_date' => Carbon::now()->toDateString(),
            'end_date' => Carbon::now()->addDays(30)->toDateString(),
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => 'sample_received',
        ]);

        $post = ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@reviewer/video/1',
            'views_count' => 30000,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($user)->get(route('contents.index'));
        $response->assertStatus(200);

        $inertiaData = $response->getOriginalContent()->getData()['page']['props'];
        $firstPost = $inertiaData['posts']['data'][0] ?? null;

        $this->assertNotNull($firstPost);
        $this->assertArrayHasKey('benchmark', $firstPost);
        $this->assertEquals(30000, $firstPost['benchmark']['current_views']);
    }
}
