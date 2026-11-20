<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class CampaignAddCreatorsWithoutDefaultsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Campaign $campaign;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Test Không Mặc Định',
            'product_name' => 'Sản phẩm thử nghiệm',
            'budget' => 20000000,
            'target_creators_count' => 10,
            'target_platforms' => ['tiktok', 'shopee'],
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
        ]);
    }

    public function test_add_creators_with_no_platforms_and_no_collaboration_type_persists_null(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Nguyen Van A',
            'phone' => '0988776655',
            'niche' => 'Beauty',
            'tier' => CreatorTierEnum::MICRO->value,
        ]);

        $response = $this->actingAs($this->user)->post(
            route('campaigns.creators.add', $this->campaign->id),
            [
                'creator_ids' => [$creator->id],
                'collaboration_type' => '',
                'booking_platforms' => [],
                'booking_fee' => 0,
            ]
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $campaignCreator = CampaignCreator::where('campaign_id', $this->campaign->id)
            ->where('creator_id', $creator->id)
            ->first();

        $this->assertNotNull($campaignCreator);
        $this->assertNull($campaignCreator->collaboration_type, 'collaboration_type phải là null khi chưa chọn');
        $this->assertNull($campaignCreator->booking_platforms, 'booking_platforms phải là null khi chưa giao kênh');
    }

    public function test_add_creators_with_explicit_platform_and_collaboration_type(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Tran Thi B',
            'phone' => '0911223344',
            'niche' => 'Fashion',
            'tier' => CreatorTierEnum::MACRO->value,
        ]);

        $response = $this->actingAs($this->user)->post(
            route('campaigns.creators.add', $this->campaign->id),
            [
                'creator_ids' => [$creator->id],
                'collaboration_type' => 'livestream',
                'booking_platforms' => ['shopee', 'facebook'],
                'booking_fee' => 5000000,
            ]
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $campaignCreator = CampaignCreator::where('campaign_id', $this->campaign->id)
            ->where('creator_id', $creator->id)
            ->first();

        $this->assertNotNull($campaignCreator);
        $this->assertEquals('livestream', $campaignCreator->collaboration_type?->value ?? $campaignCreator->collaboration_type);
        $this->assertEquals(['shopee', 'facebook'], $campaignCreator->booking_platforms);
        $this->assertEquals(5000000, (int) $campaignCreator->booking_fee);
    }

    public function test_select_all_in_db_respects_empty_platforms_and_empty_collaboration_type(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            Creator::create([
                'name' => "KOC Bulk $i",
                'phone' => "090000000$i",
                'niche' => 'Lifestyle',
                'tier' => CreatorTierEnum::NANO->value,
            ]);
        }

        $response = $this->actingAs($this->user)->post(
            route('campaigns.creators.add', $this->campaign->id),
            [
                'select_all_in_db' => true,
                'creator_ids' => [],
                'collaboration_type' => '',
                'booking_platforms' => [],
            ]
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $ccs = CampaignCreator::where('campaign_id', $this->campaign->id)->get();
        $this->assertCount(3, $ccs);

        foreach ($ccs as $cc) {
            $this->assertNull($cc->collaboration_type, "KOC {$cc->creator_id} phải có collaboration_type là null");
            $this->assertNull($cc->booking_platforms, "KOC {$cc->creator_id} phải có booking_platforms là null");
        }
    }
}
