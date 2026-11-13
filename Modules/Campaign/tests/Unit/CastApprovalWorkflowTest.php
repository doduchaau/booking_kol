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

class CastApprovalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected PipelineService $pipelineService;
    protected Campaign $campaign;
    protected Creator $creatorWithAddress;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pipelineService = new PipelineService();

        $this->campaign = Campaign::create([
            'name' => 'Chiến dịch Test Chi Phí Cast 2026',
            'product_name' => 'Sản phẩm Test',
            'budget' => 50000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
        ]);

        $this->creatorWithAddress = Creator::create([
            'name' => 'KOC Nguyễn Văn A',
            'phone' => '0912345678',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 100,
            'shipping_address' => '123 Đường Nguyễn Trãi, Quận 1, TP.HCM',
        ]);
    }

    /**
     * 1. KOC KHÔNG có chi phí cast (booking_fee = 0): Chuyển thẳng sang agreed không cần chờ duyệt
     */
    public function test_free_koc_bypasses_approval_directly_to_agreed(): void
    {
        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creatorWithAddress->id,
            'status' => PipelineStatusEnum::CONTACTED,
            'booking_fee' => 0.00,
        ]);

        $updated = $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::AGREED);

        $this->assertEquals(PipelineStatusEnum::AGREED, $updated->status);
        $this->assertTrue($updated->hasApprovedCost());
    }

    /**
     * 2. KOC CÓ phát sinh chi phí cast (booking_fee > 0): Tự động chuyển thành waiting_approval
     */
    public function test_paid_koc_automatically_routes_to_waiting_approval(): void
    {
        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creatorWithAddress->id,
            'status' => PipelineStatusEnum::CONTACTED,
            'booking_fee' => 2000000.00,
            'approved_cost_at' => null,
        ]);

        // Cố tình chuyển sang agreed khi chưa duyệt
        $updated = $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::AGREED);

        $this->assertEquals(PipelineStatusEnum::WAITING_APPROVAL, $updated->status);
        $this->assertFalse($updated->hasApprovedCost());
        $this->assertTrue($updated->isWaitingApproval());
    }

    /**
     * 3. KOC có chi phí cast chưa duyệt: CẤM chuyển sang các bước tiếp theo (sample_sent, address_confirmed, posted)
     */
    public function test_unapproved_paid_koc_cannot_advance_to_shipping_or_beyond(): void
    {
        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creatorWithAddress->id,
            'status' => PipelineStatusEnum::WAITING_APPROVAL,
            'booking_fee' => 1500000.00,
            'approved_cost_at' => null,
        ]);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage("có phát sinh chi phí cast");

        $this->pipelineService->updateCreatorStatus($cc, PipelineStatusEnum::SAMPLE_SENT);
    }

    /**
     * 4. Nhân viên bấm 'Xác nhận Lãnh đạo đã duyệt': Mở khóa sang agreed thành công
     */
    public function test_confirm_cast_approved_unlocks_agreed(): void
    {
        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creatorWithAddress->id,
            'status' => PipelineStatusEnum::WAITING_APPROVAL,
            'booking_fee' => 1500000.00,
            'approved_cost_at' => null,
        ]);

        $updated = $this->pipelineService->confirmCastApproved($cc, [
            'approver_name' => 'Anh Hải - Giám Đốc',
            'approval_notes' => 'Đã duyệt mức 1.5M, yêu cầu gắn link bio 7 ngày',
        ]);

        $this->assertEquals(PipelineStatusEnum::AGREED, $updated->status);
        $this->assertNotNull($updated->approved_cost_at);
        $this->assertEquals('Anh Hải - Giám Đốc', $updated->approver_name);
        $this->assertEquals('Đã duyệt mức 1.5M, yêu cầu gắn link bio 7 ngày', $updated->approval_notes);
        $this->assertTrue($updated->hasApprovedCost());

        // Sau khi đã duyệt, KOC có thể chuyển tiếp sang các bước tiếp theo bình thường
        $sentItem = $this->pipelineService->updateCreatorStatus($updated, PipelineStatusEnum::SAMPLE_SENT);
        $this->assertEquals(PipelineStatusEnum::SAMPLE_SENT, $sentItem->status);
    }

    /**
     * 5. Khi Lãnh đạo không đồng ý: Đưa về contacted để đàm phán lại
     */
    public function test_reopen_deal_returns_to_contacted(): void
    {
        $cc = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creatorWithAddress->id,
            'status' => PipelineStatusEnum::WAITING_APPROVAL,
            'booking_fee' => 3000000.00,
        ]);

        $reopened = $this->pipelineService->reopenDeal($cc, 'Sếp yêu cầu thương lượng lại dưới 2 triệu');

        $this->assertEquals(PipelineStatusEnum::CONTACTED, $reopened->status);
        $this->assertNull($reopened->approved_cost_at);
        $this->assertEquals('Sếp yêu cầu thương lượng lại dưới 2 triệu', $reopened->notes);
    }
}

