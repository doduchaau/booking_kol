<?php

namespace Modules\Creator\Connectors;

class ConnectorFactory
{
    /**
     * Khởi tạo Connector thích hợp dựa trên định dạng chọn trước hoặc tự động nhận diện từ Header file
     */
    public static function make(?string $format = 'auto', array $headers = []): CreatorDataConnectorInterface
    {
        $normalizedFormat = strtolower(trim($format ?? 'auto'));

        if ($normalizedFormat === 'kalodata') {
            return app(KalodataExportConnector::class);
        }

        if ($normalizedFormat === 'fastmoss') {
            return app(FastMossExportConnector::class);
        }

        if ($normalizedFormat === 'standard' || $normalizedFormat === 'excel_csv') {
            return app(ExcelCsvConnector::class);
        }

        // Tự động nhận diện (auto) dựa trên danh sách cột header
        if (!empty($headers)) {
            $headerStr = strtolower(implode(' ', $headers));

            // Dấu hiệu nhận diện FastMoss
            if (
                str_contains($headerStr, 'fastmoss') ||
                str_contains($headerStr, 'blogger') ||
                str_contains($headerStr, 'unique id') ||
                str_contains($headerStr, 'influencer') ||
                str_contains($headerStr, 'total gmv')
            ) {
                return app(FastMossExportConnector::class);
            }

            // Dấu hiệu nhận diện Kalodata
            if (
                str_contains($headerStr, 'kalodata') ||
                str_contains($headerStr, 'kol name') ||
                str_contains($headerStr, 'fans') ||
                str_contains($headerStr, 'total sales') ||
                str_contains($headerStr, 'revenue')
            ) {
                return app(KalodataExportConnector::class);
            }
        }

        // Mặc định dùng Excel/CSV chuẩn mẫu
        return app(ExcelCsvConnector::class);
    }
}
