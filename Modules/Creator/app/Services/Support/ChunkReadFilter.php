<?php

namespace Modules\Creator\Services\Support;

use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;

class ChunkReadFilter implements IReadFilter
{
    protected int $startRow = 1;
    protected int $endRow = 500;

    public function setRows(int $startRow, int $chunkSize): void
    {
        $this->startRow = $startRow;
        $this->endRow = $startRow + $chunkSize - 1;
    }

    /**
     * @param string $columnAddress
     * @param int $row
     * @param string $worksheetName
     */
    public function readCell($columnAddress, $row, $worksheetName = ''): bool
    {
        return $row >= $this->startRow && $row <= $this->endRow;
    }
}

