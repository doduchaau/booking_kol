<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class CampaignPlatformsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_campaign_can_have_target_platforms(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Đa Nền Tảng',
            'product_name' => 'Sản Phẩm Test',
            'target_platforms' => ['tiktok', 'shopee', 'facebook'],
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
        ]);

        $fresh = $campaign->fresh();
        $this->assertIsArray($fresh->target_platforms);
        $this->assertEquals(['tiktok', 'shopee', 'facebook'], $fresh->target_platforms);
    }

    public function test_assign_creators_with_custom_booking_platforms(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Mix KOC',
            'product_name' => 'Sản Phẩm Test',
            'target_platforms' => ['tiktok', 'facebook', 'shopee'],
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $creatorA = Creator::create([
            'name' => 'KOC A (Chỉ TikTok)',
            'phone' => '0911000111',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 90,
        ]);

        $creatorB = Creator::create([
            'name' => 'KOC B (TikTok + Shopee)',
            'phone' => '0911000222',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 85,
        ]);

        $responseA = $this->actingAs($this->user)->post(route('campaigns.creators.add', $campaign->id), [
            'creator_ids' => [$creatorA->id],
            'booking_platforms' => ['tiktok'],
        ]);
        $responseA->assertSessionHasNoErrors();

        $responseB = $this->actingAs($this->user)->post(route('campaigns.creators.add', $campaign->id), [
            'creator_ids' => [$creatorB->id],
            'booking_platforms' => ['tiktok', 'shopee'],
        ]);
        $responseB->assertSessionHasNoErrors();

        $ccA = CampaignCreator::where('campaign_id', $campaign->id)->where('creator_id', $creatorA->id)->first();
        $ccB = CampaignCreator::where('campaign_id', $campaign->id)->where('creator_id', $creatorB->id)->first();

        $this->assertNotNull($ccA);
        $this->assertNotNull($ccB);
        $this->assertEquals(['tiktok'], $ccA->booking_platforms);
        $this->assertEquals(['tiktok', 'shopee'], $ccB->booking_platforms);
    }

    public function test_pipeline_quick_update_can_modify_booking_platforms(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Test Inline Update',
            'product_name' => 'Sản Phẩm Test',
            'target_platforms' => ['tiktok', 'facebook', 'shopee'],
            'budget' => 20000000,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Test',
            'phone' => '0911333444',
            'niche' => 'tech',
            'tier' => CreatorTierEnum::MICRO,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::CONTACTED,
            'booking_platforms' => ['tiktok'],
        ]);

        $response = $this->actingAs($this->user)->patchJson(route('campaigns.creators.quick-update', [$campaign->id, $cc->id]), [
            'booking_platforms' => ['tiktok', 'youtube'],
        ]);

        $response->assertOk();
        $this->assertEquals(['tiktok', 'youtube'], $cc->fresh()->booking_platforms);
    }

    public function test_platform_deliverables_attribute_tracks_posts(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Deliverables',
            'product_name' => 'Sản Phẩm Test',
            'target_platforms' => ['tiktok', 'shopee'],
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Video Track',
            'phone' => '0911555666',
            'niche' => 'lifestyle',
            'tier' => CreatorTierEnum::MICRO,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::POSTED,
            'booking_platforms' => ['tiktok', 'shopee'],
        ]);

        // Post on TikTok only
        ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@koc/video/1234567890',
            'status' => 'approved',
        ]);

        $deliverables = $cc->platform_deliverables;
        $this->assertEquals(2, $deliverables['total_platforms']);
        $this->assertEquals(1, $deliverables['completed_platforms']);
        $this->assertFalse($deliverables['is_all_completed']);

        $items = $deliverables['items'];
        $this->assertCount(2, $items);

        $tiktokDeliv = collect($items)->firstWhere('platform', 'tiktok');
        $shopeeDeliv = collect($items)->firstWhere('platform', 'shopee');

        $this->assertTrue($tiktokDeliv['is_completed']);
        $this->assertTrue($tiktokDeliv['has_post']);
        $this->assertNotNull($tiktokDeliv['latest_post']);

        $this->assertFalse($shopeeDeliv['is_completed']);
        $this->assertFalse($shopeeDeliv['has_post']);
        $this->assertNull($shopeeDeliv['latest_post']);
    }

    public function test_can_remove_koc_from_campaign(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Xóa KOC',
            'product_name' => 'Sản Phẩm Test',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Cần Xóa',
            'phone' => '0911777888',
            'niche' => 'lifestyle',
            'tier' => CreatorTierEnum::MICRO,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $response = $this->actingAs($this->user)->delete(route('campaigns.creators.remove', [$campaign->id, $cc->id]));
        $response->assertSessionHasNoErrors();

        $this->assertSoftDeleted('campaign_creators', ['id' => $cc->id]);
    }

    public function test_can_bulk_remove_kocs_from_campaign(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Bulk Remove',
            'product_name' => 'Sản Phẩm Test',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $creator1 = Creator::create(['name' => 'KOC 1', 'phone' => '0911000001', 'niche' => 'food', 'tier' => CreatorTierEnum::MICRO]);
        $creator2 = Creator::create(['name' => 'KOC 2', 'phone' => '0911000002', 'niche' => 'food', 'tier' => CreatorTierEnum::MICRO]);

        $cc1 = CampaignCreator::create(['campaign_id' => $campaign->id, 'creator_id' => $creator1->id, 'status' => PipelineStatusEnum::NEW]);
        $cc2 = CampaignCreator::create(['campaign_id' => $campaign->id, 'creator_id' => $creator2->id, 'status' => PipelineStatusEnum::CONTACTED]);

        $response = $this->actingAs($this->user)->post(route('campaigns.creators.bulk-remove', $campaign->id), [
            'ids' => [$cc1->id, $cc2->id],
        ]);
        $response->assertSessionHasNoErrors();

        $this->assertSoftDeleted('campaign_creators', ['id' => $cc1->id]);
        $this->assertSoftDeleted('campaign_creators', ['id' => $cc2->id]);
    }
}
