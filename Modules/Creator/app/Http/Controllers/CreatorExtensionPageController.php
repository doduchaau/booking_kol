<?php

namespace Modules\Creator\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Creator\Models\Creator;
use Modules\Creator\Models\CreatorAccount;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class CreatorExtensionPageController extends Controller
{
    /**
     * Màn hình quản lý và hướng dẫn cài đặt Chrome Extension
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Kiểm tra xem user hiện tại đã có token extension chưa
        $existingToken = $user->tokens()
            ->where('name', 'chrome_extension')
            ->latest()
            ->first();

        // Thống kê số lượng hồ sơ đã thu thập từ extension
        $totalCollected = CreatorAccount::where('data_source', 'extension')->count();

        // Danh sách 5 Creator gần nhất thu thập từ extension
        $recentCreators = Creator::query()
            ->whereHas('accounts', fn ($q) => $q->where('data_source', 'extension'))
            ->with(['accounts'])
            ->latest('id')
            ->take(5)
            ->get();

        return Inertia::render('Creator/Extension', [
            'hasToken' => (bool) $existingToken,
            'tokenLastUsed' => $existingToken?->last_used_at?->diffForHumans(),
            'tokenCreatedAt' => $existingToken?->created_at?->format('d/m/Y H:i'),
            'newExtensionToken' => session('new_extension_token'),
            'apiUrl' => url('/api/v1/extension'),
            'totalCollected' => $totalCollected,
            'recentCreators' => $recentCreators,
        ]);
    }

    /**
     * Tạo mới hoặc làm mới API Token kết nối cho Chrome Extension
     */
    public function generateToken(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Xóa token extension cũ nếu có
        $user->tokens()->where('name', 'chrome_extension')->delete();

        // Tạo token mới
        $token = $user->createToken('chrome_extension');

        return redirect()->route('creators.extension.index')
            ->with('new_extension_token', $token->plainTextToken)
            ->with('success', 'Đã tạo mã API Token kết nối tiện ích thành công. Hãy sao chép và dán vào tiện ích Chrome!');
    }

    /**
     * Thu hồi Token kết nối
     */
    public function revokeToken(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->tokens()->where('name', 'chrome_extension')->delete();

        return redirect()->route('creators.extension.index')
            ->with('success', 'Đã thu hồi mã API Token của tiện ích Chrome.');
    }

    /**
     * Tải về file nén ZIP tiện ích Chrome Extension
     */
    public function downloadZip(): BinaryFileResponse|RedirectResponse
    {
        $extensionDir = public_path('extension');

        if (!is_dir($extensionDir)) {
            return back()->with('error', 'Thư mục extension chưa được khởi tạo.');
        }

        $zipPath = storage_path('app/booking-kol-crm-extension.zip');

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return back()->with('error', 'Không thể tạo file nén ZIP.');
        }

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($extensionDir),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($extensionDir) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }

        $zip->close();

        return response()->download($zipPath, 'booking-kol-crm-extension.zip', [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }
}
