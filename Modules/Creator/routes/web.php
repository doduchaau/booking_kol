<?php

use Illuminate\Support\Facades\Route;
use Modules\Creator\Http\Controllers\CreatorController;
use Modules\Creator\Http\Controllers\CreatorExtensionPageController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Quản lý Tiện ích Chrome Extension
    Route::get('/creators/extension', [CreatorExtensionPageController::class, 'index'])->name('creators.extension.index');
    Route::post('/creators/extension/token', [CreatorExtensionPageController::class, 'generateToken'])->name('creators.extension.token.generate');
    Route::delete('/creators/extension/token', [CreatorExtensionPageController::class, 'revokeToken'])->name('creators.extension.token.revoke');
    Route::get('/creators/extension/download', [CreatorExtensionPageController::class, 'downloadZip'])->name('creators.extension.download');

    // Quản lý Creator CRM
    Route::get('/creators', [CreatorController::class, 'index'])->name('creators.index');
    Route::get('/creators/create', [CreatorController::class, 'create'])->name('creators.create');
    Route::post('/creators', [CreatorController::class, 'store'])->name('creators.store');
    Route::get('/creators/import', [CreatorController::class, 'importView'])->name('creators.import.view');
    Route::post('/creators/import', [CreatorController::class, 'import'])->name('creators.import');
    Route::post('/creators/import/analyze', [CreatorController::class, 'analyzeImport'])->name('creators.import.analyze');
    Route::post('/creators/import/confirm', [CreatorController::class, 'confirmImport'])->name('creators.import.confirm');
    Route::post('/creators/import/batch-urls', [CreatorController::class, 'importBatchUrls'])->name('creators.import.batch-urls');
    Route::get('/creators/discovery', [CreatorController::class, 'discoveryView'])->name('creators.discovery');
    Route::post('/creators/discovery/import', [CreatorController::class, 'importDiscovered'])->name('creators.discovery.import');
    Route::post('/creators/{id}/accounts/{accountId}/sync', [CreatorController::class, 'syncAccount'])->name('creators.accounts.sync');
    Route::post('/creators/merge', [CreatorController::class, 'merge'])->name('creators.merge');
    Route::get('/creators/{id}', [CreatorController::class, 'show'])->name('creators.show');
    Route::delete('/creators/{id}', [CreatorController::class, 'destroy'])->name('creators.destroy');
});
