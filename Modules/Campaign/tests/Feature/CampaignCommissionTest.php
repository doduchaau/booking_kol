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

class CampaignCommissionTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_create_campaign_with_ads_commission_rate(): void
    {
        $payload = [
            'name' => 'Chiến dịch Mỹ phẩm Mùa Hè',
            'product_name' => 'Kem chống nắng SPF 50+',
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 15.5,
            'ads_commission_rate' => 7.5,
            'status' => CampaignStatusEnum::DRAFT->value,
        ];

        $response = $this->actingAs($this->user)->post(route('campaigns.store'), $payload);

        $response->assertRedirect();
        $this->assertDatabaseHas('campaigns', [
            'name' => 'Chiến dịch Mỹ phẩm Mùa Hè',
            'commission_rate' => 15.50,
            'ads_commission_rate' => 7.50,
        ]);
    }

    public function test_can_update_campaign_with_ads_commission_rate(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Cũ',
            'product_name' => 'Sản phẩm Cũ',
            'budget' => 10000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 10.0,
            'ads_commission_rate' => 5.0,
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $updatePayload = [
            'name' => 'Chiến dịch Mới Cập Nhật',
            'product_name' => 'Sản phẩm Cũ',
            'budget' => 15000000,
            'target_creators_count' => 8,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 20.0,
            'ads_commission_rate' => 12.5,
            'status' => CampaignStatusEnum::ACTIVE->value,
        ];

        $response = $this->actingAs($this->user)->put(route('campaigns.update', $campaign), $updatePayload);

        $response->assertRedirect();
        $campaign->refresh();
        $this->assertEquals(20.0, (float)$campaign->commission_rate);
        $this->assertEquals(12.5, (float)$campaign->ads_commission_rate);
    }

    public function test_validation_fails_if_ads_commission_rate_is_negative_or_exceeds_100(): void
    {
        $invalidPayloadNegative = [
            'name' => 'Test âm hoa hồng',
            'product_name' => 'Kem',
            'budget' => 5000000,
            'target_creators_count' => 2,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'ads_commission_rate' => -5,
        ];

        $this->actingAs($this->user)
            ->post(route('campaigns.store'), $invalidPayloadNegative)
            ->assertSessionHasErrors(['ads_commission_rate']);

        $invalidPayloadTooHigh = [
            'name' => 'Test vượt 100%',
            'product_name' => 'Kem',
            'budget' => 5000000,
            'target_creators_count' => 2,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'ads_commission_rate' => 105,
        ];

        $this->actingAs($this->user)
            ->post(route('campaigns.store'), $invalidPayloadTooHigh)
            ->assertSessionHasErrors(['ads_commission_rate']);
    }

    public function test_portal_returns_both_commission_rates(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Portal Test',
            'product_name' => 'Serum Trắng Da',
            'budget' => 30000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 18.0,
            'ads_commission_rate' => 8.5,
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Hương Ly',
            'phone' => '0909123456',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 100,
        ]);

        $token = 'test-token-portal-commissions-12345678901234567890123456789012';

        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::CONTACTED,
            'portal_token' => $token,
            'portal_token_expires_at' => now()->addDays(7),
        ]);

        $response = $this->get(route('portal.show', ['token' => $token]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Portal/Index')
            ->where('campaign.commission_rate', 18)
            ->where('campaign.ads_commission_rate', 8.5)
        );
    }
}
