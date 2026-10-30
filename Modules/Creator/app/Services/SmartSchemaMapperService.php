<?php

namespace Modules\Creator\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmartSchemaMapperService
{
    /**
     * Từ điển trường chuẩn và các từ đồng nghĩa (tiếng Việt không dấu & tiếng Anh)
     */
    protected array $dictionary = [
        'name' => [
            'name', 'ten', 'ho va ten', 'ho ten', 'ten creator', 'ten koc', 'ten kol',
            'creator', 'koc', 'kol', 'influencer', 'full name', 'fullname', 'blogger',
            'nick name', 'nickname', 'creator name', 'kol name', 'koc name', 'ho va ten koc',
        ],
        'phone' => [
            'phone', 'so dien thoai', 'sdt', 'dien thoai', 'tel', 'mobile', 'contact',
            'zalo', 'phone number', 'contact phone', 'hotline', 'sdt zalo', 'so zalo',
        ],
        'email' => [
            'email', 'thu dien tu', 'mail', 'email lien he', 'contact email', 'e-mail',
        ],
        'handle' => [
            'handle', 'username', 'tai khoan', 'kenh', 'id kenh', 'tiktok id',
            'channel', 'user', 'unique id', 'id', 'account', 'tiktok handle',
            'ten tai khoan', 'id tiktok', 'channel id', 'blogger id',
        ],
        'profile_url' => [
            'url', 'link', 'duong dan', 'link kenh', 'link profile', 'profile url',
            'link tiktok', 'link facebook', 'link youtube', 'channel url', 'link bai viet',
            'tiktok link', 'fb link', 'trang ca nhan', 'link trang ca nhan',
        ],
        'platform' => [
            'platform', 'nen tang', 'mang xa hoi', 'kenh mxh', 'social', 'social platform',
        ],
        'followers_count' => [
            'followers', 'follower', 'followers count', 'nguoi theo doi', 'luot theo doi',
            'fans', 'subscribers', 'sub', 'fan count', 'follow', 'luong follow',
        ],
        'average_views' => [
            'average views', 'avg views', 'views', 'luot xem trung binh', 'view trung binh',
            'median views', 'video views', 'luot xem', 'view', 'avg view',
        ],
        'engagement_rate' => [
            'engagement rate', 'er', 'ty le tuong tac', 'tuong tac', 'interaction rate',
            'eng rate', 'engagement', 'ty le er', 'interaction',
        ],
        'rate_price' => [
            'rate price', 'gia', 'bao gia', 'chi phi', 'gia video', 'price', 'rate',
            'cost', 'gia booking', 'chi phi booking', 'don gia', 'price video',
            'gia tien', 'tien booking',
        ],
        'gmv_estimate' => [
            'gmv estimate', 'gmv', 'doanh so', 'doanh thu', 'revenue', 'total sales',
            'sales', 'doanh so 30 ngay', 'gmv 30d',
        ],
        'niche' => [
            'niche', 'nganh hang', 'linh vuc', 'chu de', 'category', 'primary category',
            'industry', 'main category', 'nganh', 'the loai',
        ],
        'tier' => [
            'tier', 'phan hang', 'hang', 'level', 'hang koc', 'koc tier',
        ],
        'shipping_address' => [
            'shipping address', 'dia chi', 'dia chi nhan hang', 'address', 'dia chi giao',
            'dia chi cu the', 'noi nhan hang',
        ],
        'city_province' => [
            'city province', 'tinh', 'thanh pho', 'tinh thanh pho', 'tinh thanh',
            'city', 'province',
        ],
        'district' => [
            'district', 'quan', 'huyen', 'quan huyen',
        ],
        'notes' => [
            'notes', 'ghi chu', 'luu y', 'note', 'comment', 'danh gia', 'feedback', 'nhan xet',
        ],
    ];

    /**
     * Các trường mở rộng / phụ gom vào extra_attributes
     */
    protected array $extraFieldsDictionary = [
        'extra_price_livestream' => ['gia livestream', 'live stream', 'gia live', 'price live', 'livestream'],
        'extra_price_post' => ['gia post', 'gia bai viet', 'post price', 'gia hinh anh', 'gia reel'],
        'extra_bio' => ['bio', 'tieu su', 'mo ta', 'description'],
        'extra_fan_male_ratio' => ['ty le nam', 'male ratio', 'nam'],
        'extra_fan_female_ratio' => ['ty le nu', 'female ratio', 'nu'],
    ];

    /**
     * Nhận diện toàn diện Schema từ mảng các dòng dữ liệu thô
     * 
     * @param array $rawRows Các dòng thô đọc từ file Excel/CSV
     * @return array [
     *    'header_row_index' => int,
     *    'headers' => array,
     *    'mappings' => array, // [original_column => ['field' => string, 'confidence' => int, 'source' => string]]
     *    'extra_columns' => array,
     *    'unmapped_columns' => array,
     * ]
     */
    public function detectSchema(array $rawRows): array
    {
        if (empty($rawRows)) {
            return [
                'header_row_index' => 0,
                'headers' => [],
                'mappings' => [],
                'extra_columns' => [],
                'unmapped_columns' => [],
            ];
        }

        // Bước 0: Header Row Locator (quét 10 dòng đầu tìm dòng tiêu đề)
        $headerRowIndex = $this->locateHeaderRow($rawRows);
        $rawHeaders = $rawRows[$headerRowIndex] ?? [];

        // Làm sạch danh sách tên cột
        $headers = [];
        foreach ($rawHeaders as $idx => $val) {
            $colName = trim((string) $val);
            if ($colName !== '') {
                $headers[$idx] = $colName;
            }
        }

        // Lấy 5 dòng dữ liệu mẫu sau dòng header để phục vụ Sniffing
        $sampleRows = [];
        $dataStartIndex = $headerRowIndex + 1;
        $rowCount = count($rawRows);
        for ($i = $dataStartIndex; $i < $rowCount && count($sampleRows) < 5; $i++) {
            $candidateRow = $rawRows[$i] ?? [];
            if (!empty(array_filter($candidateRow, fn ($c) => trim((string) $c) !== ''))) {
                $sampleRows[] = $candidateRow;
            }
        }

        $mappings = [];
        $extraColumns = [];
        $unmappedColumns = [];
        $mappedFields = [];

        // Tầng 1: So khớp từ điển & Fuzzy Matching
        foreach ($headers as $colIdx => $colName) {
            $matched = $this->matchHeaderWithDictionary($colName);
            if ($matched) {
                $field = $matched['field'];
                // Nếu trường chính này chưa có cột nào map, hoặc cột mới có điểm cao hơn
                if (!isset($mappedFields[$field]) || $matched['confidence'] > ($mappings[$mappedFields[$field]]['confidence'] ?? 0)) {
                    // Nếu trường đã bị map trước đó, đẩy trường cũ sang unmapped để xem xét lại
                    if (isset($mappedFields[$field])) {
                        $oldCol = $mappedFields[$field];
                        unset($mappings[$oldCol]);
                        $unmappedColumns[$oldCol] = $headers[$oldCol];
                    }
                    $mappings[$colIdx] = [
                        'field' => $field,
                        'confidence' => $matched['confidence'],
                        'source' => 'dictionary_fuzzy',
                        'column_name' => $colName,
                    ];
                    $mappedFields[$field] = $colIdx;
                    continue;
                }
            }

            // Kiểm tra xem có phải cột phụ gom vào extra_attributes không (VD: Giá livestream)
            $extraMatched = $this->matchHeaderWithExtraDictionary($colName);
            if ($extraMatched) {
                $extraColumns[$colIdx] = [
                    'attribute_key' => $extraMatched['key'],
                    'column_name' => $colName,
                ];
                continue;
            }

            $unmappedColumns[$colIdx] = $colName;
        }

        // Tầng 2: Regex Value Sniffing cho các cột chưa map
        if (!empty($unmappedColumns) && !empty($sampleRows)) {
            $stillUnmapped = [];
            foreach ($unmappedColumns as $colIdx => $colName) {
                $sampleValues = [];
                foreach ($sampleRows as $row) {
                    if (isset($row[$colIdx]) && trim((string) $row[$colIdx]) !== '') {
                        $sampleValues[] = trim((string) $row[$colIdx]);
                    }
                }

                $sniffed = $this->sniffValues($sampleValues, $mappedFields);
                if ($sniffed) {
                    $field = $sniffed['field'];
                    $mappings[$colIdx] = [
                        'field' => $field,
                        'confidence' => $sniffed['confidence'],
                        'source' => 'regex_sniffing',
                        'column_name' => $colName,
                    ];
                    $mappedFields[$field] = $colIdx;
                } else {
                    $stillUnmapped[$colIdx] = $colName;
                }
            }
            $unmappedColumns = $stillUnmapped;
        }

        // Tầng 3: AI Schema Mapper Fallback (Groq / OpenAI API) nếu còn cột và có API Key
        if (!empty($unmappedColumns) && (env('GROQ_API_KEY') || env('OPENAI_API_KEY'))) {
            $aiMappings = $this->fallbackAiMapper($unmappedColumns, $sampleRows, array_keys($this->dictionary), $mappedFields);
            foreach ($aiMappings as $colIdx => $aiRes) {
                if (isset($unmappedColumns[$colIdx]) && !empty($aiRes['field'])) {
                    $mappings[$colIdx] = [
                        'field' => $aiRes['field'],
                        'confidence' => $aiRes['confidence'] ?? 75,
                        'source' => 'ai_fallback',
                        'column_name' => $unmappedColumns[$colIdx],
                    ];
                    $mappedFields[$aiRes['field']] = $colIdx;
                    unset($unmappedColumns[$colIdx]);
                }
            }
        }

        return [
            'header_row_index' => $headerRowIndex,
            'headers' => $headers,
            'mappings' => $mappings,
            'extra_columns' => $extraColumns,
            'unmapped_columns' => $unmappedColumns,
        ];
    }

    /**
     * Bước 0: Quét 10 dòng đầu để dò tìm dòng tiêu đề thật (Header Row Locator)
     */
    public function locateHeaderRow(array $rows): int
    {
        $bestRowIndex = 0;
        $maxMatches = 0;
        $limit = min(count($rows), 10);

        for ($i = 0; $i < $limit; $i++) {
            $row = $rows[$i] ?? [];
            if (empty(array_filter($row, fn ($cell) => trim((string) $cell) !== ''))) {
                continue;
            }

            $matches = 0;
            foreach ($row as $cell) {
                $cellStr = trim((string) $cell);
                if (empty($cellStr) || strlen($cellStr) > 50) {
                    continue;
                }

                $cleanText = CreatorNormalizationService::removeVietnameseAccents($cellStr);
                $cleanText = preg_replace('/[^a-z0-9 ]/i', '', $cleanText);

                foreach ($this->dictionary as $keywords) {
                    foreach ($keywords as $kw) {
                        if ($cleanText === $kw || str_contains($cleanText, $kw)) {
                            $matches++;
                            break;
                        }
                    }
                }
            }

            // Dòng có số lượng ô khớp nhiều nhất (tối thiểu >= 2 ô khớp)
            if ($matches >= 2 && $matches > $maxMatches) {
                $maxMatches = $matches;
                $bestRowIndex = $i;
            }
        }

        return $bestRowIndex;
    }

    /**
     * Tầng 1: So khớp một tên cột với từ điển bằng Exact Match, Contains (Word Boundary) và Fuzzy Similar Text
     */
    public function matchHeaderWithDictionary(string $columnName): ?array
    {
        $clean = CreatorNormalizationService::removeVietnameseAccents(trim($columnName));
        $clean = strtolower(preg_replace('/[^a-z0-9 ]/i', ' ', $clean));
        $clean = trim(preg_replace('/\s+/', ' ', $clean));
        $cleanNoSpace = str_replace(' ', '', $clean);

        if (empty($clean)) {
            return null;
        }

        $bestField = null;
        $highestScore = 0;

        foreach ($this->dictionary as $field => $synonyms) {
            foreach ($synonyms as $synonym) {
                $synClean = trim($synonym);
                $synNoSpace = str_replace(' ', '', $synClean);
                $synLen = strlen($synClean);

                // 1. So khớp chính xác 100%
                if ($clean === $synClean || $cleanNoSpace === $synNoSpace) {
                    return [
                        'field' => $field,
                        'confidence' => 100,
                    ];
                }

                // 2. Chứa cụm từ:
                // Nếu synonym ngắn (< 4 ký tự như 'id', 'er', 'sub'), bắt buộc phải là từ đứng độc lập (word boundary)
                $isMatched = false;
                if ($synLen < 4) {
                    if (preg_match('/(^|\s)' . preg_quote($synClean, '/') . '(\s|$)/i', $clean)) {
                        $isMatched = true;
                    }
                } else {
                    if (str_contains($clean, $synClean) || str_contains($cleanNoSpace, $synNoSpace)) {
                        $isMatched = true;
                    }
                }

                if ($isMatched) {
                    // Cụm từ dài hơn thì điểm độ tin cậy càng cao (tránh việc 'id' đè lên 'bao gia video')
                    $score = 80 + min(18, $synLen * 2);
                    if ($score > $highestScore) {
                        $highestScore = $score;
                        $bestField = $field;
                    }
                    continue;
                }

                // 3. Fuzzy matching: similar_text (chỉ áp dụng khi độ dài từ khóa >= 4)
                if ($synLen >= 4 && strlen($clean) >= 4) {
                    similar_text($cleanNoSpace, $synNoSpace, $percent);
                    if ($percent >= 80 && (int) round($percent) > $highestScore) {
                        $highestScore = (int) round($percent);
                        $bestField = $field;
                    }
                }
            }
        }

        if ($bestField && $highestScore >= 80) {
            return [
                'field' => $bestField,
                'confidence' => min($highestScore, 98),
            ];
        }

        return null;
    }

    /**
     * So khớp các cột giá hoặc thông tin phụ gom vào extra_attributes
     */
    protected function matchHeaderWithExtraDictionary(string $columnName): ?array
    {
        $clean = CreatorNormalizationService::removeVietnameseAccents(trim($columnName));
        $clean = strtolower(preg_replace('/[^a-z0-9 ]/i', '', $clean));

        foreach ($this->extraFieldsDictionary as $key => $synonyms) {
            foreach ($synonyms as $synonym) {
                if ($clean === $synonym || str_contains($clean, $synonym)) {
                    return ['key' => $key];
                }
            }
        }

        return null;
    }

    /**
     * Tầng 2: Soi mẫu giá trị thực tế (Regex Value Sniffing)
     * Lấy mẫu 5 dòng dữ liệu đầu tiên không rỗng để xác định kiểu trường
     */
    public function sniffValues(array $sampleValues, array $alreadyMappedFields): ?array
    {
        if (empty($sampleValues)) {
            return null;
        }

        $urlMatches = 0;
        $emailMatches = 0;
        $phoneMatches = 0;
        $handleMatches = 0;
        $totalSamples = count($sampleValues);

        foreach ($sampleValues as $val) {
            $val = trim((string) $val);

            // Kiểm tra URL mạng xã hội
            if (preg_match('/(tiktok\.com|facebook\.com|youtube\.com|instagram\.com|shopee\.vn|vt\.tiktok\.com)/i', $val)) {
                $urlMatches++;
            }

            // Kiểm tra Email chuẩn
            if (preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $val)) {
                $emailMatches++;
            }

            // Kiểm tra Số điện thoại Việt Nam (9-11 số)
            $cleanPhone = preg_replace('/[^\d]/', '', $val);
            if (preg_match('/^(0|84|\+84)?[35789]\d{8}$/', $cleanPhone) || (strlen($cleanPhone) === 9 && in_array($cleanPhone[0], ['3', '5', '7', '8', '9'], true))) {
                $phoneMatches++;
            }

            // Kiểm tra @handle (bắt đầu bằng @ hoặc chuỗi ký tự chữ số liền không dấu)
            if (preg_match('/^@[a-zA-Z0-9._-]+$/', $val) || (preg_match('/^[a-zA-Z0-9._-]{3,30}$/', $val) && !is_numeric($val))) {
                $handleMatches++;
            }
        }

        // Đánh giá tỷ lệ xuất hiện (>= 50% số dòng mẫu khớp)
        $threshold = max(1, (int) ceil($totalSamples * 0.5));

        if ($urlMatches >= $threshold && !isset($alreadyMappedFields['profile_url'])) {
            return ['field' => 'profile_url', 'confidence' => 95];
        }

        if ($emailMatches >= $threshold && !isset($alreadyMappedFields['email'])) {
            return ['field' => 'email', 'confidence' => 95];
        }

        if ($phoneMatches >= $threshold && !isset($alreadyMappedFields['phone'])) {
            return ['field' => 'phone', 'confidence' => 90];
        }

        if ($handleMatches >= $threshold && !isset($alreadyMappedFields['handle'])) {
            return ['field' => 'handle', 'confidence' => 80];
        }

        return null;
    }

    /**
     * Tầng 3: AI Schema Mapper Fallback (Groq / OpenAI API)
     */
    protected function fallbackAiMapper(array $unmappedColumns, array $sampleRows, array $allowedFields, array $alreadyMapped): array
    {
        $groqKey = env('GROQ_API_KEY');
        $openaiKey = env('OPENAI_API_KEY');

        if (!$groqKey && !$openaiKey) {
            return [];
        }

        // Chuẩn bị payload gửi AI
        $columnsPayload = [];
        foreach ($unmappedColumns as $idx => $name) {
            $samples = [];
            foreach (array_slice($sampleRows, 0, 2) as $row) {
                if (isset($row[$idx]) && trim((string) $row[$idx]) !== '') {
                    $samples[] = substr(trim((string) $row[$idx]), 0, 50);
                }
            }
            $columnsPayload[] = [
                'column_index' => $idx,
                'column_name' => $name,
                'sample_values' => $samples,
            ];
        }

        $availableFields = array_diff($allowedFields, array_keys($alreadyMapped));
        $prompt = "Bạn là trợ lý AI chuyên trích xuất Schema bảng tính cho CRM Booking KOL/KOC. Dưới đây là danh sách cột chưa được map kèm 2 dòng dữ liệu mẫu:\n"
            . json_encode($columnsPayload, JSON_UNESCAPED_UNICODE) . "\n\n"
            . "Hãy ánh xạ từng cột vào một trong các trường sau nếu phù hợp: " . implode(', ', $availableFields) . ".\n"
            . "Nếu cột không liên quan hoặc không thể đoán chắc, hãy bỏ qua hoặc gán null.\n"
            . "Trả về định dạng JSON duy nhất dạng mảng: [{\"column_index\": int, \"field\": string|null, \"confidence\": int}]";

        try {
            if ($groqKey) {
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$groqKey}",
                    'Content-Type' => 'application/json',
                ])->timeout(5)->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => 'llama-3.1-8b-instant',
                    'messages' => [
                        ['role' => 'system', 'content' => 'You are a database schema mapper. Always return valid JSON only.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'response_format' => ['type' => 'json_object'],
                    'temperature' => 0,
                ]);
            } else {
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$openaiKey}",
                    'Content-Type' => 'application/json',
                ])->timeout(5)->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        ['role' => 'system', 'content' => 'You are a database schema mapper. Always return valid JSON only.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'response_format' => ['type' => 'json_object'],
                    'temperature' => 0,
                ]);
            }

            if ($response->successful()) {
                $json = $response->json();
                $content = $json['choices'][0]['message']['content'] ?? '';
                $parsed = json_decode($content, true);
                $items = $parsed['mappings'] ?? ($parsed['result'] ?? (is_array($parsed) ? $parsed : []));

                $results = [];
                foreach ($items as $item) {
                    if (isset($item['column_index'], $item['field']) && in_array($item['field'], $availableFields, true)) {
                        $results[$item['column_index']] = [
                            'field' => $item['field'],
                            'confidence' => $item['confidence'] ?? 75,
                        ];
                    }
                }
                return $results;
            }
        } catch (\Throwable $e) {
            Log::channel('kol_sync')->warning("Lỗi gọi AI Schema Mapper Fallback: " . $e->getMessage());
        }

        return [];
    }
}
