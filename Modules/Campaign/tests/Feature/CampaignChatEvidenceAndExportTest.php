<?php

namespace Modules\Campaign\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Models\CampaignCreatorChatEvidence;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Models\Creator;
use Modules\Report\Exports\CampaignRoiExport;
use Modules\Report\Exports\Sheets\ChatEvidenceSheet;
use Tests\TestCase;

class CampaignChatEvidenceAndExportTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $staffUser;
    protected User $otherStaffUser;
    protected Campaign $campaign;
    protected Creator $creator;
    protected CampaignCreator $campaignCreator;

    protected function setUp(): void
    {
        parent::setUp();

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Admin']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'Staff']);

        $this->adminUser = User::factory()->create();
        $this->adminUser->assignRole('Admin');

        $this->staffUser = User::factory()->create();
        $this->staffUser->assignRole('Staff');

        $this->otherStaffUser = User::factory()->create();
        $this->otherStaffUser->assignRole('Staff');

        $this->campaign = Campaign::create([
            'name' => 'Chiến Dịch Test Evidence',
            'product_name' => 'Kem Chống Nắng',
            'budget' => 20000000,
            'target_creators_count' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => CampaignStatusEnum::ACTIVE->value,
            'created_by' => $this->adminUser->id,
        ]);

        $this->creator = Creator::create([
            'name' => 'KOC Reviewer 01',
            'phone' => '0987654321',
            'tier' => CreatorTierEnum::MICRO->value,
            'niche' => 'Beauty',
        ]);

        $this->campaignCreator = CampaignCreator::create([
            'campaign_id' => $this->campaign->id,
            'creator_id' => $this->creator->id,
            'assigned_to' => $this->staffUser->id,
            'status' => 'contacted',
            'booking_fee' => 1500000,
        ]);
    }

    public function test_staff_can_upload_multiple_chat_evidences(): void
    {
        Storage::fake('public');

        $file1 = UploadedFile::fake()->image('zalo_chat_01.png', 800, 600);
        $file2 = UploadedFile::fake()->create('contract_confirm.pdf', 150, 'application/pdf');

        $response = $this->actingAs($this->staffUser)
            ->post(route('campaigns.creators.chat-evidences.store', [
                'campaign' => $this->campaign->id,
                'creator' => $this->campaignCreator->id,
            ]), [
                'files' => [$file1, $file2],
                'notes' => 'Chụp màn hình Zalo chốt giá 1.5M',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseCount('campaign_creator_chat_evidences', 2);

        $evidence = CampaignCreatorChatEvidence::where('file_name', 'zalo_chat_01.png')->first();
        $this->assertNotNull($evidence);
        $this->assertEquals($this->campaignCreator->id, $evidence->campaign_creator_id);
        $this->assertEquals($this->staffUser->id, $evidence->uploaded_by);
        $this->assertEquals('Chụp màn hình Zalo chốt giá 1.5M', $evidence->notes);
        $this->assertTrue($evidence->is_image);

        // Kiểm tra file thực tế được lưu trên disk fake
        Storage::disk('public')->assertExists($evidence->file_path);

        // Kiểm tra count trên CampaignCreator
        $this->campaignCreator->refresh();
        $this->assertEquals(2, $this->campaignCreator->chat_evidences_count);
    }

    public function test_user_can_delete_evidence_and_file_is_removed_from_disk(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('evidence_to_delete.png');
        $storedPath = $file->storeAs("campaign_evidences/{$this->campaign->id}/{$this->campaignCreator->id}", 'evidence_to_delete.png', 'public');

        $evidence = CampaignCreatorChatEvidence::create([
            'campaign_creator_id' => $this->campaignCreator->id,
            'uploaded_by' => $this->staffUser->id,
            'file_path' => $storedPath,
            'file_name' => 'evidence_to_delete.png',
            'file_type' => 'image/png',
            'file_size' => 12345,
            'notes' => 'Evidence xóa',
        ]);

        Storage::disk('public')->assertExists($storedPath);

        $response = $this->actingAs($this->staffUser)
            ->delete(route('campaigns.creators.chat-evidences.destroy', [
                'campaign' => $this->campaign->id,
                'creator' => $this->campaignCreator->id,
                'evidence' => $evidence->id,
            ]));

        $response->assertRedirect();
        $this->assertDatabaseMissing('campaign_creator_chat_evidences', ['id' => $evidence->id]);
        Storage::disk('public')->assertMissing($storedPath);
    }

    public function test_other_staff_cannot_delete_evidence_of_colleague(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('staff1_evidence.png');
        $storedPath = $file->storeAs("campaign_evidences/{$this->campaign->id}/{$this->campaignCreator->id}", 'staff1_evidence.png', 'public');

        $evidence = CampaignCreatorChatEvidence::create([
            'campaign_creator_id' => $this->campaignCreator->id,
            'uploaded_by' => $this->staffUser->id,
            'file_path' => $storedPath,
            'file_name' => 'staff1_evidence.png',
            'file_type' => 'image/png',
            'file_size' => 12345,
            'notes' => 'Của staff 1',
        ]);

        // Staff khác cố tình gọi xóa -> 403 Forbidden
        $response = $this->actingAs($this->otherStaffUser)
            ->delete(route('campaigns.creators.chat-evidences.destroy', [
                'campaign' => $this->campaign->id,
                'creator' => $this->campaignCreator->id,
                'evidence' => $evidence->id,
            ]));

        $response->assertForbidden();
        $this->assertDatabaseHas('campaign_creator_chat_evidences', ['id' => $evidence->id]);
    }

    public function test_campaign_roi_export_includes_chat_evidence_sheet_with_drawings(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->image('zalo_evidence.png', 400, 300);
        $storedPath = $file->storeAs("campaign_evidences/{$this->campaign->id}/{$this->campaignCreator->id}", 'zalo_evidence.png', 'public');

        CampaignCreatorChatEvidence::create([
            'campaign_creator_id' => $this->campaignCreator->id,
            'uploaded_by' => $this->staffUser->id,
            'file_path' => $storedPath,
            'file_name' => 'zalo_evidence.png',
            'file_type' => 'image/png',
            'file_size' => 25000,
            'notes' => 'Bằng chứng chốt deal',
        ]);

        $export = new CampaignRoiExport(
            campaignId: $this->campaign->id,
            dateRange: null,
            campaignName: $this->campaign->name,
            sections: ['chat_evidences'],
            periodLabel: 'Kỳ tháng 11/2026'
        );

        $sheets = $export->sheets();
        $this->assertCount(1, $sheets);
        $this->assertInstanceOf(ChatEvidenceSheet::class, $sheets[0]);

        $sheet = $sheets[0];
        $this->assertEquals('Bằng Chứng Trao Đổi KOC', $sheet->title());

        $data = $sheet->array();
        $this->assertGreaterThanOrEqual(7, count($data)); // Header + ít nhất 1 dòng dữ liệu
        $this->assertEquals('KOC Reviewer 01', $data[6][1]); // Tên KOC ở dòng dữ liệu đầu tiên

        // Kiểm tra Drawing
        $drawings = $sheet->drawings();
        $this->assertCount(1, $drawings);
        $this->assertEquals('K7', $drawings[0]->getCoordinates());
        $this->assertEquals(65, $drawings[0]->getHeight());
    }
}
