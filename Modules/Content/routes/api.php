<?php

use Illuminate\Support\Facades\Route;
use Modules\Content\Http\Controllers\ContentController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('contents', ContentController::class)->names('content');
});
