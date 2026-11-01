<?php

namespace Modules\Campaign\Tests\Unit;

use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\PipelineService;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class PipelineConstraintTest extends TestCase
{
    use RefreshDatabase;

    protected PipelineService $pipelineService;
    protected Campaign $campaign;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pipelineService = new PipelineService();

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Test 2026',
            'product_name' => 'Sản phẩm Test',
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
        ]);
    }

    /**
     * Ràng buộc 1: Không được chuyển sang sample_sent nếu Creator chưa có địa chỉ nhận hàng
     */
    public function test_cannot_transition_to_sample_sent_without_shipping_address(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Chưa Có Địa Chỉ',
            'phone' => '0912345678',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => null, // Không có địa chỉ
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage("chưa có địa chỉ nhận hàng trong hồ sơ");

        $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::SAMPLE_SENT);
    }

    /**
     * Chuyển sang sample_sent thành công khi Creator có địa chỉ đầy đủ
     */
    public function test_can_transition_to_sample_sent_with_shipping_address(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Đã Có Địa Chỉ',
            'phone' => '0912345679',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => '123 Đường ABC, Quận 1, TP.HCM',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
        ]);

        $updated = $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::SAMPLE_SENT);

        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $updated->status);
        $this->assertNotNull($updated->sample_sent_at);
    }

    /**
     * Ràng buộc: Không được chuyển sang sample_received nếu chưa gửi mẫu
     */
    public function test_cannot_transition_to_sample_received_without_sample_sent(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Chưa Gửi Mẫu',
            'phone' => '0912345688',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => '123 Đường Test, Quận 1',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
        ]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage("chưa gửi mẫu cho KOC");

        $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::SAMPLE_RECEIVED);
    }

    /**
     * Ràng buộc: Không được chuyển sang posted nếu chưa gửi mẫu
     */
    public function test_cannot_transition_to_posted_without_sample_sent(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Lên Video Sớm',
            'phone' => '0912345689',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => '123 Đường Test, Quận 1',
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::AGREED,
        ]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage("chưa gửi mẫu cho KOC");

        $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::POSTED);
    }

    /**
     * Ràng buộc: Không được chuyển sang posted nếu đã nhận mẫu nhưng chưa có link video
     */
    public function test_cannot_transition_to_posted_without_video_link(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Chưa Có Link Video',
            'phone' => '0912345690',
            'niche' => 'beauty',
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

        $this->expectException(Exception::class);
        $this->expectExceptionMessage("chưa có link video nghiệm thu");

        $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::POSTED);
    }

    /**
     * Chuyển sang posted thành công khi đã có bài đăng trong content_posts
     */
    public function test_can_transition_to_posted_when_has_content_post(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Đã Có Link Video',
            'phone' => '0912345691',
            'niche' => 'beauty',
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

        \Modules\Content\Models\ContentPost::create([
            'campaign_creator_id' => $cc->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@creator/video/999999999',
            'posted_at' => now(),
            'status' => 'approved',
        ]);

        $updated = $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::POSTED);

        $this->assertEquals(PipelineStatusEnum::POSTED, $updated->status);
        $this->assertNotNull($updated->posted_at);
    }

    /**
     * Ràng buộc 2: Chuyển sang no_show (Bom hàng) tự động trừ 30 điểm và đưa vào Blacklist nếu < 40 điểm
     */
    public function test_no_show_deducts_trust_score_and_blacklists_if_below_40(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Bom Hàng',
            'phone' => '0912345680',
            'niche' => 'fashion',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 50, // 50 - 30 = 20 (< 40)
            'blacklist_status' => false,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::SAMPLE_SENT,
        ]);

        $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::NO_SHOW);

        $creator->refresh();
        $this->assertEquals(20, $creator->trust_score);
        $this->assertTrue((bool) $creator->blacklist_status);
        $this->assertStringContainsString('Tự động đưa vào Blacklist do bom hàng', $creator->blacklist_reason);
    }

    /**
     * Cập nhật trạng thái hàng loạt bỏ qua các item vi phạm ràng buộc
     */
    public function test_bulk_update_status_handles_constraints(): void
    {
        $creator1 = Creator::create([
            'name' => 'KOC 1 Có Địa Chỉ',
            'phone' => '0912345681',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => 'Hà Nội',
        ]);

        $creator2 = Creator::create([
            'name' => 'KOC 2 Thiếu Địa Chỉ',
            'phone' => '0912345682',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
            'shipping_address' => null,
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

        $result = $this->pipelineService->bulkUpdateStatus(
            ids: [$cc1->id, $cc2->id],
            newStatus: PipelineStatusEnum::SAMPLE_SENT
        );

        $this->assertEquals(1, $result['updated']);
        $this->assertCount(1, $result['errors']);
        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $cc1->fresh()->status);
        $this->assertEquals(PipelineStatusEnum::NEW, $cc2->fresh()->status);
    }

    /**
     * Cập nhật nhanh thông tin dòng (Inline Edit)
     */
    public function test_quick_update_inline(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Test Inline',
            'phone' => '0912345683',
            'niche' => 'food',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 90,
        ]);

        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::NEW,
            'booking_fee' => 0,
        ]);

        $updated = $this->pipelineService->quickUpdate($cc, [
            'booking_fee' => 2500000,
            'notes' => 'Đã chốt giá hữu nghị',
            'status' => PipelineStatusEnum::AGREED,
        ]);

        $this->assertEquals(2500000, (float) $updated->booking_fee);
        $this->assertEquals('Đã chốt giá hữu nghị', $updated->notes);
        $this->assertEquals(PipelineStatusEnum::AGREED, $updated->status);
    }

    /**
     * Tính toán deadline đếm ngược video
     */
    public function test_calculate_deadline_returns_proper_countdown(): void
    {
        $creator = Creator::create([
            'name' => 'KOC Test Deadline',
            'phone' => '0912345684',
            'niche' => 'lifestyle',
            'tier' => CreatorTierEnum::NANO,
            'trust_score' => 100,
        ]);

        // Đã nhận mẫu cách đây 2 ngày -> Còn 5 ngày
        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => now()->subDays(2),
        ]);

        $info = $this->pipelineService->calculateDeadline($cc);
        $this->assertNotNull($info);
        $this->assertEquals('safe', $info['status']);
        $this->assertEquals(5, $info['days']);

        // Quá hạn: Nhận mẫu cách đây 10 ngày
        $ccOverdue = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $creator->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => now()->subDays(10),
        ]);

        $overdueInfo = $this->pipelineService->calculateDeadline($ccOverdue);
        $this->assertNotNull($overdueInfo);
        $this->assertEquals('overdue', $overdueInfo['status']);
        $this->assertEquals(3, $overdueInfo['days']);
    }
}
