<?php

use Illuminate\Support\Facades\Route;
use Modules\Outreach\Http\Controllers\OutreachController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Màn hình quản lý Tiếp cận Zalo (Outreach)
    Route::get('/outreach', [OutreachController::class, 'index'])->name('outreach.index');

    // Quản lý Mẫu tin nhắn
    Route::post('/outreach/templates', [OutreachController::class, 'storeTemplate'])->name('outreach.templates.store');
    Route::put('/outreach/templates/{id}', [OutreachController::class, 'updateTemplate'])->name('outreach.templates.update');
    Route::delete('/outreach/templates/{id}', [OutreachController::class, 'destroyTemplate'])->name('outreach.templates.destroy');

    // Chuẩn bị tin nhắn & deep link Zalo
    Route::post('/outreach/prepare', [OutreachController::class, 'prepareMessage'])->name('outreach.prepare');
    Route::post('/outreach/send', [OutreachController::class, 'sendMessage'])->name('outreach.send');

    // Nhắc việc 1-chạm Zalo thông minh theo ngữ cảnh
    Route::get('/outreach/quick-followup/{id}', [OutreachController::class, 'quickFollowupPreview'])->name('outreach.quick-followup.preview');
    Route::post('/outreach/quick-followup/{id}', [OutreachController::class, 'quickFollowupLog'])->name('outreach.quick-followup.log');

    // Quản lý từ chối nhận tin (Opt-out)
    Route::post('/outreach/opt-outs', [OutreachController::class, 'storeOptOut'])->name('outreach.opt-outs.store');
    Route::delete('/outreach/opt-outs/{id}', [OutreachController::class, 'destroyOptOut'])->name('outreach.opt-outs.destroy');

    // Cập nhật trạng thái mời vào nhóm Zalo
    Route::patch('/outreach/group-invites/{id}', [OutreachController::class, 'updateGroupInvite'])->name('outreach.group-invites.update');
});
