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
        Schema::create('content_posts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_creator_id');
            $table->enum('platform', ['tiktok', 'facebook', 'youtube', 'shopee', 'instagram'])->default('tiktok');
            $table->string('post_url', 500)->comment('Đường link bài đăng hoặc video');
            $table->string('post_id', 100)->nullable()->comment('ID bài đăng trên mạng xã hội');
            $table->string('video_title', 255)->nullable()->comment('Tiêu đề / Caption bài viết');
            $table->timestamp('posted_at')->nullable()->comment('Thời điểm xuất bản video');
            $table->enum('status', ['pending_approval', 'approved', 'changes_requested'])->default('pending_approval');
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);
            $table->unsignedInteger('shares_count')->default(0);
            $table->decimal('gmv_amount', 14, 2)->default(0.00)->comment('Doanh thu phát sinh từ video');
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status', 'idx_content_status');
            $table->foreign('campaign_creator_id')->references('id')->on('campaign_creators')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_posts');
    }
};
