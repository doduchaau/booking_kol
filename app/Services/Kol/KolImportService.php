<?php

declare(strict_types=1);

namespace App\Services\Kol;

use Modules\Creator\Services\CreatorImportService;

/**
 * Class KolImportService
 * Service import và upsert dữ liệu KOL / Creator
 */
class KolImportService extends CreatorImportService
{
    // Kế thừa toàn bộ logic upsertSyncedCreator, deduplication, transaction
}

