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
        Schema::create('creator_metrics_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_account_id')->constrained('creator_accounts')->cascadeOnDelete();
            $table->unsignedInteger('followers_count')->default(0);
            $table->unsignedInteger('average_views')->default(0);
            $table->unsignedInteger('average_likes')->default(0);
            $table->unsignedInteger('average_comments')->default(0);
            $table->unsignedInteger('average_shares')->default(0);
            $table->decimal('engagement_rate', 5, 2)->default(0.00)->comment('ER on followers %');
            $table->decimal('view_engagement_rate', 5, 2)->default(0.00)->comment('ER on views %');
            $table->unsignedTinyInteger('posts_sample_count')->default(0);
            $table->date('snapshot_date')->comment('Ngày ghi nhận snapshot');
            $table->timestamps();

            $table->unique(['creator_account_id', 'snapshot_date'], 'uk_account_snapshot_date');
            $table->index('snapshot_date', 'idx_metrics_histories_snapshot_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('creator_metrics_histories');
    }
};
