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
        Schema::create('campaign_creators', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('assigned_to')->nullable()->comment('Nhân viên phụ trách');
            $table->enum('status', [
                'new',               // Mới thêm vào danh sách
                'contacted',         // Đã liên hệ
                'agreed',            // Đồng ý tham gia
                'address_confirmed', // Đã xác nhận địa chỉ nhận hàng
                'sample_sent',       // Đã gửi mẫu
                'sample_received',   // Đã nhận mẫu
                'posted',            // Đã lên video
                'completed',         // Hoàn tất
                'declined',          // Từ chối
                'no_show',           // Bom hàng
            ])->default('new');
            $table->decimal('booking_fee', 14, 2)->default(0.00)->comment('Phí booking thỏa thuận (VND)');
            $table->decimal('commission_rate', 5, 2)->nullable()->comment('% hoa hồng affiliate');
            $table->string('portal_token', 64)->nullable()->unique()->comment('Token truy cập cổng Portal');
            $table->timestamp('portal_token_expires_at')->nullable();
            $table->text('notes')->nullable()->comment('Ghi chú trao đổi riêng');

            // Mốc thời gian lưu vết chuyển trạng thái
            $table->timestamp('contacted_at')->nullable();
            $table->timestamp('agreed_at')->nullable();
            $table->timestamp('address_confirmed_at')->nullable();
            $table->timestamp('sample_sent_at')->nullable();
            $table->timestamp('sample_received_at')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('declined_at')->nullable();
            $table->timestamp('no_show_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['campaign_id', 'creator_id', 'deleted_at'], 'uk_campaign_creator');
            $table->index(['campaign_id', 'status'], 'idx_pipeline_status');
            $table->index(['assigned_to', 'status'], 'idx_pipeline_assigned');
            $table->index('portal_token', 'idx_pipeline_portal_token');

            $table->foreign('campaign_id')->references('id')->on('campaigns')->onDelete('cascade');
            $table->foreign('creator_id')->references('id')->on('creators')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_creators');
    }
};
