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
use Tests\TestCase;

class InternalSecurityAndIsolationTest extends TestCase
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
            'product_name' => 'Kem Dưỡng Ẩm',
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->admin->id,
        ], $overrides));
    }

    protected function createCreator(string $name = 'Creator Test'): Creator
    {
        return Creator::create([
            'name' => $name,
            'phone' => '098' . rand(1000000, 9999999),
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 100,
        ]);
    }

    public function test_user_without_roles_is_blocked_and_redirected_to_login(): void
    {
        // Tạo tài khoản không có vai trò nào (mô phỏng user tự tạo hoặc chưa duyệt)
        $unassignedUser = User::factory()->create([
            'email' => 'haudd_unassigned@bookingkol.vn',
        ]);

        // Cố gắng truy cập Dashboard
        $response = $this->actingAs($unassignedUser)->get(route('dashboard'));

        $this->assertGuest();
        $response->assertRedirect(route('login'));
        $response->assertSessionHas('warning');
    }

    public function test_staff_only_sees_assigned_kocs_in_campaign_detail(): void
    {
        $campaign = $this->createCampaign();
        $creator1 = $this->createCreator('KOC của Staff 1');
        $creator2 = $this->createCreator('KOC của Staff 2');

        $staff2 = User::factory()->create();
        $staff2->assignRole('Staff');

        // Gán KOC 1 cho $this->staff
        $cc1 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator1->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 1000000,
        ]);

        // Gán KOC 2 cho $staff2
        $cc2 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator2->id,
            'assigned_to' => $staff2->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 2000000,
        ]);

        // 1. Staff 1 truy cập: Chỉ nhìn thấy KOC 1, hoàn toàn không thấy KOC 2
        $staff1Res = $this->actingAs($this->staff)->get(route('campaigns.show', $campaign->id));
        $staff1Res->assertOk();
        $staff1Res->assertInertia(function ($page) use ($cc1, $cc2) {
            $campaignData = $page->toArray()['props']['campaign'];
            $kocIds = collect($campaignData['campaign_creators'])->pluck('id')->toArray();

            $this->assertContains($cc1->id, $kocIds);
            $this->assertNotContains($cc2->id, $kocIds);
        });

        // 2. Admin truy cập: Nhìn thấy toàn bộ KOC (cả KOC 1 và KOC 2)
        $adminRes = $this->actingAs($this->admin)->get(route('campaigns.show', $campaign->id));
        $adminRes->assertOk();
        $adminRes->assertInertia(function ($page) use ($cc1, $cc2) {
            $campaignData = $page->toArray()['props']['campaign'];
            $kocIds = collect($campaignData['campaign_creators'])->pluck('id')->toArray();

            $this->assertContains($cc1->id, $kocIds);
            $this->assertContains($cc2->id, $kocIds);
        });
    }

    public function test_staff_cannot_edit_koc_assigned_to_another_staff(): void
    {
        $campaign = $this->createCampaign();
        $creator = $this->createCreator();

        $otherStaff = User::factory()->create();
        $otherStaff->assignRole('Staff');

        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $otherStaff->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 1500000,
        ]);

        // Staff 1 cố gắng cập nhật KOC của Staff khác -> Bị từ chối
        $response = $this->actingAs($this->staff)->patch(route('pipeline.status.update', $cc->id), [
            'status' => 'contacted',
        ]);

        $response->assertSessionHasErrors(['error']);
        $this->assertEquals(PipelineStatusEnum::NEW, $cc->fresh()->status);
    }
}

