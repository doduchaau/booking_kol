<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PortalAndStaffShippingAddressValidationTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Campaign $campaign;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;
    protected string $portalToken;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Admin']);
        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole('Admin');

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Kem Chống Nắng Mùa Hè',
            'product_name' => 'Kem Chống Nắng SPF 50',
            'budget' => 50000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
        ]);

        $this->creator = Creator::create([
            'name' => 'Nguyễn Thị Hoa',
            'phone' => '0987111222',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 95,
            'shipping_address' => null,
            'city_province' => null,
            'district' => null,
            'ward' => null,
        ]);

        $this->portalToken = 'portal-secure-token-test-1234567890abcdef1234567890abcdef12345678';

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'status' => PipelineStatusEnum::AGREED,
            'portal_token' => $this->portalToken,
            'portal_token_expires_at' => now()->addDays(7),
        ]);
    }

    /**
     * KOC trên portal thiếu SĐT thì không cho xác nhận địa chỉ
     */
    public function test_portal_address_requires_phone(): void
    {
        $response = $this->post(route('portal.address', $this->portalToken), [
            'phone' => '',
            'shipping_address' => 'Số 123 Đường Cầu Giấy',
            'city_province' => 'Hà Nội',
            'ward' => 'Dịch Vọng',
        ]);

        $response->assertSessionHasErrors(['phone']);
    }

    /**
     * KOC trên portal thiếu Tỉnh/Thành phố thì không cho xác nhận địa chỉ
     */
    public function test_portal_address_requires_city_province(): void
    {
        $response = $this->post(route('portal.address', $this->portalToken), [
            'phone' => '0987111222',
            'shipping_address' => 'Số 123 Đường Cầu Giấy',
            'city_province' => '',
            'ward' => 'Dịch Vọng',
        ]);

        $response->assertSessionHasErrors(['city_province']);
    }

    /**
     * KOC trên portal thiếu Phường/Xã thì không cho xác nhận địa chỉ
     */
    public function test_portal_address_requires_ward(): void
    {
        $response = $this->post(route('portal.address', $this->portalToken), [
            'phone' => '0987111222',
            'shipping_address' => 'Số 123 Đường Cầu Giấy',
            'city_province' => 'Hà Nội',
            'ward' => '',
        ]);

        $response->assertSessionHasErrors(['ward']);
    }

    /**
     * KOC trên portal điền đầy đủ SĐT, Địa chỉ, Thành phố, Phường/Xã thì cập nhật thành công
     */
    public function test_portal_address_succeeds_when_all_mandatory_fields_present(): void
    {
        $response = $this->post(route('portal.address', $this->portalToken), [
            'phone' => '0987111222',
            'shipping_address' => 'Số 123 Đường Cầu Giấy',
            'city_province' => 'Hà Nội',
            'district' => 'Cầu Giấy',
            'ward' => 'Dịch Vọng',
        ]);

        $response->assertRedirect();

        $this->creator->refresh();
        $this->campaignCreator->refresh();

        $this->assertEquals('Số 123 Đường Cầu Giấy', $this->creator->shipping_address);
        $this->assertEquals('Hà Nội', $this->creator->city_province);
        $this->assertEquals('Cầu Giấy', $this->creator->district);
        $this->assertEquals('Dịch Vọng', $this->creator->ward);
        $this->assertEquals('0987111222', $this->creator->phone);
        $this->assertEquals(PipelineStatusEnum::ADDRESS_CONFIRMED, $this->campaignCreator->status);
    }

    /**
     * Nhân viên nhập nhanh để gửi hàng: Thiếu Phường/Xã bị chặn
     */
    public function test_staff_quick_shipment_requires_ward(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]), [
                'shipping_address' => '456 Phố Huế',
                'city_province' => 'Hà Nội',
                'ward' => '',
                'phone' => '0987111222',
            ]);

        $response->assertSessionHasErrors(['ward']);
    }

    /**
     * Nhân viên nhập nhanh để gửi hàng: Thiếu Tỉnh/TP bị chặn
     */
    public function test_staff_quick_shipment_requires_city(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]), [
                'shipping_address' => '456 Phố Huế',
                'city_province' => '',
                'ward' => 'Phố Huế',
                'phone' => '0987111222',
            ]);

        $response->assertSessionHasErrors(['city_province']);
    }

    /**
     * Nhân viên nhập nhanh để gửi hàng: Thiếu Số điện thoại bị chặn
     */
    public function test_staff_quick_shipment_requires_phone(): void
    {
        // Xóa SĐT của creator để giả định chưa có SĐT
        $this->creator->update(['phone' => null]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]), [
                'shipping_address' => '456 Phố Huế',
                'city_province' => 'Hà Nội',
                'ward' => 'Phố Huế',
                'phone' => '',
            ]);

        $response->assertSessionHasErrors(['phone']);
    }

    /**
     * Nhân viên nhập nhanh để gửi hàng đầy đủ các trường: Thành công và chuyển sang sample_sent
     */
    public function test_staff_quick_shipment_succeeds_with_all_mandatory_fields(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $this->campaignCreator->id,
            ]), [
                'shipping_address' => '456 Phố Huế',
                'city_province' => 'Hà Nội',
                'ward' => 'Phố Huế',
                'district' => 'Hai Bà Trưng',
                'phone' => '0987111222',
                'notes' => 'Gói hàng mẫu số 1',
                'shipped_at' => now()->toDateString(),
            ]);

        $response->assertRedirect();

        $this->creator->refresh();
        $this->campaignCreator->refresh();

        $this->assertEquals('456 Phố Huế', $this->creator->shipping_address);
        $this->assertEquals('Hà Nội', $this->creator->city_province);
        $this->assertEquals('Hai Bà Trưng', $this->creator->district);
        $this->assertEquals('Phố Huế', $this->creator->ward);
        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $this->campaignCreator->status);
        $this->assertNotNull($this->campaignCreator->sample_sent_at);
    }
}

