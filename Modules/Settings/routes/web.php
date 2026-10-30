<?php

use Illuminate\Support\Facades\Route;
use Modules\Settings\Http\Controllers\SettingsController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('/settings/general', [SettingsController::class, 'updateGeneral'])->name('settings.general.update');
    Route::post('/settings/integrations', [SettingsController::class, 'updateIntegrations'])->name('settings.integrations.update');
    Route::post('/settings/users', [SettingsController::class, 'createUser'])->name('settings.users.store');
    Route::put('/settings/users/{id}/role', [SettingsController::class, 'updateUserRole'])->name('settings.users.role.update');
});
