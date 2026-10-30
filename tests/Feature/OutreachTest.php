<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Models\Creator;
use Modules\Outreach\Models\GroupInvite;
use Modules\Outreach\Models\OptOut;
use Modules\Outreach\Models\OutreachMessage;
use Modules\Outreach\Models\OutreachTemplate;
use Modules\Outreach\Services\OutreachService;
use Tests\TestCase;

class OutreachTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Campaign $campaign;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Kem Chống Nắng Hè 2026',
            'product_name' => 'Kem Chống Nắng SPF50+',
            'budget' => 20000000,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => 'active',
            'created_by' => $this->user->id,
        ]);

        $this->creator = Creator::create([
            'name' => 'Nguyễn Thu Thảo',
            'phone' => '0912345678',
            'email' => 'thuthao@gmail.com',
            'niche' => 'beauty',
            'tier' => 'micro',
        ]);

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 3000000,
        ]);
    }

    public function test_outreach_index_screen_renders_successfully(): void
    {
        $response = $this->actingAs($this->user)->get(route('outreach.index'));

        $response->assertOk();
    }

    public function test_template_can_be_created_updated_and_deleted(): void
    {
        // 1. Tạo mẫu tin
        $createResponse = $this->actingAs($this->user)->post(route('outreach.templates.store'), [
            'name' => 'Mẫu Mời KOC Thử Nghiệm',
            'channel' => 'zalo_personal',
            'subject' => 'Chào bạn KOC',
            'content_template' => 'Chào {creator_name}, nhãn hàng gửi bạn {product_name}',
            'is_active' => true,
        ]);

        $createResponse->assertRedirect();
        $this->assertDatabaseHas('outreach_templates', [
            'name' => 'Mẫu Mời KOC Thử Nghiệm',
        ]);

        $template = OutreachTemplate::where('name', 'Mẫu Mời KOC Thử Nghiệm')->first();

        // 2. Cập nhật mẫu tin
        $updateResponse = $this->actingAs($this->user)->put(route('outreach.templates.update', $template->id), [
            'name' => 'Mẫu Mời KOC Mới Nhất',
            'channel' => 'zalo_personal',
            'subject' => 'Chào bạn KOC VIP',
            'content_template' => 'Chào {creator_name}, nhãn hàng mời bạn tham gia {campaign_name}',
            'is_active' => true,
        ]);

        $updateResponse->assertRedirect();
        $this->assertDatabaseHas('outreach_templates', [
            'id' => $template->id,
            'name' => 'Mẫu Mời KOC Mới Nhất',
        ]);

        // 3. Xóa mẫu tin
        $deleteResponse = $this->actingAs($this->user)->delete(route('outreach.templates.destroy', $template->id));
        $deleteResponse->assertRedirect();
        $this->assertDatabaseMissing('outreach_templates', [
            'id' => $template->id,
        ]);
    }

    public function test_outreach_service_renders_template_with_koc_variables(): void
    {
        $service = app(OutreachService::class);

        $templateText = 'Chào {creator_name}, mời bạn review {product_name} trong {campaign_name} với thù lao {rate}. Link xác nhận: {portal_link}';

        $rendered = $service->renderTemplate($templateText, $this->campaignCreator);

        $this->assertStringContainsString('Nguyễn Thu Thảo', $rendered);
        $this->assertStringContainsString('Kem Chống Nắng SPF50+', $rendered);
        $this->assertStringContainsString('Chiến dịch Kem Chống Nắng Hè 2026', $rendered);
        $this->assertStringContainsString('3.000.000 đ', $rendered);
        $this->assertStringContainsString('/portal/', $rendered);
    }

    public function test_outreach_service_generates_zalo_deep_link(): void
    {
        $service = app(OutreachService::class);

        $deepLink = $service->generateZaloDeepLink('0912345678');
        $this->assertEquals('https://zalo.me/0912345678', $deepLink);

        $deepLinkWithPrefix = $service->generateZaloDeepLink('+84 912 345 678');
        $this->assertEquals('https://zalo.me/0912345678', $deepLinkWithPrefix);
    }

    public function test_outreach_service_blocks_sending_to_opted_out_phone(): void
    {
        $service = app(OutreachService::class);

        // Thêm vào opt-out
        $service->addOptOut('0912345678', 'thuthao@gmail.com', 'KOC không muốn nhận tin');

        $this->assertTrue($service->isOptedOut('0912345678'));

        // Kiểm tra xem việc gửi tin có bị chặn bằng Exception hay không
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('từ chối nhận tin');

        $service->recordOutreachMessage(
            campaignCreator: $this->campaignCreator,
            channel: 'zalo_personal',
            content: 'Nội dung test',
            senderId: $this->user->id
        );
    }

    public function test_send_message_records_outreach_and_advances_pipeline_to_contacted(): void
    {
        $response = $this->actingAs($this->user)->post(route('outreach.send'), [
            'campaign_creator_id' => $this->campaignCreator->id,
            'channel' => 'zalo_personal',
            'content' => 'Chào Thảo, mình gửi link hợp tác: https://example.com/p/token',
        ]);

        $response->assertRedirect();

        // Kiểm tra đã lưu tin nhắn trong database
        $this->assertDatabaseHas('outreach_messages', [
            'campaign_creator_id' => $this->campaignCreator->id,
            'channel' => 'zalo_personal',
            'sender_id' => $this->user->id,
        ]);

        // Kiểm tra pipeline tự động chuyển sang contacted
        $this->assertEquals(PipelineStatusEnum::CONTACTED, $this->campaignCreator->fresh()->status);
        $this->assertNotNull($this->campaignCreator->fresh()->contacted_at);
    }

    public function test_opt_out_can_be_added_and_removed(): void
    {
        // 1. Thêm số từ chối qua controller
        $addResponse = $this->actingAs($this->user)->post(route('outreach.opt-outs.store'), [
            'phone' => '0988776655',
            'email' => 'spam@gmail.com',
            'reason' => 'Không muốn làm phiền',
        ]);

        $addResponse->assertRedirect();
        $this->assertDatabaseHas('opt_outs', [
            'phone' => '0988776655',
        ]);

        $optOut = OptOut::where('phone', '0988776655')->first();

        // 2. Gỡ bỏ
        $delResponse = $this->actingAs($this->user)->delete(route('outreach.opt-outs.destroy', $optOut->id));
        $delResponse->assertRedirect();
        $this->assertDatabaseMissing('opt_outs', [
            'id' => $optOut->id,
        ]);
    }

    public function test_group_invite_status_can_be_updated(): void
    {
        $invite = GroupInvite::create([
            'campaign_creator_id' => $this->campaignCreator->id,
            'group_name' => 'Nhóm Zalo Chiến Dịch Hè',
            'group_link' => 'https://zalo.me/g/abc123xyz',
            'status' => 'invited',
        ]);

        $response = $this->actingAs($this->user)->patch(route('outreach.group-invites.update', $invite->id), [
            'status' => 'joined',
            'notes' => 'KOC đã xác nhận vào nhóm trao đổi',
        ]);

        $response->assertRedirect();

        $this->assertEquals('joined', $invite->fresh()->status);
        $this->assertNotNull($invite->fresh()->verified_at);
        $this->assertEquals($this->user->id, $invite->fresh()->verified_by);
    }
}

