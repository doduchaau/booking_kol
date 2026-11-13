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
        Schema::create('creator_import_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('file_name', 255);
            $table->string('file_token', 64)->unique();
            $table->string('file_path', 255);
            $table->string('file_format', 50)->default('auto');
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('processed_rows')->default(0);
            $table->unsignedInteger('imported_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->string('status', 30)->default('pending')->comment('pending, processing, completed, failed, cancelled');
            $table->json('custom_mapping')->nullable();
            $table->boolean('auto_enrich')->default(true);
            $table->unsignedInteger('header_row_index')->default(0);
            $table->json('headers')->nullable();
            $table->json('errors')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index('status', 'idx_import_jobs_status');
            $table->index('created_at', 'idx_import_jobs_created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('creator_import_jobs');
    }
};

