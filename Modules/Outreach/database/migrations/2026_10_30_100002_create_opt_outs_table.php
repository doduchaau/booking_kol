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
        Schema::create('opt_outs', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->nullable()->unique('uk_optout_phone');
            $table->string('email', 150)->nullable();
            $table->string('reason', 255)->nullable()->comment('Lý do từ chối nhận tin');
            $table->string('channel', 50)->default('all');
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamps();

            $table->index('email', 'idx_optout_email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opt_outs');
    }
};

