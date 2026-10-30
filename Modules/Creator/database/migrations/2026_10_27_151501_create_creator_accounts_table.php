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
        Schema::create('creator_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('creators')->cascadeOnDelete();
            $table->enum('platform', ['tiktok', 'facebook', 'shopee', 'zalo', 'youtube', 'instagram']);
            $table->string('handle', 150)->comment('Username hoặc handle không dấu');
            $table->string('url', 255)->comment('Link trang cá nhân');
            $table->unsignedInteger('followers_count')->default(0);
            $table->decimal('engagement_rate', 5, 2)->default(0.00)->comment('Tỷ lệ tương tác %');
            $table->unsignedInteger('average_views')->default(0);
            $table->unsignedBigInteger('gmv_estimate')->default(0);
            $table->string('data_source', 50)->default('manual')->comment('manual, excel_import, kalodata, fastmoss, extension');
            $table->timestamp('last_metrics_updated_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['platform', 'handle', 'deleted_at'], 'uk_platform_handle_deleted');
            $table->index('creator_id', 'idx_creator_accounts_creator_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('creator_accounts');
    }
};
