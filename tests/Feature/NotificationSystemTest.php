<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\DeadlineUrgencyNotification;
use App\Notifications\KocAddressConfirmedNotification;
use App\Notifications\KocAssignedNotification;
use App\Notifications\KocNoShowAlertNotification;
use App\Notifications\KocVideoSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\PipelineService;
use Modules\Creator\Models\Creator;
use Modules\Portal\Services\PortalService;
use Modules\Settings\Database\Seeders\RoleAndPermissionSeeder;
use Tests\TestCase;

class NotificationSystemTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $staff;
    protected User $staff2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin = User::where('email', 'admin@bookingkol.vn')->first();
        $this->staff = User::where('email', 'staff@bookingkol.vn')->first();

        // Tạo thêm staff thứ 2 để kiểm tra cách ly dữ liệu
        $this->staff2 = User::factory()->create([
            'name' => 'Staff 2 Isolation',
            'email' => 'staff2@bookingkol.vn',
        ]);
        $this->staff2->assignRole('Staff');
    }

    protected function createCampaign(User $user): Campaign
    {
        return Campaign::create([
            'name' => 'Chiến Dịch Test Thông Báo',
            'product_name' => 'Son Dưỡng Hữu Cơ',
            'budget' => 15000000,
            'target_creators_count' => 5,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'video_deadline_days' => 7,
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $user->id,
        ]);
    }

    protected function createCreator(string $name = 'Thảo Vy Review'): Creator
    {
        return Creator::create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '', $name)) . '@gmail.com',
            'phone' => '0901234567',
            'shipping_address' => '123 Đường Nguyễn Trãi, Quận 1',
            'city_province' => 'TP. Hồ Chí Minh',
            'trust_score' => 90,
        ]);
    }

    public function test_unauthenticated_user_cannot_access_notifications(): void
    {
        $response = $this->getJson(route('notifications.index'));
        $response->assertStatus(401);
    }

    public function test_user_can_fetch_notifications_and_data_is_strictly_isolated(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        // Gửi thông báo cho staff 1
        $this->staff->notify(new KocAssignedNotification($campaignCreator, 'Leader'));

        // Staff 1 kiểm tra: nhận được 1 thông báo
        $resStaff1 = $this->actingAs($this->staff)->getJson(route('notifications.index'));
        $resStaff1->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 1)
            ->assertJsonCount(1, 'notifications');

        // Staff 2 kiểm tra: KHÔNG nhận được thông báo của Staff 1 (data isolation)
        $resStaff2 = $this->actingAs($this->staff2)->getJson(route('notifications.index'));
        $resStaff2->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 0)
            ->assertJsonCount(0, 'notifications');
    }

    public function test_user_can_filter_notifications_by_unread(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        // Gửi 2 thông báo
        $this->staff->notify(new KocAssignedNotification($campaignCreator, 'Admin'));
        $this->staff->notify(new KocAddressConfirmedNotification($campaignCreator));

        // Đánh dấu 1 thông báo là đã đọc
        $firstNotification = $this->staff->notifications()->first();
        $firstNotification->markAsRead();

        // Lọc filter=unread
        $resUnread = $this->actingAs($this->staff)->getJson(route('notifications.index', ['filter' => 'unread']));
        $resUnread->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonCount(1, 'notifications');

        // Lọc filter=all
        $resAll = $this->actingAs($this->staff)->getJson(route('notifications.index', ['filter' => 'all']));
        $resAll->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonCount(2, 'notifications');
    }

    public function test_user_can_mark_single_notification_as_read(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $this->staff->notify(new KocAssignedNotification($campaignCreator, 'Admin'));
        $notification = $this->staff->notifications()->first();

        $this->assertNull($notification->read_at);

        $res = $this->actingAs($this->staff)->patchJson(route('notifications.read', $notification->id));
        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 0);

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_user_cannot_mark_other_users_notification_as_read(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $this->staff->notify(new KocAssignedNotification($campaignCreator, 'Admin'));
        $notification = $this->staff->notifications()->first();

        // Staff 2 cố gắng đánh dấu đọc thông báo của Staff 1
        $res = $this->actingAs($this->staff2)->patchJson(route('notifications.read', $notification->id));
        $res->assertOk();

        // Thông báo của Staff 1 vẫn phải là chưa đọc
        $this->assertNull($notification->fresh()->read_at);
    }

    public function test_user_can_mark_all_notifications_as_read(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $this->staff->notify(new KocAssignedNotification($campaignCreator, 'Admin'));
        $this->staff->notify(new KocAddressConfirmedNotification($campaignCreator));

        $this->assertEquals(2, $this->staff->unreadNotifications()->count());

        $res = $this->actingAs($this->staff)->postJson(route('notifications.markAllRead'));
        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 0);

        $this->assertEquals(0, $this->staff->unreadNotifications()->count());
    }

    public function test_user_can_delete_notification(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $this->staff->notify(new KocAssignedNotification($campaignCreator, 'Admin'));
        $notification = $this->staff->notifications()->first();

        $res = $this->actingAs($this->staff)->deleteJson(route('notifications.destroy', $notification->id));
        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 0);

        $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
    }

    public function test_portal_address_confirmation_triggers_notification(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
            'portal_token' => 'sample_token_portal_address',
        ]);

        $portalService = app(PortalService::class);
        $portalService->updateShippingAddress($campaignCreator, [
            'shipping_address' => '456 Lê Lợi, Quận 1, TP.HCM',
            'phone' => '0987654321',
        ]);

        $this->assertEquals(1, $this->staff->unreadNotifications()->count());
        $notification = $this->staff->unreadNotifications()->first();
        $this->assertEquals('shipment', $notification->data['category']);
        $this->assertStringContainsString($creator->name, $notification->data['title']);
    }

    public function test_portal_video_submission_triggers_notification(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_sent_at' => now()->subDays(5),
            'sample_received_at' => now()->subDays(2),
            'portal_token' => 'sample_token_portal_video',
        ]);

        $portalService = app(PortalService::class);
        $portalService->submitVideo($campaignCreator, [
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@thaovy/video/7234567890123456789',
            'video_title' => 'Review Son Dưỡng Đỉnh Cao',
        ]);

        $this->assertEquals(1, $this->staff->unreadNotifications()->count());
        $notification = $this->staff->unreadNotifications()->first();
        $this->assertEquals('video', $notification->data['category']);
        $this->assertStringContainsString($creator->name, $notification->data['title']);
    }

    public function test_pipeline_no_show_triggers_risk_alert_to_admin(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => now()->subDays(10),
        ]);

        $pipelineService = app(PipelineService::class);
        $pipelineService->updateCreatorStatus($campaignCreator, PipelineStatusEnum::NO_SHOW);

        // Admin nhận được thông báo cảnh báo bom hàng
        $this->assertGreaterThan(0, $this->admin->unreadNotifications()->count());
        $notification = $this->admin->unreadNotifications()->first();
        $this->assertEquals('risk', $notification->data['category']);
        $this->assertStringContainsString('CẢNH BÁO BOM HÀNG', $notification->data['title']);
    }

    public function test_check_campaign_deadlines_command_sends_notifications(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();

        // KOC nhận mẫu 10 ngày trước, deadline của chiến dịch là 7 ngày => Đã quá hạn 3 ngày
        CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_sent_at' => now()->subDays(12),
            'sample_received_at' => now()->subDays(10),
        ]);

        $this->assertEquals(0, $this->staff->unreadNotifications()->count());

        $exitCode = Artisan::call('campaigns:check-deadlines');
        $this->assertEquals(0, $exitCode);

        $this->assertEquals(1, $this->staff->unreadNotifications()->count());
        $notification = $this->staff->unreadNotifications()->first();
        $this->assertEquals('deadline', $notification->data['category']);
        $this->assertStringContainsString('QUÁ HẠN', $notification->data['title']);
    }

    public function test_notification_urls_contain_focus_koc_and_stage_filters(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator();
        $campaignCreator = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $notifAddress = new KocAddressConfirmedNotification($campaignCreator);
        $dataAddress = $notifAddress->toArray($this->staff);
        $this->assertStringContainsString("focus_koc={$campaignCreator->id}", $dataAddress['url']);
        $this->assertStringContainsString("stage=shipping", $dataAddress['url']);

        $notifVideo = new KocVideoSubmittedNotification($campaignCreator);
        $dataVideo = $notifVideo->toArray($this->staff);
        $this->assertStringContainsString("focus_koc={$campaignCreator->id}", $dataVideo['url']);
        $this->assertStringContainsString("stage=production", $dataVideo['url']);

        $notifAssign = new KocAssignedNotification($campaignCreator, 'Leader');
        $dataAssign = $notifAssign->toArray($this->staff);
        $this->assertStringContainsString("focus_koc={$campaignCreator->id}", $dataAssign['url']);

        $notifDeadline = new DeadlineUrgencyNotification($campaignCreator, 'overdue', 3);
        $dataDeadline = $notifDeadline->toArray($this->staff);
        $this->assertStringContainsString("focus_koc={$campaignCreator->id}", $dataDeadline['url']);
    }

    public function test_workspace_focus_koc_filter_isolates_specific_koc(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator1 = $this->createCreator('Creator Một');
        $creator2 = $this->createCreator('Creator Hai');

        $cc1 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator1->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);
        $cc2 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator2->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $res = $this->actingAs($this->staff)->get(route('workspace.index', ['focus_koc' => $cc1->id]));
        $res->assertOk();
        $res->assertInertia(fn ($page) => $page
            ->component('Campaign/Workspace')
            ->where('filters.focus_koc', $cc1->id)
            ->where('stats.total_my_kocs', 1)
        );
    }

    public function test_realtime_check_new_endpoint_returns_latest_unread_notification(): void
    {
        $campaign = $this->createCampaign($this->admin);
        $creator = $this->createCreator('Linh Ka Review');
        $cc = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        // Ban đầu chưa có thông báo
        $resInitial = $this->actingAs($this->staff)->getJson(route('notifications.checkNew'));
        $resInitial->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 0)
            ->assertJsonPath('latest', null);

        // Kích hoạt thông báo mới
        $this->staff->notify(new KocAddressConfirmedNotification($cc));

        $resAfter = $this->actingAs($this->staff)->getJson(route('notifications.checkNew'));
        $resAfter->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('latest.category', 'shipment');
    }
}

