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
        Schema::create('campaign_creator_chat_evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_creator_id')
                ->constrained('campaign_creators')
                ->cascadeOnDelete();
            $table->foreignId('uploaded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('file_path', 500);
            $table->string('file_name', 255);
            $table->string('file_type', 100);
            $table->unsignedBigInteger('file_size')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['campaign_creator_id', 'created_at'], 'idx_chat_evidences_creator_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_creator_chat_evidences');
    }
};
