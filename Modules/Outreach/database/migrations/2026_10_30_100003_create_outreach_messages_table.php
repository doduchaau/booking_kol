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
        Schema::create('outreach_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_creator_id');
            $table->enum('channel', ['zalo_oa', 'zalo_personal', 'email', 'direct_message'])->default('zalo_personal');
            $table->unsignedBigInteger('sender_id')->comment('User nhân viên thực hiện');
            $table->unsignedBigInteger('template_id')->nullable();
            $table->text('sent_content')->comment('Nội dung thực tế đã gửi sau khi render');
            $table->enum('status', ['draft', 'sent', 'delivered', 'read', 'replied', 'failed'])->default('sent');
            $table->string('external_message_id', 100)->nullable();
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->index('campaign_creator_id', 'idx_outreach_cc');
            $table->foreign('campaign_creator_id')->references('id')->on('campaign_creators')->onDelete('cascade');
            $table->foreign('template_id')->references('id')->on('outreach_templates')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('outreach_messages');
    }
};

