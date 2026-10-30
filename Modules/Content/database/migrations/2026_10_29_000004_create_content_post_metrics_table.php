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
        Schema::create('content_post_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_post_id')->constrained('content_posts')->cascadeOnDelete();
            $table->date('recorded_date')->comment('Ngày ghi nhận snapshot chỉ số');
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);
            $table->unsignedInteger('shares_count')->default(0);
            $table->unsignedInteger('orders_count')->default(0);
            $table->decimal('gmv_amount', 14, 2)->default(0.00)->comment('Doanh thu GMV ghi nhận');
            $table->timestamps();

            $table->unique(['content_post_id', 'recorded_date'], 'uk_post_metric_date');
            $table->index(['recorded_date', 'content_post_id'], 'idx_metric_date_post');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_post_metrics');
    }
};
