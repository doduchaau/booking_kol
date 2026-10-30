<?php

use App\Http\Controllers\KolSyncController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('kols')->group(function () {
    Route::post('/batch-sync', [KolSyncController::class, 'batchSync'])->name('api.kols.batch_sync');
});

