<?php

use Illuminate\Support\Facades\Route;
use Modules\Content\Http\Controllers\ContentController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Quản lý Nghiệm thu Video & Đồng bộ Chỉ số
    Route::get('/content', [ContentController::class, 'index'])->name('content.index');
    Route::get('/contents', [ContentController::class, 'index'])->name('contents.index');
    Route::post('/contents/sync-all', [ContentController::class, 'syncAll'])->name('content.sync_all');
    Route::post('/contents/{id}/sync', [ContentController::class, 'syncMetrics'])->name('content.sync');
    Route::patch('/contents/{id}/status', [ContentController::class, 'updateStatus'])->name('content.status');
    Route::get('/contents/{id}/history', [ContentController::class, 'metricsHistory'])->name('content.history');
});
