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
        Schema::create('group_invites', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_creator_id');
            $table->string('group_name', 150)->comment('Tên nhóm Zalo/trao đổi');
            $table->string('group_link', 255)->nullable()->comment('Đường link tham gia nhóm');
            $table->enum('status', ['pending', 'invited', 'joined', 'failed'])->default('pending');
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->foreign('campaign_creator_id')->references('id')->on('campaign_creators')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_invites');
    }
};

