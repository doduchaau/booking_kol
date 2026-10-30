<?php

namespace Modules\Creator\Connectors;

interface CreatorDataConnectorInterface
{
    /**
     * Chuyển đổi payload thô từ nguồn ngoài thành dữ liệu chuẩn hóa
     *
     * @param mixed $payload
     * @return array
     */
    public function parse(mixed $payload): array;

    /**
     * Kiểm tra tính hợp lệ của bản ghi trước khi lưu
     *
     * @param array $record
     * @return bool
     */
    public function validate(array $record): bool;
}
