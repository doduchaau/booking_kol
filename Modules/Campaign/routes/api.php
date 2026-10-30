<?php

use Illuminate\Support\Facades\Route;
use Modules\Campaign\Http\Controllers\CampaignController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('campaigns', CampaignController::class)->names('campaign');
});
