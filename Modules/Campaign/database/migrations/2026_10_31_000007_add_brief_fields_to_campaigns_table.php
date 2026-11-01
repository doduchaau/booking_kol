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
            $table->text('key_messages')->nullable()->after('content_guidelines')->comment('Thông điệp chính / USP sản phẩm');
            $table->string('hashtags', 500)->nullable()->after('key_messages')->comment('Hashtags bắt buộc');
            $table->text('dos_and_donts')->nullable()->after('hashtags')->comment('Những việc nên làm và điều cấm kỵ');
            $table->string('discount_code', 100)->nullable()->after('dos_and_donts')->comment('Mã giảm giá độc quyền cho Creator');
            $table->string('affiliate_link', 500)->nullable()->after('discount_code')->comment('Link sản phẩm / Giỏ hàng liên kết');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn([
                'key_messages',
                'hashtags',
                'dos_and_donts',
                'discount_code',
                'affiliate_link',
            ]);
        });
    }
};

