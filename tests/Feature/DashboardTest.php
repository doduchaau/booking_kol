<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Content\Models\ContentPost;
use Modules\Creator\Models\Creator;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $response = $this->get('/dashboard');
        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_on_root_is_redirected_to_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/');
        $response->assertRedirect('/dashboard');
    }

    public function test_dashboard_renders_with_real_metrics_and_action_center(): void
    {
        $user = User::factory()->create();

        // Tạo 3 Creator
        $creator1 = Creator::create([
            'name' => 'Nguyễn Thu Trang',
            'phone' => '0912345678',
            'tier' => 'micro',
            'niche' => 'beauty',
            'shipping_address' => 'Số 10 Phố Huế, Hoàn Kiếm, Hà Nội',
        ]);

        $creator2 = Creator::create([
            'name' => 'Lê Minh Quân',
            'phone' => '0987654321',
            'tier' => 'macro',
            'niche' => 'tech',
            'shipping_address' => 'Số 50 Điện Biên Phủ, Quận 1, TP.HCM',
        ]);

        $creator3 = Creator::create([
            'name' => 'Trần Hoàng Yến',
            'phone' => '0909123456',
            'tier' => 'nano',
            'niche' => 'lifestyle',
        ]);

        // Tạo Chiến dịch Active
        $campaign = Campaign::create([
            'name' => 'Chiến Dịch Kem Dưỡng Ẩm Mùa Đông',
            'product_name' => 'Kem Dưỡng Ẩm Pro',
            'status' => CampaignStatusEnum::ACTIVE,
            'budget' => 30000000,
            'target_creators_count' => 10,
            'video_deadline_days' => 5,
            'start_date' => Carbon::now()->subDays(5)->toDateString(),
            'end_date' => Carbon::now()->addDays(25)->toDateString(),
            'created_by' => $user->id,
        ]);

        // Gán KOC 1: sample_received cách đây 7 ngày -> quá hạn deadline (5 ngày)
        $cc1 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator1->id,
            'status' => PipelineStatusEnum::SAMPLE_RECEIVED,
            'sample_received_at' => Carbon::now()->subDays(7),
            'booking_fee' => 2000000,
        ]);

        // Gán KOC 2: address_confirmed -> cần xuất kho gửi mẫu
        $cc2 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator2->id,
            'status' => PipelineStatusEnum::ADDRESS_CONFIRMED,
            'address_confirmed_at' => Carbon::now()->subHours(4),
            'booking_fee' => 5000000,
        ]);

        // Gán KOC 3: Đã lên video
        $cc3 = CampaignCreator::create([
            'campaign_id' => $campaign->id,
            'creator_id' => $creator3->id,
            'status' => PipelineStatusEnum::POSTED,
            'sample_received_at' => Carbon::now()->subDays(4),
            'posted_at' => Carbon::now()->subDays(1),
            'booking_fee' => 1000000,
        ]);

        // Video 1: Chờ duyệt (pending_approval)
        ContentPost::create([
            'campaign_creator_id' => $cc1->id,
            'platform' => 'tiktok',
            'video_title' => 'Review Kem Dưỡng Cực Đỉnh',
            'post_url' => 'https://www.tiktok.com/@creator1/video/111222333',
            'status' => 'pending_approval',
            'views_count' => 0,
            'gmv_amount' => 0,
        ]);

        // Video 2: Đã duyệt (approved)
        ContentPost::create([
            'campaign_creator_id' => $cc3->id,
            'platform' => 'tiktok',
            'video_title' => 'Trải nghiệm kem dưỡng 7 ngày',
            'post_url' => 'https://www.tiktok.com/@creator3/video/444555666',
            'status' => 'approved',
            'views_count' => 15000,
            'gmv_amount' => 12500000,
            'posted_at' => Carbon::now()->subDays(1),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('stats', fn (Assert $stats) => $stats
                ->where('total_creators', 3)
                ->where('active_campaigns', 1)
                ->where('approved_videos_count', 1)
                ->where('total_views', 15000)
                ->where('total_gmv', 12500000)
                ->where('total_cost', 8000000) // 2tr + 5tr + 1tr booking fees
                ->etc()
            )
            ->has('action_center', fn (Assert $action) => $action
                ->has('deadline_kocs', 1) // KOC 1 quá hạn deadline
                ->has('pending_approval_posts', 1) // Video 1 chờ duyệt
                ->where('ready_to_ship_count', 1) // KOC 2 đã chốt địa chỉ
                ->etc()
            )
            ->has('active_campaigns', 1)
        );
    }
}
