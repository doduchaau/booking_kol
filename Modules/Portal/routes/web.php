<?php

use Illuminate\Support\Facades\Route;
use Modules\Portal\Http\Controllers\PortalController;

// Cổng Portal không cần đăng nhập, bảo vệ bằng Rate Limit 30 req/phút
Route::middleware(['throttle:30,1'])->group(function () {
    Route::get('/portal/{token}', [PortalController::class, 'show'])->name('portal.show');
    Route::post('/portal/{token}/address', [PortalController::class, 'updateAddress'])->name('portal.address');
    Route::post('/portal/{token}/confirm-received', [PortalController::class, 'confirmReceived'])->name('portal.confirm-received');
    Route::post('/portal/{token}/submit-video', [PortalController::class, 'submitVideo'])->name('portal.submit-video');
});
