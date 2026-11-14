<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\CollaborationTypeEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Enums\SampleStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Models\CampaignCreatorProduct;
use Modules\Campaign\Models\CampaignProduct;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class CampaignMultiProductTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_create_campaign_with_multiple_products_and_individual_briefs(): void
    {
        $payload = [
            'name' => 'Chiến dịch Mỹ phẩm Đa Sản Phẩm',
            'product_name' => '', // Sẽ tự động lấy tên sản phẩm đầu tiên
            'budget' => 50000000,
            'target_creators_count' => 15,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 12.0,
            'status' => CampaignStatusEnum::ACTIVE->value,
            'products' => [
                [
                    'product_name' => 'Tinh chất dưỡng trắng Serum C',
                    'product_sku' => 'SERUM-01',
                    'product_url' => 'https://shopee.vn/serum-c',
                    'retail_price' => 350000,
                    'brief_content' => 'Nhấn mạnh thành phần Vitamin C 15% dưỡng sáng sau 7 ngày',
                    'hashtags' => '#serumc #duongsang',
                    'sample_requirement' => 'Gửi chai fullsize 30ml',
                ],
                [
                    'product_name' => 'Kem chống nắng nâng tone UltraSun',
                    'product_sku' => 'SUN-02',
                    'product_url' => 'https://shopee.vn/sun-ultra',
                    'retail_price' => 280000,
                    'brief_content' => 'Quay cảnh bôi ngoài trời, kiềm dầu không bết dính',
                    'hashtags' => '#ultrasun #kemchongnang',
                    'sample_requirement' => 'Gửi tuýp 50ml',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post(route('campaigns.store'), $payload);

        $response->assertRedirect();
        
        // Kiểm tra chiến dịch được tạo và fallback product_name chính xác
        $this->assertDatabaseHas('campaigns', [
            'name' => 'Chiến dịch Mỹ phẩm Đa Sản Phẩm',
            'product_name' => 'Tinh chất dưỡng trắng Serum C',
        ]);

        $campaign = Campaign::where('name', 'Chiến dịch Mỹ phẩm Đa Sản Phẩm')->first();
        $this->assertNotNull($campaign);

        // Kiểm tra bảng campaign_products
        $this->assertCount(2, $campaign->products);
        $this->assertDatabaseHas('campaign_products', [
            'campaign_id' => $campaign->id,
            'name' => 'Tinh chất dưỡng trắng Serum C',
            'sku' => 'SERUM-01',
            'product_url' => 'https://shopee.vn/serum-c',
            'brief_content' => 'Nhấn mạnh thành phần Vitamin C 15% dưỡng sáng sau 7 ngày',
            'hashtags' => '#serumc #duongsang',
        ]);
        $this->assertDatabaseHas('campaign_products', [
            'campaign_id' => $campaign->id,
            'name' => 'Kem chống nắng nâng tone UltraSun',
            'sku' => 'SUN-02',
            'product_url' => 'https://shopee.vn/sun-ultra',
            'brief_content' => 'Quay cảnh bôi ngoài trời, kiềm dầu không bết dính',
            'hashtags' => '#ultrasun #kemchongnang',
        ]);
    }

    public function test_can_assign_creator_with_collaboration_type_and_selected_products(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Mẫu Test',
            'product_name' => 'Sản phẩm Chính',
            'budget' => 20000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 10,
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $prod1 = CampaignProduct::create([
            'campaign_id' => $campaign->id,
            'product_name' => 'Sản phẩm 1',
            'product_sku' => 'SP-01',
            'retail_price' => 100000,
        ]);

        $prod2 = CampaignProduct::create([
            'campaign_id' => $campaign->id,
            'product_name' => 'Sản phẩm 2',
            'product_sku' => 'SP-02',
            'retail_price' => 200000,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Nguyen Van A',
            'phone' => '0987654321',
            'email' => 'koc.a@test.com',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
        ]);

        // Gán KOC vào chiến dịch với hình thức Livestream và phân bổ SP 1 (SL: 2), SP 2 (SL: 1)
        $payload = [
            'creator_ids' => [$creator->id],
            'collaboration_type' => CollaborationTypeEnum::LIVESTREAM->value,
            'product_ids' => [$prod1->id, $prod2->id],
            'product_quantities' => [
                $prod1->id => 2,
                $prod2->id => 1,
            ],
            'booking_fee' => 500000,
        ];

        $response = $this->actingAs($this->user)->post(route('campaigns.creators.add', $campaign), $payload);

        $response->assertRedirect();

        // Kiểm tra campaign_creators
        $this->assertDatabaseHas('campaign_creators', [
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'collaboration_type' => 'livestream',
            'total_samples_assigned' => 3,
        ]);

        $pivot = CampaignCreator::where('campaign_id', $campaign->id)
            ->where('creator_id', $creator->id)
            ->first();
        $this->assertNotNull($pivot);

        // Kiểm tra campaign_creator_products
        $this->assertDatabaseHas('campaign_creator_products', [
            'campaign_creator_id' => $pivot->id,
            'campaign_product_id' => $prod1->id,
            'quantity_assigned' => 2,
            'sample_status' => SampleStatusEnum::ASSIGNED->value,
        ]);

        $this->assertDatabaseHas('campaign_creator_products', [
            'campaign_creator_id' => $pivot->id,
            'campaign_product_id' => $prod2->id,
            'quantity_assigned' => 1,
            'sample_status' => SampleStatusEnum::ASSIGNED->value,
        ]);
    }

    public function test_can_send_samples_with_multiple_products_and_update_status(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Test Gửi Mẫu',
            'product_name' => 'Sản phẩm Test',
            'budget' => 30000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 15,
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $prod1 = CampaignProduct::create([
            'campaign_id' => $campaign->id,
            'product_name' => 'Mặt nạ tế bào gốc',
            'product_sku' => 'MASK-01',
            'retail_price' => 50000,
        ]);

        $prod2 = CampaignProduct::create([
            'campaign_id' => $campaign->id,
            'product_name' => 'Kem dưỡng ẩm ban đêm',
            'product_sku' => 'CREAM-02',
            'retail_price' => 300000,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Tran Thi B',
            'phone' => '0912345678',
            'shipping_address' => '123 Đường Nguyễn Trãi, Quận 1, TP. HCM',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MACRO,
        ]);

        $pivot = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
            'collaboration_type' => CollaborationTypeEnum::BOTH,
            'total_samples_assigned' => 4,
            'portal_token' => 'portal-token-sample-test-123456',
        ]);

        CampaignCreatorProduct::create([
            'campaign_creator_id' => $pivot->id,
            'campaign_product_id' => $prod1->id,
            'quantity_assigned' => 3,
            'sample_status' => SampleStatusEnum::ASSIGNED,
        ]);

        CampaignCreatorProduct::create([
            'campaign_creator_id' => $pivot->id,
            'campaign_product_id' => $prod2->id,
            'quantity_assigned' => 1,
            'sample_status' => SampleStatusEnum::ASSIGNED,
        ]);

        // Thực hiện gửi mẫu qua endpoint campaigns.creators.shipments.store
        $shipmentPayload = [
            'sent_at' => now()->toDateString(),
            'carrier_name' => 'Nội bộ',
            'tracking_code' => 'TEST-TRACK-999',
            'products' => [
                [
                    'product_id' => $prod1->id,
                    'quantity' => 3,
                    'variant' => 'Hộp 5 miếng',
                ],
                [
                    'product_id' => $prod2->id,
                    'quantity' => 1,
                    'variant' => 'Hũ 50g',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post(
            route('campaigns.creators.shipments.store', [$campaign, $pivot]),
            $shipmentPayload
        );

        $response->assertRedirect();

        // Kiểm tra campaign_creators đã đổi status thành sample_sent và cập nhật total_samples_sent = 4
        $this->assertDatabaseHas('campaign_creators', [
            'id' => $pivot->id,
            'status' => PipelineStatusEnum::SAMPLE_SENT->value,
            'total_samples_sent' => 4,
        ]);

        // Kiểm tra từng món trong campaign_creator_products đã chuyển sang sent
        $this->assertDatabaseHas('campaign_creator_products', [
            'campaign_creator_id' => $pivot->id,
            'campaign_product_id' => $prod1->id,
            'quantity_sent' => 3,
            'sample_variant' => 'Hộp 5 miếng',
            'sample_status' => SampleStatusEnum::SENT->value,
        ]);

        $this->assertDatabaseHas('campaign_creator_products', [
            'campaign_creator_id' => $pivot->id,
            'campaign_product_id' => $prod2->id,
            'quantity_sent' => 1,
            'sample_variant' => 'Hũ 50g',
            'sample_status' => SampleStatusEnum::SENT->value,
        ]);

        // Kiểm tra Portal KOC hiển thị đầy đủ thông tin sản phẩm và phân loại hợp tác
        $portalResponse = $this->get(route('portal.show', $pivot->portal_token));
        $portalResponse->assertOk();
        $portalResponse->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Index')
            ->where('pipeline.collaboration_type', 'both')
            ->where('pipeline.total_samples_sent', 4)
            ->has('pipeline.creator_products', 2)
            ->where('pipeline.creator_products.0.product_name', 'Mặt nạ tế bào gốc')
            ->where('pipeline.creator_products.0.quantity_sent', 3)
            ->where('pipeline.creator_products.1.product_name', 'Kem dưỡng ẩm ban đêm')
            ->where('pipeline.creator_products.1.quantity_sent', 1)
        );
    }

    public function test_assign_creator_pure_selection_has_zero_samples_and_new_status(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Test Gán Thuần Túy',
            'product_name' => 'Sản phẩm A',
            'budget' => 10000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 10,
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        CampaignProduct::create([
            'campaign_id' => $campaign->id,
            'product_name' => 'Sản phẩm A',
            'retail_price' => 100000,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Nguyen Van C',
            'phone' => '0909090909',
            'niche' => 'lifestyle',
            'tier' => CreatorTierEnum::MICRO,
        ]);

        // Gán KOC đơn thuần (chỉ chọn KOC, không gửi mẫu, không phân loại)
        $payload = [
            'creator_ids' => [$creator->id],
            'booking_fee' => 0,
        ];

        $response = $this->actingAs($this->user)->post(route('campaigns.creators.add', $campaign), $payload);
        $response->assertRedirect();

        // Kiểm tra KOC mới được gán ở trạng thái 'new', 0 mẫu gán, không có bản ghi sản phẩm mẫu
        $this->assertDatabaseHas('campaign_creators', [
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW->value,
            'total_samples_assigned' => 0,
            'total_samples_sent' => 0,
        ]);

        $pivot = CampaignCreator::where('campaign_id', $campaign->id)
            ->where('creator_id', $creator->id)
            ->first();

        $this->assertDatabaseMissing('campaign_creator_products', [
            'campaign_creator_id' => $pivot->id,
        ]);
    }

    public function test_inline_quick_update_collaboration_type_and_notes(): void
    {
        $campaign = Campaign::create([
            'name' => 'Chiến dịch Test Quick Update',
            'product_name' => 'Sản phẩm B',
            'budget' => 10000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'commission_rate' => 10,
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $creator = Creator::create([
            'name' => 'KOC Le Van D',
            'phone' => '0918181818',
            'niche' => 'tech',
            'tier' => CreatorTierEnum::NANO,
        ]);

        $pivot = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
            'collaboration_type' => CollaborationTypeEnum::VIDEO,
            'notes' => null,
        ]);

        // Cập nhật nhanh hình thức hợp tác sang Livestream và thêm ghi chú tay
        $response = $this->actingAs($this->user)->patch(
            route('campaigns.creators.quick-update', [$campaign, $pivot]),
            [
                'collaboration_type' => 'livestream',
                'notes' => 'KOC hẹn livestream tối thứ 7 lúc 20h',
            ]
        );

        $response->assertRedirect();

        $this->assertDatabaseHas('campaign_creators', [
            'id' => $pivot->id,
            'collaboration_type' => 'livestream',
            'notes' => 'KOC hẹn livestream tối thứ 7 lúc 20h',
        ]);
    }
}
