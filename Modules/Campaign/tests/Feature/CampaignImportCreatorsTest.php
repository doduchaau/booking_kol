<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class CampaignImportCreatorsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Campaign $campaign;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();

        $this->campaign = Campaign::create([
            'name' => 'Chiến Dịch Test Import',
            'product_name' => 'Sản phẩm Test',
            'target_platforms' => ['tiktok', 'shopee'],
            'budget' => 50000000,
            'target_creators_count' => 20,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE,
            'created_by' => $this->user->id,
        ]);
    }

    public function test_can_download_creator_import_template(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('campaigns.creators.import-template', $this->campaign->id));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_can_preview_import_with_new_and_multi_channel_creators(): void
    {
        $file = $this->createMockExcelFile([
            [
                'Nguyễn Quỳnh Nhi', '0987654321', 'quynhnhi@gmail.com',
                'tiktok', '@nhinnhinn', 'https://tiktok.com/@nhinnhinn', 150000,
                'shopee', 'nhinnhin_shop', 'https://shopee.vn/nhinnhin_shop', 25000,
                '', '', '', null,
                'beauty', 'micro', 2000000, 'TP.HCM', 'Ghi chú 1'
            ],
            [
                'Trần Mạnh Hùng', '0912345678', '',
                'tiktok', '@manhhung98', '', 50000,
                '', '', '', null,
                '', '', '', null,
                'tech', 'micro', 0, 'Hà Nội', ''
            ]
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('campaigns.creators.import-preview', $this->campaign->id), [
                'file' => $file,
            ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
        ]);

        $data = $response->json('data');
        $this->assertEquals(2, $data['summary']['new_count']);
        $this->assertEquals(0, $data['summary']['crm_duplicate_count']);
        $this->assertEquals(0, $data['summary']['campaign_duplicate_count']);
        $this->assertNotEmpty($data['token']);
    }

    public function test_can_detect_crm_duplicates_and_campaign_duplicates(): void
    {
        // 1. Tạo KOC đã có trong CRM nhưng chưa có trong chiến dịch
        $crmCreator = Creator::create([
            'name' => 'KOC Đã Có CRM',
            'phone' => '0988111222',
            'email' => 'crm_existing@test.com',
            'tier' => CreatorTierEnum::MICRO,
            'niche' => 'fashion',
        ]);
        CreatorAccount::create([
            'creator_id' => $crmCreator->id,
            'platform' => 'tiktok',
            'handle' => 'koc_crm_old',
            'followers_count' => 50000,
        ]);

        // 2. Tạo KOC đã có sẵn trong chiến dịch
        $campCreator = Creator::create([
            'name' => 'KOC Đã Có Chiến Dịch',
            'phone' => '0977333444',
            'email' => 'camp_existing@test.com',
            'tier' => CreatorTierEnum::NANO,
            'niche' => 'food',
        ]);
        CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $campCreator->id,
            'status' => PipelineStatusEnum::CONTACTED->value,
            'collaboration_type' => 'video',
            'booking_platforms' => ['tiktok'],
            'booking_fee' => 1500000,
            'portal_token' => 'test_token_123',
            'portal_token_expires_at' => now()->addDays(14),
        ]);

        // Tạo file excel chứa:
        // - 1 KOC trùng CRM
        // - 1 KOC trùng Chiến dịch
        // - 1 KOC hoàn toàn mới
        $file = $this->createMockExcelFile([
            [
                'KOC Đã Có CRM', '0988111222', '',
                'shopee', 'koc_shopee_new', '', 20000,
                '', '', '', null,
                '', '', '', null,
                'fashion', 'micro', 2000000, 'Hà Nội', ''
            ],
            [
                'KOC Đã Có Chiến Dịch', '0977333444', '',
                'tiktok', 'camp_handle', '', 10000,
                '', '', '', null,
                '', '', '', null,
                'food', 'nano', 1800000, 'Đà Nẵng', ''
            ],
            [
                'KOC Hoàn Toàn Mới', '0966555666', 'brandnew@test.com',
                'tiktok', '@brandnew_koc', '', 80000,
                '', '', '', null,
                '', '', '', null,
                'beauty', 'micro', 1000000, 'Cần Thơ', ''
            ]
        ]);

        $response = $this->actingAs($this->user)
            ->post(route('campaigns.creators.import-preview', $this->campaign->id), [
                'file' => $file,
            ], ['Accept' => 'application/json']);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['summary']['new_count'], 'Phải có đúng 1 KOC mới');
        $this->assertEquals(1, $data['summary']['crm_duplicate_count'], 'Phải phát hiện 1 KOC trùng CRM');
        $this->assertEquals(1, $data['summary']['campaign_duplicate_count'], 'Phải phát hiện 1 KOC trùng Chiến dịch');

        // Test Confirm import:
        $token = $data['token'];
        $confirmResponse = $this->actingAs($this->user)
            ->postJson(route('campaigns.creators.import-confirm', $this->campaign->id), [
                'token' => $token,
                'resolutions' => [
                    $data['crm_duplicates'][0]['key'] => 'update_and_assign',
                    $data['campaign_duplicates'][0]['key'] => 'skip',
                ],
                'default_booking_fee' => 500000,
                'default_platforms' => ['tiktok', 'shopee'],
            ]);

        $confirmResponse->assertOk();
        $result = $confirmResponse->json('data');

        $this->assertEquals(1, $result['created_crm'], 'Phải tạo mới 1 KOC trong CRM');
        $this->assertEquals(1, $result['updated_crm'], 'Phải cập nhật 1 KOC trong CRM');
        $this->assertEquals(2, $result['assigned_campaign'], 'Phải gán 2 KOC vào chiến dịch (1 mới + 1 từ CRM)');
        $this->assertEquals(1, $result['skipped'], 'Phải bỏ qua 1 KOC đã có trong chiến dịch');

        // Kiểm tra database:
        // KOC mới phải có trong creators
        $this->assertDatabaseHas('creators', [
            'name' => 'KOC Hoàn Toàn Mới',
            'phone' => '0966555666',
        ]);

        // KOC CRM phải có thêm account Shopee
        $this->assertDatabaseHas('creator_accounts', [
            'creator_id' => $crmCreator->id,
            'platform' => 'shopee',
            'handle' => 'koc_shopee_new',
        ]);

        // Chiến dịch phải có 3 KOC (1 ban đầu + 2 gán mới)
        $this->assertEquals(3, CampaignCreator::where('campaign_id', $this->campaign->id)->count());
    }

    protected function createMockExcelFile(array $rows): UploadedFile
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Row 1: Header
        $headers = range('A', 'T');
        foreach ($headers as $col) {
            $sheet->setCellValue($col . '1', "Header $col");
        }

        // Data rows
        $rowIdx = 2;
        foreach ($rows as $row) {
            foreach ($row as $colIdx => $val) {
                $sheet->setCellValue($headers[$colIdx] . $rowIdx, $val);
            }
            $rowIdx++;
        }

        $testDir = storage_path('framework/testing');
        if (!is_dir($testDir)) {
            mkdir($testDir, 0755, true);
        }
        $tempPath = $testDir . '/test_koc_import_' . uniqid() . '.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return new UploadedFile($tempPath, 'test_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }
}
