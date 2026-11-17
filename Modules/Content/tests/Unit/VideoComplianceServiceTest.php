<?php

namespace Modules\Content\Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Content\Services\VideoComplianceService;
use Modules\Content\Services\VideoMetadataExtractorService;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class VideoComplianceServiceTest extends TestCase
{
    use RefreshDatabase;

    protected VideoComplianceService $complianceService;
    protected Campaign $campaign;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->complianceService = app(VideoComplianceService::class);

        $this->campaign = Campaign::create([
            'name' => 'Chiến Dịch Hè Rạng Rỡ 2026',
            'product_name' => 'Kem Chống Nắng Glow',
            'budget' => 50000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'hashtags' => '#KemChongNangGlow, #GlowSummer2026',
            'discount_code' => 'GLOW20K',
        ]);

        $this->creator = Creator::create([
            'name' => 'Nguyễn Thu Trang',
            'phone' => '0987654321',
            'niche' => 'beauty',
            'tier' => CreatorTierEnum::MICRO,
            'trust_score' => 100,
            'shipping_address' => 'Số 123 Cầu Giấy, Hà Nội',
        ]);

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_sent_at' => now()->subDays(5),
            'sample_received_at' => now()->subDays(2),
        ]);
    }

    /**
     * Test: Video có đủ hashtag và mã giảm giá -> Passed 100 điểm
     */
    public function test_evaluating_video_with_full_compliance_returns_passed(): void
    {
        $metadata = [
            'is_available' => true,
            'caption' => 'Review chân thật kem chống nắng đỉnh chóp #kemchongnangglow #glowsummer2026 mn nhập mã GLOW20K giảm 20k nha',
            'hashtags' => ['#kemchongnangglow', '#glowsummer2026'],
            'author_handle' => 'thutrang_beauty',
            'error_message' => null,
        ];

        $result = $this->complianceService->evaluate(
            platform: 'tiktok',
            url: 'https://www.tiktok.com/@thutrang_beauty/video/7300000000000001',
            metadata: $metadata,
            campaign: $this->campaign,
            creator: $this->creator
        );

        $this->assertEquals('passed', $result['status']);
        $this->assertEquals(100, $result['score']);
        $this->assertEmpty($result['issues']);
        $this->assertNull($result['revision_message']);
    }

    /**
     * Test: Video thiếu hashtag -> Warning, có danh sách lỗi và mẫu tin nhắn Zalo
     */
    public function test_evaluating_video_missing_hashtags_returns_warning(): void
    {
        $metadata = [
            'is_available' => true,
            'caption' => 'Review kem chống nắng siêu mê nè #kemchongnangglow nhập mã GLOW20K nhé',
            'hashtags' => ['#kemchongnangglow'], // Thiếu #glowsummer2026
            'author_handle' => 'thutrang_beauty',
            'error_message' => null,
        ];

        $result = $this->complianceService->evaluate(
            platform: 'tiktok',
            url: 'https://www.tiktok.com/@thutrang_beauty/video/7300000000000002',
            metadata: $metadata,
            campaign: $this->campaign,
            creator: $this->creator
        );

        $this->assertEquals('warning', $result['status']);
        $this->assertLessThan(100, $result['score']);
        $this->assertNotEmpty($result['issues']);
        $this->assertNotNull($result['revision_message']);
        $this->assertStringContainsString('glowsummer2026', $result['revision_message']);
    }

    /**
     * Test: Video không khả dụng (bị xóa hoặc private) -> Failed
     */
    public function test_evaluating_unavailable_video_returns_failed(): void
    {
        $metadata = [
            'is_available' => false,
            'caption' => '',
            'hashtags' => [],
            'author_handle' => null,
            'error_message' => 'Video is private',
        ];

        $result = $this->complianceService->evaluate(
            platform: 'tiktok',
            url: 'https://www.tiktok.com/@test/video/7300000000000003',
            metadata: $metadata,
            campaign: $this->campaign,
            creator: $this->creator
        );

        $this->assertEquals('failed', $result['status']);
        $this->assertLessThanOrEqual(40, $result['score']);
    }

    /**
     * Test: evaluatePost cập nhật bản ghi ContentPost trong cơ sở dữ liệu
     */
    public function test_evaluate_post_updates_content_post_model(): void
    {
        $post = ContentPost::create([
            'campaign_creator_id' => $this->campaignCreator->id,
            'platform' => 'tiktok',
            'post_url' => 'https://www.tiktok.com/@thutrang_beauty/video/7300000000000004',
            'video_title' => 'Video review #kemchongnangglow #glowsummer2026 mã GLOW20K',
            'status' => 'pending_approval',
        ]);

        $evaluated = $this->complianceService->evaluatePost($post);

        $this->assertEquals('passed', $evaluated['status']);
        $this->assertEquals(100, $evaluated['post']->compliance_score);
        $this->assertEquals('passed', $evaluated['post']->compliance_status);
        $this->assertNotNull($evaluated['post']->compliance_checked_at);
        $this->assertIsArray($evaluated['post']->compliance_checklist);
    }

    /**
     * Test: Kiểm tra yêu cầu Tag tài khoản thương hiệu (brand_tag)
     */
    public function test_evaluating_video_with_brand_tag_requirement(): void
    {
        $this->campaign->update(['brand_tag' => '@glow_beauty_vn']);

        // Case 1: Caption có tag @glow_beauty_vn
        $metadataSuccess = [
            'is_available' => true,
            'caption' => 'Video review đỉnh chóp cùng @glow_beauty_vn #kemchongnangglow #glowsummer2026 nhập mã GLOW20K',
            'hashtags' => ['#kemchongnangglow', '#glowsummer2026'],
            'mentions' => ['glow_beauty_vn'],
            'author_handle' => 'thutrang_beauty',
            'error_message' => null,
        ];

        $resultSuccess = $this->complianceService->evaluate(
            platform: 'tiktok',
            url: 'https://www.tiktok.com/@thutrang_beauty/video/7300000000000005',
            metadata: $metadataSuccess,
            campaign: $this->campaign,
            creator: $this->creator
        );

        $this->assertEquals('passed', $resultSuccess['status']);
        $this->assertEquals(100, $resultSuccess['score']);

        // Case 2: Caption thiếu tag thương hiệu -> Warning và có thông báo lỗi
        $metadataMissing = [
            'is_available' => true,
            'caption' => 'Video review đỉnh chóp #kemchongnangglow #glowsummer2026 nhập mã GLOW20K',
            'hashtags' => ['#kemchongnangglow', '#glowsummer2026'],
            'mentions' => [],
            'author_handle' => 'thutrang_beauty',
            'error_message' => null,
        ];

        $resultMissing = $this->complianceService->evaluate(
            platform: 'tiktok',
            url: 'https://www.tiktok.com/@thutrang_beauty/video/7300000000000006',
            metadata: $metadataMissing,
            campaign: $this->campaign,
            creator: $this->creator
        );

        $this->assertEquals('warning', $resultMissing['status']);
        $this->assertContains('Chưa tag tài khoản thương hiệu: @glow_beauty_vn', $resultMissing['issues']);
    }

    /**
     * Test: Kiểm tra kết hợp hashtag riêng của sản phẩm mẫu KOC được phân bổ
     */
    public function test_evaluating_video_with_product_specific_hashtags(): void
    {
        $product = \Modules\Campaign\Models\CampaignProduct::create([
            'campaign_id' => $this->campaign->id,
            'product_name' => 'Kem Chống Nắng Tone Up',
            'retail_price' => 250000,
            'hashtags' => '#ToneUpGlow',
        ]);

        \Modules\Campaign\Models\CampaignCreatorProduct::create([
            'campaign_creator_id' => $this->campaignCreator->id,
            'campaign_product_id' => $product->id,
            'quantity_assigned' => 1,
            'quantity_sent' => 1,
            'sample_status' => \Modules\Campaign\Enums\SampleStatusEnum::RECEIVED,
        ]);

        $this->campaignCreator->load('creatorProducts.campaignProduct');

        // Video chỉ có hashtag chiến dịch, thiếu hashtag sản phẩm #toneupglow -> warning
        $metadata = [
            'is_available' => true,
            'caption' => 'Review kem chống nắng #kemchongnangglow #glowsummer2026 mã GLOW20K',
            'hashtags' => ['#kemchongnangglow', '#glowsummer2026'],
            'author_handle' => 'thutrang_beauty',
            'error_message' => null,
        ];

        $result = $this->complianceService->evaluate(
            platform: 'tiktok',
            url: 'https://www.tiktok.com/@thutrang_beauty/video/7300000000000007',
            metadata: $metadata,
            campaign: $this->campaign,
            creator: $this->creator,
            campaignCreator: $this->campaignCreator
        );

        $this->assertEquals('warning', $result['status']);
        $this->assertContains('Thiếu hashtag: #toneupglow', $result['issues']);
    }
}

