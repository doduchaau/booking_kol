<?php

namespace Modules\Portal\Tests\Unit;

use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Modules\Portal\Services\PortalService;
use Tests\TestCase;

class PortalServiceTest extends TestCase
{
    use RefreshDatabase;

    protected PortalService $portalService;
    protected Campaign $campaign;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->portalService = new PortalService();

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Son Môi',
            'product_name' => 'Son Kem',
            'budget' => 10000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
        ]);

        $this->creator = Creator::create([
            'name' => 'KOC Linh Nga',
            'phone' => '0987654321',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => null,
        ]);

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'status' => PipelineStatusEnum::NEW,
            'portal_token' => 'valid-test-token-64-characters-random-string-abcdef1234567890abcdef',
            'portal_token_expires_at' => now()->addDays(14),
        ]);
    }

    public function test_can_get_valid_campaign_creator_by_token(): void
    {
        $found = $this->portalService->getValidCampaignCreator('valid-test-token-64-characters-random-string-abcdef1234567890abcdef');
        $this->assertEquals($this->campaignCreator->id, $found->id);
    }

    public function test_throws_exception_if_token_expired(): void
    {
        $this->campaignCreator->update([
            'portal_token_expires_at' => now()->subDay(),
        ]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('hết hạn truy cập');

        $this->portalService->getValidCampaignCreator('valid-test-token-64-characters-random-string-abcdef1234567890abcdef');
    }

    public function test_update_shipping_address_advances_pipeline_to_address_confirmed(): void
    {
        $this->portalService->updateShippingAddress($this->campaignCreator, [
            'phone' => '0912345678',
            'shipping_address' => '45A Lê Lợi, P. Bến Nghé, Quận 1',
            'city_province' => 'TP. Hồ Chí Minh',
            'district' => 'Quận 1',
        ]);

        $this->campaignCreator->refresh();
        $this->creator->refresh();

        $this->assertEquals(PipelineStatusEnum::ADDRESS_CONFIRMED, $this->campaignCreator->status);
        $this->assertNotNull($this->campaignCreator->address_confirmed_at);
        $this->assertEquals('45A Lê Lợi, P. Bến Nghé, Quận 1', $this->creator->shipping_address);
        $this->assertEquals('0912345678', $this->creator->phone);
    }

    public function test_confirm_receipt_advances_pipeline_to_sample_received(): void
    {
        $this->portalService->confirmReceipt($this->campaignCreator);

        $this->campaignCreator->refresh();
        $this->assertEquals(PipelineStatusEnum::SAMPLE_RECEIVED, $this->campaignCreator->status);
        $this->assertNotNull($this->campaignCreator->sample_received_at);
    }

    public function test_submit_video_creates_content_post_and_advances_pipeline_to_posted(): void
    {
        $post = $this->portalService->submitVideo($this->campaignCreator, [
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@linhnga/video/123456789',
            'video_title' => 'Review Son Môi Kem Lì',
        ]);

        $this->assertInstanceOf(ContentPost::class, $post);
        $this->assertEquals('https://www.tiktok.com/@linhnga/video/123456789', $post->post_url);

        $this->campaignCreator->refresh();
        $this->assertEquals(PipelineStatusEnum::POSTED, $this->campaignCreator->status);
        $this->assertNotNull($this->campaignCreator->posted_at);
    }
}
