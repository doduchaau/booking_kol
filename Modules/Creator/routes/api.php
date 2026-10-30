<?php

use Illuminate\Support\Facades\Route;
use Modules\Creator\Http\Controllers\Api\CreatorExtensionApiController;
use Modules\Creator\Http\Controllers\CreatorController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    // API dành cho Chrome Extension
    Route::prefix('extension')->group(function () {
        Route::get('/ping', [CreatorExtensionApiController::class, 'ping'])->name('creator.api.extension.ping');
        Route::get('/check', [CreatorExtensionApiController::class, 'check'])->name('creator.api.extension.check');
        Route::post('/collect', [CreatorExtensionApiController::class, 'collect'])->name('creator.api.extension.collect');
    });

    Route::apiResource('creators', CreatorController::class)->names('creator');
});
