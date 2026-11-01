<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Models\Creator;
use Modules\Outreach\Models\OutreachMessage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FollowupAndWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected User $staff;
    protected Campaign $campaign;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;

    protected function setUp(): void
    {
        parent::setUp();

        // Tạo role Staff
        Role::create(['name' => 'Staff']);
        $this->staff = User::factory()->create([
            'name' => 'Lê Nhân Viên',
            'email' => 'staff@example.com',
        ]);
        $this->staff->assignRole('Staff');

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Dưỡng Trắng Hè 2026',
            'product_name' => 'Serum Vitamin C Trắng Da',
            'budget' => 25000000,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'video_deadline_days' => 7,
            'key_messages' => 'Sáng da sau 14 ngày, không kích ứng da nhạy cảm',
            'hashtags' => '#SerumTrangDa #ReviewBeauty #BookingKOL',
            'dos_and_donts' => 'Nên test thử trên mu bàn tay trước. Cấm so sánh với thương hiệu khác.',
            'discount_code' => 'SERUM20K',
            'affiliate_link' => 'https://tiktok.com/@brand/showcase',
            'status' => 'active',
            'created_by' => $this->staff->id,
        ]);

        $this->creator = Creator::create([
            'name' => 'Phạm Khánh Vy',
            'phone' => '0988776655',
            'email' => 'khanhvy@gmail.com',
            'niche' => 'beauty',
            'tier' => 'micro',
        ]);

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'assigned_to' => $this->staff->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 2000000,
        ]);
    }

    /**
     * Test preview mẫu tin nhắn thông minh theo ngữ cảnh
     */
    public function test_quick_followup_preview_endpoint_returns_contextual_templates(): void
    {
        $response = $this->actingAs($this->staff)
            ->getJson(route('outreach.quick-followup.preview', $this->campaignCreator->id));

        $response->assertOk();
        $response->assertJsonStructure([
            'creator' => ['id', 'name', 'phone', 'zalo_link'],
            'campaign' => ['id', 'name', 'product_name'],
            'pipeline' => ['id', 'status', 'status_label', 'portal_link'],
            'templates' => [
                '*' => ['type', 'title', 'badge', 'is_recommended', 'content'],
            ],
        ]);

        $data = $response->json();
        $this->assertEquals('Phạm Khánh Vy', $data['creator']['name']);
        $this->assertEquals('https://zalo.me/0988776655', $data['creator']['zalo_link']);

        // Vì KOC đang ở trạng thái NEW nên brief_outreach được khuyên dùng
        $briefTpl = collect($data['templates'])->firstWhere('type', 'brief_outreach');
        $this->assertNotNull($briefTpl);
        $this->assertTrue($briefTpl['is_recommended']);
        $this->assertStringContainsString('Serum Vitamin C Trắng Da', $briefTpl['content']);
        $this->assertStringContainsString('#SerumTrangDa', $briefTpl['content']);
    }

    /**
     * Test ghi log tin nhắn nhắc việc Zalo và tự động chuyển new -> contacted
     */
    public function test_quick_followup_log_saves_message_and_advances_new_status_to_contacted(): void
    {
        $content = 'Em chào chị Khánh Vy, em gửi chị link brief chiến dịch nhé!';

        $response = $this->actingAs($this->staff)
            ->postJson(route('outreach.quick-followup.log', $this->campaignCreator->id), [
                'content' => $content,
            ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        // Kiểm tra bản ghi outreach message
        $this->assertDatabaseHas('outreach_messages', [
            'campaign_creator_id' => $this->campaignCreator->id,
            'channel' => 'zalo_personal',
            'sent_content' => $content,
            'status' => 'sent',
        ]);

        // Trạng thái pipeline phải tự động chuyển sang contacted
        $this->campaignCreator->refresh();
        $this->assertEquals(PipelineStatusEnum::CONTACTED, $this->campaignCreator->status);
        $this->assertNotNull($this->campaignCreator->contacted_at);
    }

    /**
     * Test khi KOC ở sample_received, mẫu đôn đốc deadline được kích hoạt
     */
    public function test_quick_followup_generates_deadline_reminder_for_sample_received(): void
    {
        // Giả lập KOC nhận mẫu cách đây 5 ngày (deadline 7 ngày => còn 2 ngày => warning)
        $this->campaignCreator->update([
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => Carbon::now()->subDays(5),
        ]);

        $response = $this->actingAs($this->staff)
            ->getJson(route('outreach.quick-followup.preview', $this->campaignCreator->id));

        $response->assertOk();
        $data = $response->json();

        $deadlineTpl = collect($data['templates'])->firstWhere('type', 'remind_deadline');
        $this->assertNotNull($deadlineTpl);
        $this->assertTrue($deadlineTpl['is_recommended']);
        $this->assertStringContainsString('chỉ còn', $deadlineTpl['content']);
    }

    /**
     * Test khi mẫu tin nhắn nhắc nhở Zalo được cấu hình tùy chỉnh tập trung trong Database
     */
    public function test_quick_followup_uses_customized_database_template_when_configured(): void
    {
        // Tạo mẫu tùy biến trong database
        \Modules\Outreach\Models\OutreachTemplate::create([
            'name' => 'Nhắc Zalo: Đôn đốc nộp video VIP',
            'type' => 'remind_deadline',
            'channel' => 'zalo_personal',
            'content_template' => 'Dạ chị {creator_name} ơi, nhãn {campaign_name} báo video {product_name} của chị {deadline_text} rồi ạ! Nhớ bấm link {portal_link} chị nha.',
            'is_active' => true,
        ]);

        $this->campaignCreator->update([
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => Carbon::now()->subDays(5),
        ]);

        $response = $this->actingAs($this->staff)
            ->getJson(route('outreach.quick-followup.preview', $this->campaignCreator->id));

        $response->assertOk();
        $data = $response->json();

        $deadlineTpl = collect($data['templates'])->firstWhere('type', 'remind_deadline');
        $this->assertNotNull($deadlineTpl);
        $this->assertStringContainsString('Dạ chị Phạm Khánh Vy ơi', $deadlineTpl['content']);
        $this->assertStringContainsString('Serum Vitamin C Trắng Da', $deadlineTpl['content']);
        $this->assertStringContainsString('chỉ còn', $deadlineTpl['content']);
        $this->assertStringContainsString('/portal/', $deadlineTpl['content']);
    }

    /**
     * Test màn hình Bàn Làm Việc Cá Nhân (My Workspace)
     */
    public function test_workspace_index_renders_successfully_with_buckets(): void
    {
        $response = $this->actingAs($this->staff)->get(route('workspace.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Campaign/Workspace')
            ->has('stats')
            ->has('buckets.leads')
            ->has('buckets.samples')
            ->has('buckets.deadlines')
            ->has('buckets.reviews')
            ->where('stats.leads_count', 1)
        );
    }

    /**
     * Test khi Admin đăng nhập và chưa được gán KOC nào, hệ thống mặc định xem "all" để không bị trống dữ liệu 0
     */
    public function test_workspace_admin_defaults_to_all_when_no_personal_assigned_kocs(): void
    {
        Role::create(['name' => 'Admin']);
        $admin = User::factory()->create([
            'name' => 'Quản Trị Viên',
            'email' => 'admin_test@example.com',
        ]);
        $admin->assignRole('Admin');

        // Tạo 1 KOC chưa gán ai
        $unassignedCreator = Creator::create([
            'name' => 'Linh Thỏ Beauty',
            'phone' => '0911223344',
            'niche' => 'beauty',
            'tier' => 'nano',
        ]);
        $unassignedKoc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $unassignedCreator->id,
            'assigned_to' => null,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 1500000,
        ]);

        $response = $this->actingAs($admin)->get(route('workspace.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Campaign/Workspace')
            ->where('is_leader_or_admin', true)
            ->where('filters.staff_id', 'all')
            ->where('stats.unassigned_count', 1)
            ->where('stats.my_kocs_count', 0)
            ->has('buckets.leads', 2) // $this->campaignCreator + $unassignedKoc
        );
    }

    /**
     * Test lọc KOC chưa phân công và nút 1-chạm Nhận KOC
     */
    public function test_workspace_handles_unassigned_filter_and_claim_koc(): void
    {
        // Tạo KOC chưa gán ai
        $unassignedCreator = Creator::create([
            'name' => 'Trần KOC Mới',
            'phone' => '0933445566',
            'niche' => 'fashion',
            'tier' => 'nano',
        ]);
        $unassignedKoc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $unassignedCreator->id,
            'assigned_to' => null,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 1000000,
        ]);

        // 1. Lọc KOC chưa phân công
        $filterResponse = $this->actingAs($this->staff)->get(route('workspace.index', [
            'staff_id' => 'unassigned',
        ]));
        $filterResponse->assertOk();
        $filterResponse->assertInertia(fn ($page) => $page
            ->component('Campaign/Workspace')
            ->where('filters.staff_id', 'unassigned')
            ->has('buckets.leads', 1)
            ->where('buckets.leads.0.id', $unassignedKoc->id)
        );

        // 2. Thao tác nhận KOC
        $assignResponse = $this->actingAs($this->staff)
            ->patch(route('pipeline.assign', $unassignedKoc->id), [
                'assigned_to' => $this->staff->id,
            ]);
        $assignResponse->assertRedirect();

        $unassignedKoc->refresh();
        $this->assertEquals($this->staff->id, $unassignedKoc->assigned_to);
    }

    /**
     * Test trường Brief và file tải lên hiển thị trên Cổng Portal KOC
     */
    public function test_portal_receives_campaign_brief_fields(): void
    {
        $this->campaign->update([
            'content_guidelines_file' => 'campaigns/guidelines/brief_sample.pdf',
            'sample_requirement_file' => 'campaigns/sample_requirements/sample_list.docx',
        ]);

        $token = $this->campaignCreator->generatePortalToken();

        $response = $this->get(route('portal.show', $token));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Portal/Index')
            ->where('campaign.key_messages', 'Sáng da sau 14 ngày, không kích ứng da nhạy cảm')
            ->where('campaign.hashtags', '#SerumTrangDa #ReviewBeauty #BookingKOL')
            ->where('campaign.discount_code', 'SERUM20K')
            ->where('campaign.affiliate_link', 'https://tiktok.com/@brand/showcase')
            ->where('campaign.content_guidelines_file_name', 'brief_sample.pdf')
            ->where('campaign.sample_requirement_file_name', 'sample_list.docx')
            ->has('campaign.files', 2)
            ->where('campaign.files.0.type', 'guideline')
            ->where('campaign.files.1.type', 'sample')
        );
    }
}

