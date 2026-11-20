<?php

namespace Modules\Portal\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Models\CampaignProduct;
use Modules\Creator\Models\Creator;
use Modules\Settings\Models\Setting;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PortalSettingsAndDisplayTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Campaign $campaign;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;
    protected CampaignProduct $product;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $this->admin = User::factory()->create();
        $this->admin->assignRole($adminRole);

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Test Portal UI',
            'product_name' => 'Mỹ phẩm dưỡng da',
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
        ]);

        $this->product = CampaignProduct::create([
            'campaign_id' => $this->campaign->id,
            'product_name' => 'Kem Dưỡng Da Cao Cấp',
            'product_sku' => 'KEM-001',
            'retail_price' => 250000,
            'brief_content' => 'Điểm nhấn: Cấp ẩm 24h, chiết xuất rau má',
            'hashtags' => '#kemduong #duongda #skincare',
            'images' => [
                ['path' => 'campaign_products/img1.jpg', 'name' => 'Ảnh mặt trước', 'url' => '/storage/campaign_products/img1.jpg'],
                ['path' => 'campaign_products/img2.jpg', 'name' => 'Ảnh cận cảnh', 'url' => '/storage/campaign_products/img2.jpg'],
            ],
            'brief_files' => [
                ['path' => 'campaign_products/brief.pdf', 'name' => 'Kich_ban_video.pdf', 'size' => 102400, 'type' => 'application/pdf', 'url' => '/storage/campaign_products/brief.pdf'],
                ['path' => 'campaign_products/moodboard.png', 'name' => 'Moodboard.png', 'size' => 204800, 'type' => 'image/png', 'url' => '/storage/campaign_products/moodboard.png'],
            ],
        ]);

        $this->creator = Creator::create([
            'name' => 'KOC Linh Chi',
            'phone' => '0912345678',
        ]);

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'status' => 'new',
            'portal_token' => 'test-token-64-characters-random-string-for-portal-display-unit-test',
            'portal_token_expires_at' => now()->addDays(30),
        ]);
    }

    public function test_can_update_portal_settings_via_settings_controller(): void
    {
        $response = $this->actingAs($this->admin)->post(route('settings.portal.update'), [
            'portal_token_expire_days' => 45,
            'portal_token_extend_days' => 20,
            'portal_support_contact' => '0988.111.222 (CSKH)',
            'portal_expired_custom_message' => 'Link đã hết hạn vui lòng liên hệ admin',
            'portal_allow_edit_address_after_confirm' => '1',
            'portal_allow_multiple_videos' => '0',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->assertEquals(45, (int) Setting::get('portal_token_expire_days'));
        $this->assertEquals(20, (int) Setting::get('portal_token_extend_days'));
        $this->assertEquals('0988.111.222 (CSKH)', Setting::get('portal_support_contact'));
        $this->assertEquals('Link đã hết hạn vui lòng liên hệ admin', Setting::get('portal_expired_custom_message'));
        $this->assertTrue((bool) Setting::get('portal_allow_edit_address_after_confirm'));
        $this->assertFalse((bool) Setting::get('portal_allow_multiple_videos'));
    }

    public function test_portal_token_generation_respects_custom_expire_days_and_zero_infinite(): void
    {
        // 1. Cấu hình 60 ngày
        Setting::set('portal_token_expire_days', 60, 'portal');
        $this->campaignCreator->generatePortalToken();
        $this->campaignCreator->refresh();
        $this->assertNotNull($this->campaignCreator->portal_token_expires_at);
        $this->assertTrue($this->campaignCreator->portal_token_expires_at->isFuture());
        $this->assertEquals(60, (int) round(now()->diffInDays($this->campaignCreator->portal_token_expires_at)));

        // 2. Cấu hình 0 ngày = Vô thời hạn (không bao giờ hết hạn)
        Setting::set('portal_token_expire_days', 0, 'portal');
        $this->campaignCreator->generatePortalToken();
        $this->campaignCreator->refresh();
        $this->assertNull($this->campaignCreator->portal_token_expires_at);
    }

    public function test_can_extend_portal_token(): void
    {
        Setting::set('portal_token_extend_days', 15, 'portal');
        $this->campaignCreator->update(['portal_token_expires_at' => now()->addDays(5)]);

        $response = $this->actingAs($this->admin)->post(
            route('campaigns.creators.portal.extend', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ])
        );

        $response->assertSessionHasNoErrors();
        $this->campaignCreator->refresh();
        // Ban đầu còn 5 ngày + gia hạn 15 ngày = 20 ngày
        $this->assertEquals(20, (int) round(now()->diffInDays($this->campaignCreator->portal_token_expires_at)));
    }

    public function test_portal_show_renders_products_with_images_and_brief_files(): void
    {
        Setting::set('portal_support_contact', '0999.888.777 (Hotline)', 'portal');

        $response = $this->get(route('portal.show', $this->campaignCreator->portal_token));
        $response->assertOk();

        $page = $response->viewData('page');
        $this->assertEquals('Portal/Index', $page['component']);

        // Kiểm tra nạp sản phẩm có đủ hình ảnh và file brief
        $products = $page['props']['campaign']['products'];
        $this->assertCount(1, $products);
        $this->assertCount(2, $products[0]['image_urls']);
        $this->assertCount(2, $products[0]['brief_file_items']);
        $this->assertEquals('0999.888.777 (Hotline)', $page['props']['portal_settings']['support_contact']);
    }
}
