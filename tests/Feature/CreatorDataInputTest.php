<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Tests\TestCase;

class CreatorDataInputTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /**
     * Test 1: Tạo Creator thủ công khi để trống tài khoản mạng xã hội (Trước đây bị lỗi do dummy row accounts)
     */
    public function test_manual_creator_store_without_accounts_succeeds(): void
    {
        $payload = [
            'name' => 'Nguyễn Minh Thảo',
            'phone' => '0912345678',
            'email' => 'minhthao@example.com',
            'niche' => 'beauty',
            'tier' => 'nano',
            'shipping_address' => '123 Cách Mạng Tháng 8',
            'city_province' => 'TP. Hồ Chí Minh',
            'district' => 'Quận 3',
            // Dòng dummy rỗng gửi lên từ frontend
            'accounts' => [
                [
                    'platform' => 'tiktok',
                    'handle' => '',
                    'followers_count' => 0,
                    'url' => '',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post(route('creators.store'), $payload);

        $response->assertRedirect(route('creators.index'));
        $this->assertDatabaseHas('creators', [
            'name' => 'Nguyễn Minh Thảo',
            'phone' => '0912345678',
            'email' => 'minhthao@example.com',
            'niche' => 'beauty',
        ]);
        $this->assertEquals(0, CreatorAccount::count());
    }

    /**
     * Test 2: Tạo Creator thủ công kèm tài khoản mạng xã hội hợp lệ
     */
    public function test_manual_creator_store_with_valid_account_succeeds(): void
    {
        $payload = [
            'name' => 'Phạm Hoàng Nam',
            'phone' => '0988776655',
            'niche' => 'tech',
            'tier' => 'micro',
            'accounts' => [
                [
                    'platform' => 'tiktok',
                    'handle' => '@namtechreview',
                    'followers_count' => 25000,
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post(route('creators.store'), $payload);

        $response->assertRedirect(route('creators.index'));
        $creator = Creator::where('phone', '0988776655')->first();
        $this->assertNotNull($creator);
        $this->assertDatabaseHas('creator_accounts', [
            'creator_id' => $creator->id,
            'platform' => 'tiktok',
            'handle' => 'namtechreview',
            'followers_count' => 25000,
        ]);
    }

    /**
     * Test 3: Import file CSV tiếng Việt chuẩn
     */
    public function test_import_vietnamese_csv_file_succeeds(): void
    {
        $csvContent = "\xEF\xBB\xBF" . "Tên KOC,Số điện thoại,Email,Kênh,Link,Followers,Ngành hàng\n"
            . "Trần Văn Bình,0901234567,binh.tran@gmail.com,@binhtranvlog,https://www.tiktok.com/@binhtranvlog,50000,lifestyle\n";

        $tempFile = tempnam(sys_get_temp_dir(), 'csv_import_');
        file_put_contents($tempFile, $csvContent);

        $uploadedFile = new UploadedFile(
            $tempFile,
            'creators_vi.csv',
            'text/csv',
            null,
            true
        );

        $response = $this->actingAs($this->user)->post(route('creators.import'), [
            'file' => $uploadedFile,
            'format' => 'auto',
        ]);

        $response->assertRedirect(route('creators.index'));
        $this->assertDatabaseHas('creators', [
            'name' => 'Trần Văn Bình',
            'phone' => '0901234567',
            'niche' => 'lifestyle',
        ]);
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'binhtranvlog',
            'platform' => 'tiktok',
            'followers_count' => 50000,
        ]);

        @unlink($tempFile);
    }

    /**
     * Test 4: Import file Excel .xlsx thực tế
     */
    public function test_import_xlsx_template_file_succeeds(): void
    {
        $templatePath = public_path('import-creators-template.xlsx');
        $this->assertFileExists($templatePath);

        $uploadedFile = new UploadedFile(
            $templatePath,
            'import-creators-template.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->actingAs($this->user)->post(route('creators.import'), [
            'file' => $uploadedFile,
            'format' => 'auto',
        ]);

        $response->assertRedirect(route('creators.index'));
        // Dữ liệu mẫu trong template đã được tạo
        $this->assertDatabaseHas('creators', [
            'phone' => '0912345678',
        ]);
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'antechreview',
        ]);
    }

    /**
     * Test 5: Nhập hàng loạt qua URLs (Batch URLs)
     */
    public function test_import_batch_urls_succeeds(): void
    {
        $urls = "https://www.tiktok.com/@charlidamelio\nhttps://www.youtube.com/@MrBeast";

        $response = $this->actingAs($this->user)->post(route('creators.import.batch-urls'), [
            'urls' => $urls,
        ]);

        $response->assertRedirect(route('creators.index'));
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'charlidamelio',
            'platform' => 'tiktok',
        ]);
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'mrbeast',
            'platform' => 'youtube',
        ]);
    }

    /**
     * Test 6: Nhập KOL từ Discovery Search
     */
    public function test_import_from_discovery_succeeds(): void
    {
        $payload = [
            'selected' => [
                [
                    'handle' => 'discovery_kol_test',
                    'platform' => 'tiktok',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post(route('creators.discovery.import'), $payload);

        $response->assertRedirect(route('creators.index'));
        $this->assertDatabaseHas('creator_accounts', [
            'handle' => 'discovery_kol_test',
            'platform' => 'tiktok',
        ]);
    }

    /**
     * Test 7: Gán Creator vào Chiến Dịch Campaign
     */
    public function test_add_creators_to_campaign_succeeds(): void
    {
        $creator = Creator::create([
            'name' => 'Chi Pu',
            'niche' => 'music',
            'tier' => 'mega',
            'trust_score' => 100,
        ]);

        $campaign = Campaign::create([
            'name' => 'Chiến dịch Tết 2026',
            'code' => 'TET-2026',
            'brand_name' => 'Nhãn Hàng Việt',
            'product_name' => 'Quà Tết',
            'status' => 'active',
            'budget' => 50000000,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->post(route('campaigns.creators.add', $campaign->id), [
            'creator_ids' => [$creator->id],
            'booking_fee' => 15000000,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('campaign_creators', [
            'campaign_id' => $campaign->id,
            'creator_id' => $creator->id,
            'booking_fee' => 15000000,
            'status' => 'new',
        ]);
    }
}

