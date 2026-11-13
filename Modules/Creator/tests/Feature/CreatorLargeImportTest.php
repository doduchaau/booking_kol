<?php

namespace Modules\Creator\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Modules\Creator\Jobs\ImportCreatorsJob;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Models\CreatorImportJob;
use Tests\TestCase;

class CreatorLargeImportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_can_analyze_large_csv_and_return_file_token_without_memory_spike(): void
    {
        // Tạo file CSV giả lập 500 KOCs với dòng tiêu đề ở dòng 3
        $csv = "DANH SACH KOC KALODATA 2026\n"
            . "Ngay xuat: 02/11/2026\n"
            . "Ho va ten,So dien thoai,Kenh TikTok,Followers,Bao gia,Niche\n";

        for ($i = 1; $i <= 300; $i++) {
            $phone = sprintf("098%07d", $i);
            $csv .= "Creator {$i},{$phone},@creator_{$i},50k,2tr5,beauty\n";
        }

        $file = UploadedFile::fake()->createWithContent('kalodata_large_300.csv', $csv);

        $response = $this->actingAs($this->user)
            ->postJson(route('creators.import.analyze'), [
                'file' => $file,
            ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.header_row_index', 2);
        $response->assertJsonPath('data.total_rows', 300);

        $fileToken = $response->json('data.file_token');
        $this->assertNotEmpty($fileToken);

        // Kiểm tra CreatorImportJob được khởi tạo trong DB
        $this->assertDatabaseHas('creator_import_jobs', [
            'file_token' => $fileToken,
            'total_rows' => 300,
            'status' => 'pending',
        ]);
    }

    public function test_can_process_streaming_chunks_and_deduplicate_in_memory(): void
    {
        // Tạo file CSV với 10 KOCs, trong đó có 2 dòng trùng SĐT và 1 dòng trùng handle
        $csv = "Ten,So dien thoai,Kenh,Followers,Gia\n"
            . "An Nguyen,0912345678,@annguyen,100k,3tr\n"
            . "Bich Tran,0987654321,@bichtran,200k,5tr\n"
            . "An Nguyen Update,0912345678,@an_new,150k,4tr\n" // Trùng SĐT với dòng 1
            . "Chau Le,0903112233,@chaule,80k,2tr\n";

        $file = UploadedFile::fake()->createWithContent('koc_dedup_test.csv', $csv);

        // Bước 1: Analyze để có file_token
        $analyzeRes = $this->actingAs($this->user)
            ->postJson(route('creators.import.analyze'), [
                'file' => $file,
            ]);

        $fileToken = $analyzeRes->json('data.file_token');

        // Bước 2: Gọi Chunk API
        $chunkRes = $this->actingAs($this->user)
            ->postJson(route('creators.import.chunk'), [
                'file_token' => $fileToken,
                'chunk_index' => 0,
                'chunk_size' => 100,
                'auto_enrich' => false,
            ]);

        $chunkRes->assertOk();
        $chunkRes->assertJsonPath('success', true);
        $chunkRes->assertJsonPath('data.is_finished', true);
        $chunkRes->assertJsonPath('data.imported_in_chunk', 3); // 3 Creator mới (An, Bich, Chau)
        $chunkRes->assertJsonPath('data.updated_in_chunk', 1);  // 1 Creator được gộp/cập nhật vì trùng SĐT

        // Database chỉ có 3 Creators
        $this->assertEquals(3, Creator::count());

        // Creator có SĐT 0912345678 phải có 2 accounts (@annguyen và @an_new)
        $anCreator = Creator::where('phone', '0912345678')->first();
        $this->assertNotNull($anCreator);
        $this->assertCount(2, $anCreator->accounts);

        // Kiểm tra CreatorImportJob cập nhật status = completed
        $this->assertDatabaseHas('creator_import_jobs', [
            'file_token' => $fileToken,
            'status' => 'completed',
            'imported_count' => 3,
            'updated_count' => 1,
        ]);
    }

    public function test_can_queue_background_import_job(): void
    {
        Queue::fake();

        $csv = "Ten,Kenh,Followers\n"
            . "Linh Chi,@linhchi,50k\n";

        $file = UploadedFile::fake()->createWithContent('koc_queue.csv', $csv);

        $analyzeRes = $this->actingAs($this->user)
            ->postJson(route('creators.import.analyze'), [
                'file' => $file,
            ]);

        $fileToken = $analyzeRes->json('data.file_token');

        $queueRes = $this->actingAs($this->user)
            ->postJson(route('creators.import.queue'), [
                'file_token' => $fileToken,
            ]);

        $queueRes->assertOk();
        $queueRes->assertJsonPath('success', true);

        Queue::assertPushed(ImportCreatorsJob::class, function ($job) use ($fileToken) {
            $jobRecord = CreatorImportJob::find($job->importJobId);
            return $jobRecord && $jobRecord->file_token === $fileToken;
        });
    }

    public function test_can_get_progress_and_cancel_import(): void
    {
        $csv = "Ten,Kenh\n"
            . "Test KOC,@testkoc\n";

        $file = UploadedFile::fake()->createWithContent('koc_progress.csv', $csv);

        $analyzeRes = $this->actingAs($this->user)
            ->postJson(route('creators.import.analyze'), [
                'file' => $file,
            ]);

        $fileToken = $analyzeRes->json('data.file_token');

        // Kiểm tra endpoint progress
        $progressRes = $this->actingAs($this->user)
            ->getJson(route('creators.import.progress', ['fileToken' => $fileToken]));

        $progressRes->assertOk();
        $progressRes->assertJsonPath('data.status', 'pending');
        $progressRes->assertJsonPath('data.total_rows', 1);

        // Kiểm tra endpoint cancel
        $cancelRes = $this->actingAs($this->user)
            ->postJson(route('creators.import.cancel', ['fileToken' => $fileToken]));

        $cancelRes->assertOk();
        $cancelRes->assertJsonPath('success', true);

        $this->assertDatabaseHas('creator_import_jobs', [
            'file_token' => $fileToken,
            'status' => 'cancelled',
        ]);
    }
}

