<?php

use Illuminate\Support\Facades\Route;
use Modules\Campaign\Http\Controllers\CampaignController;
use Modules\Campaign\Http\Controllers\PipelineController;
use Modules\Campaign\Http\Controllers\WorkspaceController;

Route::middleware(['auth', 'verified'])->group(function () {
    // Bàn làm việc cá nhân của Nhân viên Booking (My Workspace / To-Do)
    Route::get('/workspace', [WorkspaceController::class, 'index'])->name('workspace.index');

    // Quản lý chiến dịch
    Route::get('/campaigns', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::get('/campaigns/create', [CampaignController::class, 'create'])->name('campaigns.create');
    Route::post('/campaigns', [CampaignController::class, 'store'])->name('campaigns.store');
    Route::get('/campaigns/{id}', [CampaignController::class, 'show'])->name('campaigns.show');
    Route::get('/campaigns/{id}/edit', [CampaignController::class, 'edit'])->name('campaigns.edit');
    Route::match(['put', 'post'], '/campaigns/{id}', [CampaignController::class, 'update'])->name('campaigns.update');
    Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy'])->name('campaigns.destroy');

    // Quản lý Creator trong chiến dịch
    Route::post('/campaigns/{id}/creators', [CampaignController::class, 'addCreators'])->name('campaigns.creators.add');
    Route::get('/campaigns/{id}/creators/import-template', [CampaignController::class, 'downloadCreatorImportTemplate'])->name('campaigns.creators.import-template');
    Route::post('/campaigns/{id}/creators/import-preview', [CampaignController::class, 'previewCreatorImport'])->name('campaigns.creators.import-preview');
    Route::post('/campaigns/{id}/creators/import-confirm', [CampaignController::class, 'confirmCreatorImport'])->name('campaigns.creators.import-confirm');
    Route::delete('/campaigns/{id}/creators/{pivotId}', [CampaignController::class, 'removeCreator'])->name('campaigns.creators.remove');
    Route::post('/campaigns/{id}/creators/bulk-status', [PipelineController::class, 'bulkUpdateStatus'])->name('campaigns.creators.bulk-status');
    Route::post('/campaigns/{id}/creators/bulk-assign', [PipelineController::class, 'bulkAssignStaff'])->name('campaigns.creators.bulk-assign');
    Route::post('/campaigns/{id}/creators/bulk-remove', [CampaignController::class, 'bulkRemoveCreators'])->name('campaigns.creators.bulk-remove');
    Route::patch('/campaigns/{id}/creators/{pivotId}/quick-update', [PipelineController::class, 'quickUpdate'])->name('campaigns.creators.quick-update');
    Route::post('/campaigns/{id}/creators/{pivotId}/shipments', [CampaignController::class, 'addShipment'])->name('campaigns.creators.shipments.store');
    Route::put('/campaigns/{id}/creators/{pivotId}/shipments/{logId}', [CampaignController::class, 'updateShipmentLog'])->name('campaigns.creators.shipments.update');
    Route::delete('/campaigns/{id}/creators/{pivotId}/shipments/{logId}', [CampaignController::class, 'destroyShipmentLog'])->name('campaigns.creators.shipments.destroy');
    Route::post('/campaigns/{id}/creators/{pivotId}/videos', [CampaignController::class, 'addVideo'])->name('campaigns.creators.videos.store');
    Route::post('/campaigns/{id}/creators/{pivotId}/portal/extend', [CampaignController::class, 'extendPortalToken'])->name('campaigns.creators.portal.extend');
    Route::post('/campaigns/{id}/creators/{pivotId}/portal/regenerate', [CampaignController::class, 'regeneratePortalToken'])->name('campaigns.creators.portal.regenerate');

    // Bảng Kanban Pipeline
    Route::get('/pipeline', [PipelineController::class, 'general'])->name('pipeline.general');
    Route::get('/campaigns/{id}/pipeline', [PipelineController::class, 'index'])->name('pipeline.index');
    Route::patch('/pipeline/{id}/status', [PipelineController::class, 'updateStatus'])->name('pipeline.status.update');
    Route::patch('/pipeline/{id}/assign', [PipelineController::class, 'assignStaff'])->name('pipeline.assign');
    Route::patch('/pipeline/{id}/confirm-cast-approved', [PipelineController::class, 'confirmCastApproved'])->name('pipeline.cast.confirm');
    Route::patch('/pipeline/{id}/reopen-deal', [PipelineController::class, 'reopenDeal'])->name('pipeline.cast.reopen');
});
