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
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('content_guidelines_file', 255)->nullable()->after('content_guidelines')->comment('Đường dẫn file tài liệu kịch bản / guideline đính kèm');
            $table->string('sample_requirement_file', 255)->nullable()->after('sample_requirement')->comment('Đường dẫn file tài liệu quy định gửi mẫu đính kèm');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['content_guidelines_file', 'sample_requirement_file']);
        });
    }
};
