<?php

namespace Modules\Creator\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorRateCard;
use Tests\TestCase;

class CreatorEditTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_render_creator_edit_page(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Linh Nga',
            'phone' => '0912345678',
            'email' => 'linhnga@example.com',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
        ]);

        $response = $this->actingAs($this->user)->get(route('creators.edit', $creator->id));

        $response->assertOk();
    }

    public function test_can_update_creator_basic_info_and_address(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Linh Nga',
            'phone' => '0912345678',
            'email' => 'linhnga@example.com',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
        ]);

        $updatePayload = [
            'name' => 'KOC Linh Nga Mới',
            'phone' => '0987654321',
            'email' => 'linhnga.new@example.com',
            'niche' => 'fashion',
            'tier' => 'macro',
            'shipping_address' => '123 Đường Nguyễn Trãi',
            'city_province' => 'TP. Hồ Chí Minh',
            'district' => 'Quận 1',
            'ward' => 'Phường Bến Nghé',
            'notes' => 'Chuyên video thời trang công sở',
        ];

        $response = $this->actingAs($this->user)->put(route('creators.update', $creator->id), $updatePayload);

        $response->assertRedirect(route('creators.show', $creator->id));
        $this->assertDatabaseHas('creators', [
            'id' => $creator->id,
            'name' => 'KOC Linh Nga Mới',
            'phone' => '0987654321',
            'email' => 'linhnga.new@example.com',
            'niche' => 'fashion',
            'tier' => 'macro',
            'shipping_address' => '123 Đường Nguyễn Trãi',
            'city_province' => 'TP. Hồ Chí Minh',
            'district' => 'Quận 1',
            'ward' => 'Phường Bến Nghé',
        ]);
    }

    public function test_can_update_social_accounts_and_rate_cards(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Review',
            'phone' => '0912345678',
            'niche' => 'tech',
        ]);

        $accountOld = CreatorAccount::create([
            'creator_id' => $creator->id,
            'platform' => 'tiktok',
            'handle' => 'koc_review_old',
            'followers_count' => 10000,
        ]);

        $updatePayload = [
            'name' => 'KOC Review',
            'niche' => 'tech',
            'accounts' => [
                [
                    'id' => $accountOld->id,
                    'platform' => 'tiktok',
                    'handle' => 'koc_review_updated',
                    'followers_count' => 25000,
                    'url' => 'https://tiktok.com/@koc_review_updated',
                ],
                [
                    'platform' => 'youtube',
                    'handle' => 'koc_channel',
                    'followers_count' => 50000,
                ],
            ],
            'rate_cards' => [
                [
                    'content_type' => '1 Video TikTok 60s',
                    'price' => 5000000,
                    'notes' => 'Bao gồm chỉnh sửa 2 lần',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->put(route('creators.update', $creator->id), $updatePayload);

        $response->assertRedirect(route('creators.show', $creator->id));

        $this->assertDatabaseHas('creator_accounts', [
            'id' => $accountOld->id,
            'handle' => 'koc_review_updated',
            'followers_count' => 25000,
        ]);

        $this->assertDatabaseHas('creator_accounts', [
            'creator_id' => $creator->id,
            'platform' => 'youtube',
            'handle' => 'koc_channel',
            'followers_count' => 50000,
        ]);

        $this->assertDatabaseHas('creator_rate_cards', [
            'creator_id' => $creator->id,
            'content_type' => '1 Video TikTok 60s',
            'price' => 5000000,
        ]);
    }

    public function test_validation_prevents_duplicate_phone_from_other_creator_but_allows_self(): void
    {
        $otherCreator = Creator::create([
            'name' => 'Creator Khác',
            'phone' => '0911222333',
            'niche' => 'food',
        ]);

        $myCreator = Creator::create([
            'name' => 'Creator Của Tôi',
            'phone' => '0988777666',
            'niche' => 'food',
        ]);

        // Cập nhật giữ nguyên SĐT của chính mình -> OK
        $responseSame = $this->actingAs($this->user)->put(route('creators.update', $myCreator->id), [
            'name' => 'Creator Của Tôi Đổi Tên',
            'phone' => '0988777666',
            'niche' => 'food',
        ]);
        $responseSame->assertSessionHasNoErrors();

        // Cập nhật SĐT trùng với Creator Khác -> Báo lỗi
        $responseDuplicate = $this->actingAs($this->user)->put(route('creators.update', $myCreator->id), [
            'name' => 'Creator Của Tôi Đổi Tên',
            'phone' => '0911222333',
            'niche' => 'food',
        ]);
        $responseDuplicate->assertSessionHasErrors(['phone']);
    }

    public function test_can_update_blacklist_and_trust_score(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Nguy Hiểm',
            'phone' => '0901234567',
            'niche' => 'lifestyle',
            'trust_score' => 100,
            'blacklist_status' => false,
        ]);

        $response = $this->actingAs($this->user)->put(route('creators.update', $creator->id), [
            'name' => 'KOC Nguy Hiểm',
            'niche' => 'lifestyle',
            'trust_score' => 20,
            'blacklist_status' => true,
            'blacklist_reason' => 'Đã bom hàng 2 chiến dịch liên tiếp',
        ]);

        $response->assertRedirect(route('creators.show', $creator->id));
        $this->assertDatabaseHas('creators', [
            'id' => $creator->id,
            'trust_score' => 20,
            'blacklist_status' => true,
            'blacklist_reason' => 'Đã bom hàng 2 chiến dịch liên tiếp',
        ]);
    }
}

