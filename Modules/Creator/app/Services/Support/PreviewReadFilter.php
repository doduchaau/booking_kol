<?php

namespace Modules\Creator\Services\Support;

use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;

class PreviewReadFilter implements IReadFilter
{
    public function __construct(
        protected int $maxRows = 35
    ) {}

    /**
     * @param string $columnAddress
     * @param int $row
     * @param string $worksheetName
     */
    public function readCell($columnAddress, $row, $worksheetName = ''): bool
    {
        return $row <= $this->maxRows;
    }
}

