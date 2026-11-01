<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CampaignMatrixEndpointsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Campaign $campaign;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->campaign = Campaign::create([
            'name' => 'Chiến Dịch Test Matrix',
            'product_name' => 'Kem Dưỡng Da Ban Đêm',
            'budget' => 50000000,
            'target_creators_count' => 20,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);
    }

    public function test_bulk_status_update_endpoint(): void
    {
        $creator1 = Creator::create([
            'name' => 'Creator One',
            'phone' => '0988111222',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        $creator2 = Creator::create([
            'name' => 'Creator Two',
            'phone' => '0988111333',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        $cc1 = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator1->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $cc2 = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator2->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('campaigns.creators.bulk-status', $this->campaign->id), [
                'ids' => [$cc1->id, $cc2->id],
                'status' => PipelineStatusEnum::CONTACTED->value,
                'notes' => 'Đã gửi tin nhắn Zalo',
            ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertEquals(PipelineStatusEnum::CONTACTED, $cc1->fresh()->status);
        $this->assertEquals(PipelineStatusEnum::CONTACTED, $cc2->fresh()->status);
    }

    public function test_bulk_assign_staff_endpoint(): void
    {
        $staff = User::factory()->create();

        $creator = Creator::create([
            'name' => 'Creator Assign Test',
            'phone' => '0988111444',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 95,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $response = $this->actingAs($this->user)
            ->postJson(route('campaigns.creators.bulk-assign', $this->campaign->id), [
                'ids' => [$cc->id],
                'assigned_to' => $staff->id,
            ]);

        $response->assertOk();
        $this->assertEquals($staff->id, $cc->fresh()->assigned_to);
    }

    public function test_quick_update_endpoint(): void
    {
        $creator = Creator::create([
            'name' => 'Creator Quick Update',
            'phone' => '0988111555',
            'niche' => 'vlog',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 0,
        ]);

        $response = $this->actingAs($this->user)
            ->patchJson(route('campaigns.creators.quick-update', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'booking_fee' => 3000000,
                'notes' => 'Chốt giá 3M',
                'status' => PipelineStatusEnum::AGREED->value,
            ]);

        $response->assertOk();
        $this->assertEquals(3000000, (float) $cc->fresh()->booking_fee);
        $this->assertEquals(PipelineStatusEnum::AGREED, $cc->fresh()->status);
    }

    public function test_remove_creator_from_campaign(): void
    {
        $creator = Creator::create([
            'name' => 'Creator To Remove',
            'phone' => '0988111666',
            'niche' => 'lifestyle',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('campaigns.creators.remove', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]));

        $response->assertRedirect();
        $this->assertSoftDeleted('campaign_creators', ['id' => $cc->id]);
    }

    public function test_campaign_show_page_renders_successfully(): void
    {
        $creator = Creator::create([
            'name' => 'Creator Show Test',
            'phone' => '0988111777',
            'niche' => 'food',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 90,
        ]);

        CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => now()->subDays(2),
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('campaigns.show', $this->campaign->id));

        $response->assertOk();
    }

    public function test_pipeline_index_page_redirects_to_campaign_show(): void
    {
        $creator = Creator::create([
            'name' => 'Creator Pipeline Test',
            'phone' => '0988111888',
            'niche' => 'tech',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => now()->subDays(2),
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('pipeline.index', $this->campaign->id));

        $response->assertRedirect(route('campaigns.show', $this->campaign->id));
    }

    public function test_pipeline_general_redirects_to_active_campaign(): void
    {
        $response = $this->actingAs($this->user)
            ->get('/pipeline');

        $response->assertRedirect(route('campaigns.show', $this->campaign->id));
    }

    public function test_pipeline_general_redirects_with_specific_campaign_id(): void
    {
        $secondCampaign = Campaign::create([
            'name' => 'Chiến Dịch Số 2',
            'product_name' => 'Son Dưỡng',
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->get('/pipeline?campaign_id=' . $secondCampaign->id);

        $response->assertRedirect(route('campaigns.show', $secondCampaign->id));
    }

    public function test_pipeline_general_redirects_to_campaigns_index_when_no_campaigns(): void
    {
        Campaign::query()->forceDelete();

        $response = $this->actingAs($this->user)
            ->get('/pipeline');

        $response->assertRedirect(route('campaigns.index'));
        $response->assertSessionHas('warning');
    }

    public function test_campaign_can_have_custom_video_deadline_days(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('campaigns.store'), [
                'name' => 'Chiến Dịch Hạn 12 Ngày',
                'product_name' => 'Kem Chống Nắng',
                'budget' => 30000000,
                'target_creators_count' => 15,
                'video_deadline_days' => 12,
                'start_date' => now()->toDateString(),
                'end_date' => now()->addMonth()->toDateString(),
            ]);

        $campaign = Campaign::where('name', 'Chiến Dịch Hạn 12 Ngày')->firstOrFail();
        $response->assertRedirect(route('campaigns.show', $campaign->id));
        $this->assertEquals(12, $campaign->video_deadline_days);

        // Test update
        $updateResponse = $this->actingAs($this->user)
            ->put(route('campaigns.update', $campaign->id), [
                'name' => 'Chiến Dịch Hạn 15 Ngày',
                'product_name' => 'Kem Chống Nắng Cải Tiến',
                'budget' => 35000000,
                'target_creators_count' => 15,
                'video_deadline_days' => 15,
                'status' => CampaignStatusEnum::ACTIVE->value,
                'start_date' => now()->toDateString(),
                'end_date' => now()->addMonth()->toDateString(),
            ]);

        $updateResponse->assertRedirect(route('campaigns.show', $campaign->id));
        $this->assertEquals(15, $campaign->fresh()->video_deadline_days);
    }

    public function test_cannot_confirm_sample_sent_when_creator_has_no_shipping_address(): void
    {
        $creator = Creator::create([
            'name' => 'Creator No Address',
            'phone' => '0988222331',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => null, // Chưa có địa chỉ
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::AGREED,
        ]);

        $res = $this->actingAs($this->user)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'notes' => 'Không điền địa chỉ',
                'shipped_at' => now()->toDateString(),
            ]);

        $res->assertSessionHasErrors(['error']);
        $this->assertEquals(PipelineStatusEnum::AGREED, $cc->fresh()->status);
        $this->assertNull($cc->fresh()->sample_sent_at);
    }

    public function test_can_confirm_sample_sent_when_creator_already_has_shipping_address(): void
    {
        $creator = Creator::create([
            'name' => 'Creator With Address',
            'phone' => '0988222332',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => '123 Phố Huế, Hai Bà Trưng, Hà Nội',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
        ]);

        $res = $this->actingAs($this->user)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'notes' => 'Gói quà trải nghiệm đợt 1',
                'shipped_at' => now()->toDateString(),
            ]);

        $res->assertRedirect();
        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $cc->fresh()->status);
        $this->assertNotNull($cc->fresh()->sample_sent_at);
        $this->assertEquals('Gói quà trải nghiệm đợt 1', $cc->fresh()->notes);
    }

    public function test_can_confirm_sample_sent_with_quick_address_input(): void
    {
        $creator = Creator::create([
            'name' => 'Creator Quick Address',
            'phone' => '0988222333',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => null, // Ban đầu chưa có địa chỉ
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::AGREED,
        ]);

        $res = $this->actingAs($this->user)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'shipping_address' => '789 Đường Nguyễn Trãi',
                'city_province' => 'Hà Nội',
                'district' => 'Thanh Xuân',
                'ward' => 'Khương Trung',
                'notes' => 'Gửi mẫu sau khi nhập nhanh địa chỉ',
                'shipped_at' => now()->toDateString(),
            ]);

        $res->assertRedirect();
        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $cc->fresh()->status);
        $this->assertNotNull($cc->fresh()->sample_sent_at);
        $this->assertEquals('789 Đường Nguyễn Trãi', $creator->fresh()->shipping_address);
        $this->assertEquals('Hà Nội', $creator->fresh()->city_province);
    }

    public function test_cannot_add_video_before_sample_sent(): void
    {
        $creator = Creator::create([
            'name' => 'Creator No Sample Sent',
            'phone' => '0988444333',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => '123 Đường Test, Quận 1',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
        ]);

        $res = $this->actingAs($this->user)
            ->post(route('campaigns.creators.videos.store', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'platform' => 'tiktok',
                'post_url' => 'https://www.tiktok.com/@creator/video/111111111',
                'video_title' => 'Video Review Part 1',
                'posted_at' => now()->toDateString(),
            ]);

        $res->assertSessionHasErrors(['error']);
        $this->assertEquals(PipelineStatusEnum::ADDRESS_CONFIRMED, $cc->fresh()->status);
        $this->assertCount(0, $cc->fresh()->contentPosts);
    }

    public function test_creator_can_have_multiple_videos_in_campaign(): void
    {
        $creator = Creator::create([
            'name' => 'Creator Multiple Videos',
            'phone' => '0988444555',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => '123 Đường Test, Quận 1',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_sent_at' => now()->subDays(3),
            'sample_received_at' => now()->subDay(),
        ]);

        // Video 1
        $res1 = $this->actingAs($this->user)
            ->post(route('campaigns.creators.videos.store', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'platform' => 'tiktok',
                'post_url' => 'https://www.tiktok.com/@creator/video/111111111',
                'video_title' => 'Video Review Part 1',
                'posted_at' => now()->toDateString(),
            ]);

        $res1->assertRedirect();
        $this->assertDatabaseHas('content_posts', [
            'campaign_creator_id' => $cc->id,
            'post_url' => 'https://www.tiktok.com/@creator/video/111111111',
            'platform' => 'tiktok',
        ]);
        $this->assertEquals(PipelineStatusEnum::POSTED, $cc->fresh()->status);

        // Video 2
        $res2 = $this->actingAs($this->user)
            ->post(route('campaigns.creators.videos.store', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'platform' => 'tiktok',
                'post_url' => 'https://www.tiktok.com/@creator/video/222222222',
                'video_title' => 'Video Review Part 2',
                'posted_at' => now()->toDateString(),
            ]);

        $res2->assertRedirect();
        $this->assertDatabaseHas('content_posts', [
            'campaign_creator_id' => $cc->id,
            'post_url' => 'https://www.tiktok.com/@creator/video/222222222',
        ]);

        // Xác nhận 1 KOC có 2 video trong chiến dịch
        $this->assertCount(2, $cc->fresh()->contentPosts);
    }

    public function test_campaign_stats_counts_multiple_videos_accurately(): void
    {
        $creator1 = Creator::create([
            'name' => 'Creator One Video',
            'phone' => '0988666777',
            'niche' => 'vlog',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        $creator2 = Creator::create([
            'name' => 'Creator Two Videos',
            'phone' => '0988777888',
            'niche' => 'vlog',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        $cc1 = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator1->id,
            'status' => PipelineStatusEnum::POSTED,
        ]);

        $cc2 = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator2->id,
            'status' => PipelineStatusEnum::POSTED,
        ]);

        // KOC 1 có 1 video
        $this->actingAs($this->user)->post(route('campaigns.creators.videos.store', [
            'id' => $this->campaign->id,
            'pivotId' => $cc1->id,
        ]), [
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@creator1/video/1',
        ]);

        // KOC 2 có 2 videos
        $this->actingAs($this->user)->post(route('campaigns.creators.videos.store', [
            'id' => $this->campaign->id,
            'pivotId' => $cc2->id,
        ]), [
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@creator2/video/1',
        ]);

        $this->actingAs($this->user)->post(route('campaigns.creators.videos.store', [
            'id' => $this->campaign->id,
            'pivotId' => $cc2->id,
        ]), [
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@creator2/video/2',
        ]);

        $campaignService = app(\Modules\Campaign\Services\CampaignService::class);
        $stats = $campaignService->calculateCampaignStats($this->campaign);

        // Tổng số video hoàn thành phải là 3 (1 từ KOC1 + 2 từ KOC2)
        $this->assertEquals(3, $stats['completed_videos_count']);
    }

    public function test_creator_can_receive_simplified_shipment_confirmation(): void
    {
        $creator = Creator::create([
            'name' => 'Creator Simplified Shipment',
            'phone' => '0988000111',
            'niche' => 'skincare',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => 'Số 123 Đường Cầu Giấy',
            'city_province' => 'Hà Nội',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
        ]);

        // Booking chỉ cần gửi notes và ngày gửi (không cần carrier, tracking_code, fee)
        $response = $this->actingAs($this->user)
            ->post(route('campaigns.creators.shipments.store', [
                'id' => $this->campaign->id,
                'pivotId' => $cc->id,
            ]), [
                'notes' => '1 Set kem dưỡng + serum quà tặng',
                'shipped_at' => now()->toDateString(),
            ]);

        $response->assertRedirect();
        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $cc->fresh()->status);
        $this->assertEquals('1 Set kem dưỡng + serum quà tặng', $cc->fresh()->notes);
    }

    public function test_campaign_can_upload_and_manage_attached_files(): void
    {
        Storage::fake('public');

        $guidelineFile = UploadedFile::fake()->create('briefing.pdf', 500, 'application/pdf');
        $sampleFile = UploadedFile::fake()->create('sample_list.xlsx', 300, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Tạo chiến dịch với file đính kèm
        $resStore = $this->actingAs($this->user)->post(route('campaigns.store'), [
            'name' => 'Chiến Dịch Có File Đính Kèm',
            'product_name' => 'Serum Vitamin C',
            'budget' => 30000000,
            'target_creators_count' => 15,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
            'content_guidelines' => 'Yêu cầu kịch bản chuẩn',
            'sample_requirement' => 'Gửi mỗi KOC 2 chai',
            'content_guidelines_file' => $guidelineFile,
            'sample_requirement_file' => $sampleFile,
        ]);

        $resStore->assertRedirect();
        $createdCampaign = Campaign::where('name', 'Chiến Dịch Có File Đính Kèm')->firstOrFail();

        $this->assertNotNull($createdCampaign->content_guidelines_file);
        $this->assertNotNull($createdCampaign->sample_requirement_file);
        Storage::disk('public')->assertExists($createdCampaign->content_guidelines_file);
        Storage::disk('public')->assertExists($createdCampaign->sample_requirement_file);

        // Cập nhật chiến dịch xóa file guideline
        $resUpdate = $this->actingAs($this->user)->post(route('campaigns.update', $createdCampaign->id), [
            '_method' => 'PUT',
            'name' => 'Chiến Dịch Đã Cập Nhật File',
            'product_name' => 'Serum Vitamin C',
            'budget' => 30000000,
            'target_creators_count' => 15,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
            'remove_content_guidelines_file' => 1,
        ]);

        $resUpdate->assertRedirect();
        $fresh = $createdCampaign->fresh();
        $this->assertNull($fresh->content_guidelines_file);
        $this->assertNotNull($fresh->sample_requirement_file);
    }
}
