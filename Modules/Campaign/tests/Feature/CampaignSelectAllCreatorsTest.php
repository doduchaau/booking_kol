<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class CampaignSelectAllCreatorsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_create_campaign_and_automatically_assign_all_creators(): void
    {
        // Tạo 3 creator trong kho CRM
        $creators = [];
        for ($i = 1; $i <= 3; $i++) {
            $creators[] = Creator::create([
                'name' => "KOC Test $i",
                'phone' => "091234567$i",
                'shipping_address' => "123 Đường $i, Hà Nội",
                'niche' => 'Beauty',
                'tier' => CreatorTierEnum::MICRO->value,
            ]);
        }

        $payload = [
            'name' => 'Chiến dịch Tết 2026 Toàn Diện',
            'product_name' => 'Hộp Quà Tết Đặc Biệt',
            'budget' => 50000000,
            'target_creators_count' => 10,
            'assign_all_creators' => true,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 10,
            'ads_commission_rate' => 5,
            'status' => CampaignStatusEnum::ACTIVE->value,
        ];

        $response = $this->actingAs($this->user)->post(route('campaigns.store'), $payload);

        $response->assertRedirect();

        $campaign = Campaign::where('name', 'Chiến dịch Tết 2026 Toàn Diện')->first();
        $this->assertNotNull($campaign);

        // Kiểm tra toàn bộ 3 creator đã được gán vào chiến dịch
        $this->assertEquals(3, $campaign->campaignCreators()->count());

        foreach ($creators as $creator) {
            $this->assertDatabaseHas('campaign_creators', [
                'campaign_id' => $campaign->id,
                'creator_id' => $creator->id,
                'status' => PipelineStatusEnum::NEW->value,
            ]);
        }
    }

    public function test_can_assign_all_creators_in_db_to_existing_campaign(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Chăm Sóc Da',
            'product_name' => 'Serum Phục Hồi',
            'budget' => 30000000,
            'target_creators_count' => 20,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
        ]);

        // Tạo 3 creator khả dụng và 1 creator đã bị gộp (merged)
        $available1 = Creator::create([
            'name' => 'KOC 1',
            'phone' => '0900000001',
            'niche' => 'Skincare',
            'tier' => CreatorTierEnum::MICRO->value,
        ]);
        $available2 = Creator::create([
            'name' => 'KOC 2',
            'phone' => '0900000002',
            'niche' => 'Skincare',
            'tier' => CreatorTierEnum::NANO->value,
        ]);
        $available3 = Creator::create([
            'name' => 'KOC 3',
            'phone' => '0900000003',
            'niche' => 'Skincare',
            'tier' => CreatorTierEnum::MICRO->value,
        ]);
        $mergedCreator = Creator::create([
            'name' => 'KOC Merged',
            'phone' => '0900000004',
            'niche' => 'Skincare',
            'tier' => CreatorTierEnum::NANO->value,
            'merged_into_creator_id' => $available1->id,
        ]);

        // Gán trước KOC 1 vào campaign
        CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $available1->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 0,
        ]);

        $this->assertEquals(1, $campaign->campaignCreators()->count());

        // Gửi request gán TOÀN BỘ KOC trong kho dữ liệu
        $response = $this->actingAs($this->user)->post(route('campaigns.creators.add', $campaign->id), [
            'select_all_in_db' => true,
            'booking_fee' => 500000,
        ]);

        $response->assertRedirect();

        // Tổng số KOC trong chiến dịch phải là 3 (KOC 1 đã có + KOC 2 + KOC 3; không bao gồm mergedCreator)
        $this->assertEquals(3, $campaign->campaignCreators()->count());

        // Kiểm tra KOC 2 và KOC 3 đã được gán và có portal_token
        $cc2 = CampaignCreator::where('campaign_id', $campaign->id)->where('creator_id', $available2->id)->first();
        $this->assertNotNull($cc2);
        $this->assertNotNull($cc2->portal_token);
        $this->assertEquals(500000, $cc2->booking_fee);

        $cc3 = CampaignCreator::where('campaign_id', $campaign->id)->where('creator_id', $available3->id)->first();
        $this->assertNotNull($cc3);

        // KOC merged không được gán
        $this->assertDatabaseMissing('campaign_creators', [
            'campaign_id' => $campaign->id,
            'creator_id' => $mergedCreator->id,
        ]);
    }

    public function test_assign_creators_validates_when_select_all_not_checked_and_no_creators(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Test',
            'product_name' => 'Sản phẩm Test',
            'budget' => 10000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
        ]);

        $response = $this->actingAs($this->user)->post(route('campaigns.creators.add', $campaign->id), [
            'select_all_in_db' => false,
            'creator_ids' => [],
        ]);

        $response->assertSessionHasErrors(['creator_ids']);
    }
}
