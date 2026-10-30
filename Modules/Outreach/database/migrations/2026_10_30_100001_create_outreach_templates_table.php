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
        Schema::create('outreach_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->comment('Tên mẫu tin nhắn');
            $table->enum('channel', ['zalo_oa', 'zalo_personal', 'email', 'direct_message'])->default('zalo_personal');
            $table->string('subject', 200)->nullable()->comment('Tiêu đề tin nhắn nếu gửi email/ZNS');
            $table->text('content_template')->comment('Chứa biến {creator_name}, {product_name}, {rate}, {portal_link}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('outreach_templates');
    }
};

