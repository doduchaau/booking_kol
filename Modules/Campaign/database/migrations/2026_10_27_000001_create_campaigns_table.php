<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200)->comment('Tên chiến dịch booking');
            $table->string('product_name', 200)->comment('Tên sản phẩm trọng tâm');
            $table->string('product_sku', 100)->nullable()->comment('Mã SKU sản phẩm');
            $table->decimal('budget', 14, 2)->default(0.00)->comment('Tổng ngân sách dự trù (VND)');
            $table->unsignedSmallInteger('target_creators_count')->default(10)->comment('Mục tiêu số lượng Creator cần book');
            $table->date('start_date')->comment('Ngày bắt đầu chiến dịch');
            $table->date('end_date')->comment('Ngày kết thúc chiến dịch');
            $table->text('content_guidelines')->nullable()->comment('Mô tả kịch bản, hashtag, quy định cấm kỵ');
            $table->text('sample_requirement')->nullable()->comment('Quy định về mẫu sản phẩm trải nghiệm');
            $table->decimal('commission_rate', 5, 2)->default(0.00)->comment('% hoa hồng affiliate nếu có');
            $table->enum('status', ['draft', 'active', 'completed', 'paused'])->default('draft')->comment('Trạng thái chiến dịch');
            $table->unsignedBigInteger('created_by')->nullable()->comment('User ID người tạo');
            $table->timestamps();
            $table->softDeletes();

            $table->index('status', 'idx_campaigns_status');
            $table->index(['start_date', 'end_date'], 'idx_campaigns_dates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
