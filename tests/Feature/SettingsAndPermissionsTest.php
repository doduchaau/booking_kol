<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Modules\Settings\Database\Seeders\RoleAndPermissionSeeder;
use Modules\Settings\Models\Setting;
use Tests\TestCase;

class SettingsAndPermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $leader;
    protected User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@bookingkol.vn')->first();
        $this->leader = User::where('email', 'leader@bookingkol.vn')->first();
        $this->staff = User::where('email', 'staff@bookingkol.vn')->first();
    }

    protected function createCampaign(array $overrides = []): Campaign
    {
        return Campaign::create(array_merge([
            'name' => 'Chiến Dịch Mỹ Phẩm Thu Đông',
            'product_name' => 'Serum Phục Hồi B5',
            'budget' => 30000000,
            'target_creators_count' => 15,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->admin->id,
        ], $overrides));
    }

    protected function createCreator(): Creator
    {
        return Creator::create([
            'name' => 'Creator Beauty',
            'phone' => '0912' . rand(100000, 999999),
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 100,
        ]);
    }

    public function test_settings_index_accessible_by_admin_and_denied_for_staff(): void
    {
        // 1. Admin truy cập thành công
        $adminRes = $this->actingAs($this->admin)->get(route('settings.index'));
        $adminRes->assertOk();
        $adminRes->assertInertia(fn ($page) => $page
            ->component('Settings/Index')
            ->has('settings')
            ->has('users')
            ->has('availableRoles')
        );

        // 2. Staff truy cập bị từ chối 403
        $staffRes = $this->actingAs($this->staff)->get(route('settings.index'));
        $staffRes->assertForbidden();
    }

    public function test_admin_can_update_general_settings(): void
    {
        $response = $this->actingAs($this->admin)->post(route('settings.general.update'), [
            'default_video_deadline_days' => 10,
            'blacklist_penalty_score' => 35,
        ]);

        $response->assertSessionHas('success');
        $this->assertEquals(10, Setting::get('default_video_deadline_days'));
        $this->assertEquals(35, Setting::get('blacklist_penalty_score'));
    }

    public function test_admin_can_update_integrations_with_secure_encryption(): void
    {
        $response = $this->actingAs($this->admin)->post(route('settings.integrations.update'), [
            'zalo_oa_app_id' => '123456789',
            'zalo_oa_secret_key' => 'top_secret_zalo_key',
            'zalo_oa_id' => '987654321',
            'ghn_token' => 'ghn_access_token_secret_123',
            'ghn_shop_id' => '99999',
            'ghtk_token' => 'ghtk_access_token_secret_456',
        ]);

        $response->assertSessionHas('success');

        // Giá trị trong database phải được mã hóa (không lưu plaintext)
        $rawSetting = Setting::where('key', 'zalo_oa_secret_key')->first();
        $this->assertTrue($rawSetting->is_encrypted);
        $this->assertNotEquals('top_secret_zalo_key', $rawSetting->value);

        // Khi truy xuất qua Setting::get() phải giải mã đúng
        $this->assertEquals('top_secret_zalo_key', Setting::get('zalo_oa_secret_key'));
        $this->assertEquals('ghn_access_token_secret_123', Setting::get('ghn_token'));
        $this->assertEquals('ghtk_access_token_secret_456', Setting::get('ghtk_token'));
    }

    public function test_admin_can_create_user_and_update_roles(): void
    {
        // 1. Tạo nhân sự mới
        $createRes = $this->actingAs($this->admin)->post(route('settings.users.store'), [
            'name' => 'Đỗ Văn Booking',
            'email' => 'do.booking@bookingkol.vn',
            'password' => 'secret12345',
            'role' => 'Staff',
        ]);

        $createRes->assertSessionHas('success');
        $newUser = User::where('email', 'do.booking@bookingkol.vn')->first();
        $this->assertNotNull($newUser);
        $this->assertTrue($newUser->hasRole('Staff'));

        // 2. Thăng cấp lên Leader
        $roleRes = $this->actingAs($this->admin)->put(route('settings.users.role.update', $newUser->id), [
            'role' => 'Leader',
        ]);

        $roleRes->assertSessionHas('success');
        $this->assertTrue($newUser->fresh()->hasRole('Leader'));
    }

    public function test_staff_cannot_delete_campaign_or_change_budget(): void
    {
        $campaign = $this->createCampaign(['budget' => 30000000]);

        // 1. Staff cố gắng xóa chiến dịch -> Bị từ chối
        $delRes = $this->actingAs($this->staff)->delete(route('campaigns.destroy', $campaign->id));
        $delRes->assertSessionHasErrors(['error']);
        $this->assertDatabaseHas('campaigns', ['id' => $campaign->id]);

        // 2. Leader có thể xóa chiến dịch
        $leaderDelRes = $this->actingAs($this->leader)->delete(route('campaigns.destroy', $campaign->id));
        $leaderDelRes->assertSessionHas('success');
        $this->assertSoftDeleted('campaigns', ['id' => $campaign->id]);

        // 3. Staff cố gắng thay đổi ngân sách -> Bị từ chối
        $campaign2 = $this->createCampaign(['budget' => 40000000]);
        $updateRes = $this->actingAs($this->staff)->put(route('campaigns.update', $campaign2->id), [
            'name' => $campaign2->name,
            'product_name' => $campaign2->product_name,
            'budget' => 80000000, // Cố tình đổi ngân sách
            'target_creators_count' => 15,
            'start_date' => $campaign2->start_date->toDateString(),
            'end_date' => $campaign2->end_date->toDateString(),
            'status' => 'active',
        ]);
        $updateRes->assertSessionHasErrors(['budget']);
    }

    public function test_staff_can_only_edit_assigned_kocs(): void
    {
        $campaign = $this->createCampaign();
        $creator1 = $this->createCreator();
        $creator2 = $this->createCreator();

        $otherStaff = User::factory()->create();
        $otherStaff->assignRole('Staff');

        // KOC 1: Gán cho $this->staff
        $cc1 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator1->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 1000000,
        ]);

        // KOC 2: Gán cho $otherStaff
        $cc2 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator2->id,
            'assigned_to' => $otherStaff->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 2000000,
        ]);

        // 1. Staff sửa KOC của chính mình -> Thành công
        $ownRes = $this->actingAs($this->staff)->patch(route('pipeline.status.update', $cc1->id), [
            'status' => 'contacted',
        ]);
        $ownRes->assertSessionHas('success');
        $this->assertEquals(PipelineStatusEnum::CONTACTED, $cc1->fresh()->status);

        // 2. Staff sửa KOC của người khác -> Bị chặn
        $otherRes = $this->actingAs($this->staff)->patch(route('pipeline.status.update', $cc2->id), [
            'status' => 'contacted',
        ]);
        $otherRes->assertSessionHasErrors(['error']);
        $this->assertEquals(PipelineStatusEnum::NEW, $cc2->fresh()->status);
    }
}

