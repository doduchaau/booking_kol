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
        Schema::create('campaign_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->string('name', 200)->comment('Tên sản phẩm');
            $table->string('sku', 100)->nullable()->comment('Mã SKU kho');
            $table->string('thumbnail_url', 255)->nullable()->comment('Ảnh đại diện sản phẩm');
            $table->string('product_url', 500)->nullable()->comment('Link sản phẩm (TikTok Shop / Shopee / Web...)');
            $table->decimal('retail_price', 14, 2)->default(0.00)->comment('Giá niêm yết bán lẻ');

            // Brief riêng biệt của từng sản phẩm
            $table->text('brief_content')->nullable()->comment('Kịch bản / Góc quay / USP nổi bật riêng của sản phẩm');
            $table->string('brief_file', 255)->nullable()->comment('File tài liệu brief riêng cho sản phẩm');
            $table->string('hashtags', 255)->nullable()->comment('Hashtags riêng cho sản phẩm');
            $table->text('sample_requirement')->nullable()->comment('Lưu ý gửi mẫu riêng (màu sắc, size, dung tích)');

            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('campaign_id');
        });

        // Tự động migrate dữ liệu cũ từ bảng campaigns sang campaign_products
        try {
            $campaigns = DB::table('campaigns')->get();
            foreach ($campaigns as $camp) {
                if (!empty($camp->product_name)) {
                    DB::table('campaign_products')->insert([
                        'campaign_id' => $camp->id,
                        'name' => $camp->product_name,
                        'sku' => $camp->product_sku ?? null,
                        'product_url' => $camp->affiliate_link ?? null,
                        'brief_content' => $camp->content_guidelines ?? null,
                        'brief_file' => $camp->content_guidelines_file ?? null,
                        'hashtags' => $camp->hashtags ?? null,
                        'sample_requirement' => $camp->sample_requirement ?? null,
                        'retail_price' => 0.00,
                        'sort_order' => 0,
                        'created_at' => $camp->created_at ?? now(),
                        'updated_at' => $camp->updated_at ?? now(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            // Log or ignore if table is fresh
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_products');
    }
};

