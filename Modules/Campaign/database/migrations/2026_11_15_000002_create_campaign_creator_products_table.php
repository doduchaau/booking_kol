<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('campaign_creator_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_creator_id')->constrained('campaign_creators')->cascadeOnDelete();
            $table->foreignId('campaign_product_id')->constrained('campaign_products')->cascadeOnDelete();

            $table->unsignedSmallInteger('quantity_assigned')->default(1)->comment('Số lượng mẫu gán cho KOC');
            $table->unsignedSmallInteger('quantity_sent')->default(0)->comment('Số lượng mẫu thực tế nhân viên đã gửi');
            $table->string('sample_variant', 100)->nullable()->comment('Phân loại KOC chọn/gửi (Màu, Size, Dung tích)');

            $table->enum('sample_status', ['assigned', 'sent', 'received'])->default('assigned')->comment('Trạng thái mẫu từng món');
            $table->timestamp('sent_at')->nullable()->comment('Thời điểm gửi món này');
            $table->timestamp('received_at')->nullable()->comment('Thời điểm KOC nhận món này');
            $table->string('notes', 255)->nullable()->comment('Ghi chú gửi mẫu món này');

            $table->timestamps();

            $table->unique(['campaign_creator_id', 'campaign_product_id'], 'uk_campaign_creator_product');
            $table->index('sample_status');
        });

        // Migrate dữ liệu cũ: Nếu KOC đã có trong chiến dịch cũ, gắn sản phẩm đầu tiên của chiến dịch cho KOC
        try {
            $campaignCreators = DB::table('campaign_creators')->get();
            foreach ($campaignCreators as $cc) {
                $product = DB::table('campaign_products')->where('campaign_id', $cc->campaign_id)->first();
                if ($product) {
                    $isSent = !is_null($cc->sample_sent_at) || in_array($cc->status, ['sample_sent', 'sample_received', 'posted', 'completed']);
                    $isReceived = !is_null($cc->sample_received_at) || in_array($cc->status, ['sample_received', 'posted', 'completed']);

                    $sampleStatus = 'assigned';
                    if ($isReceived) {
                        $sampleStatus = 'received';
                    } elseif ($isSent) {
                        $sampleStatus = 'sent';
                    }

                    DB::table('campaign_creator_products')->insert([
                        'campaign_creator_id' => $cc->id,
                        'campaign_product_id' => $product->id,
                        'quantity_assigned' => 1,
                        'quantity_sent' => $isSent ? 1 : 0,
                        'sample_status' => $sampleStatus,
                        'sent_at' => $cc->sample_sent_at,
                        'received_at' => $cc->sample_received_at,
                        'created_at' => $cc->created_at ?? now(),
                        'updated_at' => $cc->updated_at ?? now(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            // Log or ignore
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_creator_products');
    }
};

