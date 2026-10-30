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
        Schema::create('creator_rate_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creator_id')->constrained('creators')->cascadeOnDelete();
            $table->enum('content_type', [
                'tiktok_video',
                'facebook_post',
                'youtube_video',
                'shopee_video',
                'reels',
                'livestream'
            ]);
            $table->decimal('price', 14, 2)->default(0.00);
            $table->string('currency', 10)->default('VND');
            $table->string('notes', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['creator_id', 'content_type'], 'idx_rate_cards_creator');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('creator_rate_cards');
    }
};
