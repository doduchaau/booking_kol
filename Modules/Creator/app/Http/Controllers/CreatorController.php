<?php

namespace Modules\Creator\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Creator\Enums\CreatorTierEnum;
use Modules\Creator\Enums\PlatformEnum;
use Modules\Creator\Http\Requests\ImportCreatorRequest;
use Modules\Creator\Http\Requests\StoreCreatorRequest;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Modules\Creator\Services\CreatorDeduplicationService;
use Modules\Creator\Services\CreatorImportService;
use Modules\Creator\Services\CreatorNormalizationService;

class CreatorController extends Controller
{
    /**
     * Danh sách Creator (hỗ trợ tìm kiếm, lọc, phân trang)
     */
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'tier', 'niche', 'blacklist']);

        $creators = Creator::query()
            ->with(['accounts'])
            ->filter($filters)
            ->whereNull('merged_into_creator_id')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        // Lấy danh sách niche hiện có để hiển thị bộ lọc
        $availableNiches = Creator::query()
            ->select('niche')
            ->distinct()
            ->whereNotNull('niche')
            ->pluck('niche');

        return Inertia::render('Creator/Index', [
            'creators' => $creators,
            'filters' => $filters,
            'availableNiches' => $availableNiches,
            'tiers' => array_map(fn ($tier) => [
                'value' => $tier->value,
                'label' => $tier->label(),
            ], CreatorTierEnum::cases()),
        ]);
    }

    /**
     * Màn hình thêm mới Creator
     */
    public function create(): Response
    {
        return Inertia::render('Creator/Create', [
            'platforms' => array_map(fn ($p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ], PlatformEnum::cases()),
            'tiers' => array_map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ], CreatorTierEnum::cases()),
        ]);
    }

    /**
     * Lưu thông tin Creator mới
     */
    public function store(StoreCreatorRequest $request, CreatorDeduplicationService $dedupService): RedirectResponse
    {
        $validated = $request->validated();
        $normalizedPhone = CreatorNormalizationService::normalizePhone($validated['phone'] ?? null);

        // Kiểm tra trùng
        $duplicate = $dedupService->findExistingMatch(
            phone: $normalizedPhone,
            email: $validated['email'] ?? null
        );

        if ($duplicate) {
            return back()->withErrors([
                'phone' => "Hồ sơ Creator này đã tồn tại trong hệ thống (ID #{$duplicate->id}: {$duplicate->name}). Vui lòng kiểm tra lại.",
            ]);
        }

        $tier = !empty($validated['tier'])
            ? CreatorTierEnum::from($validated['tier'])
            : CreatorTierEnum::NANO;

        $creator = Creator::create([
            'name' => $validated['name'],
            'phone' => $normalizedPhone,
            'email' => $validated['email'] ?? null,
            'shipping_address' => $validated['shipping_address'] ?? null,
            'city_province' => $validated['city_province'] ?? null,
            'district' => $validated['district'] ?? null,
            'niche' => $validated['niche'],
            'tier' => $tier,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        // Lưu tài khoản social nếu có
        if (!empty($validated['accounts'])) {
            foreach ($validated['accounts'] as $acc) {
                if (!empty($acc['handle'])) {
                    $handle = CreatorNormalizationService::normalizeHandle($acc['handle']);
                    $platform = $acc['platform'];
                    CreatorAccount::create([
                        'creator_id' => $creator->id,
                        'platform' => $platform,
                        'handle' => $handle,
                        'url' => $acc['url'] ?? "https://{$platform}.com/@{$handle}",
                        'followers_count' => (int) ($acc['followers_count'] ?? 0),
                    ]);
                }
            }
        }

        return redirect()->route('creators.index')->with('success', "Đã tạo hồ sơ Creator {$creator->name} thành công.");
    }

    /**
     * Chi tiết hồ sơ Creator
     */
    public function show(int $id): Response
    {
        $creator = Creator::with(['accounts', 'rateCards', 'mergedProfiles'])
            ->findOrFail($id);

        return Inertia::render('Creator/Show', [
            'creator' => $creator,
        ]);
    }

    /**
     * Màn hình giao diện Import Excel / CSV
     */
    public function importView(): Response
    {
        return Inertia::render('Creator/Import');
    }

    /**
     * Phân tích nhanh file tải lên để hiển thị Live Preview và Schema Mapping
     */
    public function analyzeImport(Request $request, CreatorImportService $importService): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:20480'],
        ], [
            'file.required' => 'Vui lòng chọn file dữ liệu để phân tích.',
            'file.mimes' => 'Định dạng file không hợp lệ. Vui lòng chọn .xlsx, .xls hoặc .csv.',
            'file.max' => 'Dung lượng file tối đa là 20MB.',
        ]);

        try {
            $analysis = $importService->analyzeFile($request->file('file'));
            return response()->json([
                'success' => true,
                'data' => $analysis,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể phân tích cấu trúc file: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Chốt nhập file dữ liệu với cấu hình mapping đã duyệt
     */
    public function confirmImport(ImportCreatorRequest $request, CreatorImportService $importService): mixed
    {
        $format = $request->input('format', 'auto');
        $customMapping = $request->input('custom_mapping', []);
        $autoEnrich = $request->boolean('auto_enrich', true);

        $result = $importService->importFile(
            file: $request->file('file'),
            user: $request->user(),
            format: $format,
            customMapping: $customMapping,
            autoEnrich: $autoEnrich
        );

        $connectorName = match ($result['connector'] ?? '') {
            'KalodataExportConnector' => 'Kalodata (TikTok Analytics)',
            'FastMossExportConnector' => 'FastMoss (TikTok Analytics)',
            default => 'Smart Schema Import',
        };

        $message = "Đã xử lý xong ({$connectorName}): Thêm mới {$result['imported']} Creator, Cập nhật {$result['updated']} hồ sơ.";
        if (($result['enriched'] ?? 0) > 0) {
            $message .= " Đã kích hoạt làm giàu dữ liệu tự động cho {$result['enriched']} kênh.";
        }
        if ($result['skipped'] > 0) {
            $message .= " Bỏ qua {$result['skipped']} dòng.";
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'result' => $result,
            ]);
        }

        return redirect()->route('creators.index')
            ->with('success', $message)
            ->with('import_errors', $result['errors']);
    }

    /**
     * Xử lý file import tải lên (nhập nhanh 1 chạm)
     */
    public function import(ImportCreatorRequest $request, CreatorImportService $importService): RedirectResponse
    {
        $format = $request->input('format', 'auto');
        $customMapping = $request->input('custom_mapping', []);
        $autoEnrich = $request->boolean('auto_enrich', true);

        $result = $importService->importFile(
            file: $request->file('file'),
            user: $request->user(),
            format: $format,
            customMapping: $customMapping,
            autoEnrich: $autoEnrich
        );

        $connectorName = match ($result['connector'] ?? '') {
            'KalodataExportConnector' => 'Kalodata (TikTok Analytics)',
            'FastMossExportConnector' => 'FastMoss (TikTok Analytics)',
            default => 'Smart Schema Import',
        };

        $message = "Đã xử lý xong (Nguồn: {$connectorName}): Thêm mới {$result['imported']} Creator, Cập nhật {$result['updated']} hồ sơ.";
        if (($result['enriched'] ?? 0) > 0) {
            $message .= " Đã kích hoạt làm giàu dữ liệu tự động cho {$result['enriched']} kênh.";
        }
        if ($result['skipped'] > 0) {
            $message .= " Bỏ qua {$result['skipped']} dòng.";
        }

        return redirect()->route('creators.index')
            ->with('success', $message)
            ->with('import_errors', $result['errors']);
    }

    /**
     * Tiếp nhận danh sách batch URLs và đẩy vào Queue đồng bộ tự động
     */
    public function importBatchUrls(Request $request): RedirectResponse
    {
        $request->validate([
            'urls' => ['required', 'string'],
        ]);

        $batchText = $request->input('urls');
        $parsedItems = \Modules\Creator\Services\UrlNormalizer::parseBatch($batchText);

        $validItems = array_filter($parsedItems, fn ($item) => $item['is_valid']);
        $invalidItems = array_filter($parsedItems, fn ($item) => !$item['is_valid']);

        if (empty($validItems)) {
            return back()->withErrors(['urls' => 'Không tìm thấy liên kết mạng xã hội hợp lệ nào trong nội dung đã dán.']);
        }

        $dispatched = 0;
        $failedItems = [];
        $isImmediate = count($validItems) <= 5;

        foreach (array_values($validItems) as $index => $item) {
            $platform = PlatformEnum::tryFrom($item['platform']);
            if ($platform) {
                if ($isImmediate) {
                    try {
                        // Nếu <= 5 link, thực thi trực tiếp để hiện kết quả ngay lập tức
                        \Modules\Creator\Jobs\SyncCreatorMetricsJob::dispatchSync(
                            $item['handle'],
                            $platform
                        );
                        $dispatched++;
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::channel('kol_sync')->warning("Không thể đồng bộ nhanh link @{$item['handle']}: " . $e->getMessage());
                        $failedItems[] = "@{$item['handle']}";
                    }
                } else {
                    // Mẻ lớn thì đẩy vào hàng đợi dãn cách tải
                    \Modules\Creator\Jobs\SyncCreatorMetricsJob::dispatch(
                        $item['handle'],
                        $platform
                    )->delay(now()->addMilliseconds($index * 150));
                    $dispatched++;
                }
            }
        }

        if ($dispatched === 0 && !empty($failedItems)) {
            return back()->withErrors(['urls' => 'Không thể đồng bộ dữ liệu cho các kênh: ' . implode(', ', $failedItems) . '. Vui lòng kiểm tra lại liên kết hoặc API provider.']);
        }

        $message = $isImmediate
            ? "Đã đồng bộ và thêm thành công {$dispatched} Creator vào hệ thống."
            : "Đã tiếp nhận thành công {$dispatched} liên kết mạng xã hội và đẩy vào hàng đợi xử lý ngầm.";

        if (!empty($failedItems)) {
            $message .= " (" . count($failedItems) . " kênh không tải được: " . implode(', ', $failedItems) . ").";
        }

        if (count($invalidItems) > 0) {
            $message .= " (" . count($invalidItems) . " liên kết không hợp lệ bị bỏ qua).";
        }

        return redirect()->route('creators.index')->with('success', $message);
    }

    /**
     * Kích hoạt làm mới số liệu tức thì cho một tài khoản mạng xã hội
     */
    public function syncAccount(int $id, int $accountId): RedirectResponse
    {
        $account = CreatorAccount::where('creator_id', $id)->findOrFail($accountId);

        \Modules\Creator\Jobs\SyncCreatorMetricsJob::dispatchSync(
            $account->handle,
            $account->platform,
            $id,
            true // forceRefresh
        );

        return back()->with('success', "Đã làm mới số liệu thành công cho @{$account->handle}.");
    }

    /**
     * Màn hình Khám phá & Tự động tìm kiếm KOL theo Từ khóa / Ngành hàng
     */
    public function discoveryView(Request $request, \Modules\Creator\Services\KolDiscoveryService $discoveryService): Response
    {
        $filters = [
            'keyword' => $request->input('keyword', ''),
            'niche' => $request->input('niche', 'general'),
            'platform' => $request->input('platform', 'tiktok'),
            'tier' => $request->input('tier', 'all'),
            'limit' => (int) $request->input('limit', 12),
        ];

        $results = $discoveryService->search($filters);

        return Inertia::render('Creator/Discovery', [
            'filters' => $filters,
            'results' => $results,
        ]);
    }

    /**
     * Nhập hàng loạt KOL từ kết quả Discovery vào CRM
     */
    public function importDiscovered(Request $request, \Modules\Creator\Services\KolDiscoveryService $discoveryService): RedirectResponse
    {
        $request->validate([
            'selected' => ['required', 'array', 'min:1'],
            'selected.*.handle' => ['required', 'string'],
            'selected.*.platform' => ['required', 'string'],
        ]);

        $selected = $request->input('selected');
        $importedCount = $discoveryService->importSelected($selected);

        return redirect()->route('creators.index')->with('success', "Đã nạp thành công {$importedCount} KOL vào hệ thống CRM.");
    }

    /**
     * Gộp 2 hồ sơ trùng
     */
    public function merge(Request $request, CreatorDeduplicationService $dedupService): RedirectResponse
    {
        $request->validate([
            'master_id' => ['required', 'exists:creators,id'],
            'duplicate_id' => ['required', 'exists:creators,id', 'different:master_id'],
        ]);

        $master = Creator::findOrFail($request->input('master_id'));
        $duplicate = Creator::findOrFail($request->input('duplicate_id'));

        $dedupService->mergeProfiles($master, $duplicate, $request->user());

        return back()->with('success', "Đã gộp hồ sơ #{$duplicate->id} ({$duplicate->name}) vào hồ sơ gốc #{$master->id} ({$master->name}) thành công.");
    }

    /**
     * Xóa hồ sơ Creator (Soft delete)
     */
    public function destroy(int $id): RedirectResponse
    {
        $creator = Creator::findOrFail($id);
        $name = $creator->name;
        $creator->delete();

        return redirect()->route('creators.index')->with('success', "Đã xóa hồ sơ Creator {$name}.");
    }
}
