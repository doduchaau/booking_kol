<?php

use Illuminate\Support\Facades\Route;
use Modules\Outreach\Http\Controllers\OutreachController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('outreaches', OutreachController::class)->names('outreach');
});
