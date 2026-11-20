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
        Schema::table('campaign_products', function (Blueprint $table) {
            $table->json('images')->nullable()->after('thumbnail_url')->comment('Danh sách ảnh sản phẩm');
            $table->json('brief_files')->nullable()->after('brief_file')->comment('Danh sách file brief đính kèm');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_products', function (Blueprint $table) {
            $table->dropColumn(['images', 'brief_files']);
        });
    }
};
