<?php

namespace Modules\Campaign\Http\Controllers;

use App\Services\AuthHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Models\CampaignCreatorChatEvidence;

class CampaignCreatorChatEvidenceController extends Controller
{
    /**
     * Lấy danh sách bằng chứng tin nhắn đối soát của KOC
     */
    public function index(Campaign $campaign, CampaignCreator $creator): JsonResponse
    {
        $this->authorizeAccess($campaign, $creator);

        $evidences = $creator->chatEvidences()
            ->with('uploadedBy:id,name,email')
            ->latest('id')
            ->get();

        return response()->json([
            'success' => true,
            'evidences' => $evidences,
            'total_count' => $evidences->count(),
        ]);
    }

    /**
     * Tải lên nhiều ảnh/file bằng chứng nhắn tin đối soát
     */
    public function store(Request $request, Campaign $campaign, CampaignCreator $creator): RedirectResponse|JsonResponse
    {
        $this->authorizeAccess($campaign, $creator);

        $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => [
                'required',
                'file',
                'max:10240', // Tối đa 10MB/file
                'mimes:png,jpg,jpeg,webp,gif,pdf,doc,docx,xls,xlsx,txt',
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'files.required' => 'Vui lòng chọn ít nhất một file hoặc ảnh bằng chứng.',
            'files.*.max' => 'Mỗi file bằng chứng không được vượt quá 10MB.',
            'files.*.mimes' => 'Định dạng file không được hỗ trợ. Vui lòng chọn ảnh (PNG, JPG, WEBP) hoặc tài liệu (PDF, Word, Excel).',
        ]);

        $uploadedBy = auth()->id();
        $notes = $request->input('notes');
        $createdEvidences = [];

        $storageDirectory = "campaign_evidences/{$campaign->id}/{$creator->id}";

        foreach ($request->file('files') as $file) {
            $originalName = $file->getClientOriginalName();
            $mimeType = $file->getClientMimeType() ?: $file->getMimeType();
            $fileSize = $file->getSize();
            $extension = $file->getClientOriginalExtension();

            $uniqueFileName = Str::random(24) . ($extension ? '.' . strtolower($extension) : '');
            $storedPath = $file->storeAs($storageDirectory, $uniqueFileName, 'public');

            $evidence = CampaignCreatorChatEvidence::create([
                'campaign_creator_id' => $creator->id,
                'uploaded_by' => $uploadedBy,
                'file_path' => $storedPath,
                'file_name' => $originalName,
                'file_type' => $mimeType,
                'file_size' => $fileSize,
                'notes' => $notes,
            ]);

            $evidence->load('uploadedBy:id,name,email');
            $createdEvidences[] = $evidence;
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Đã tải lên ' . count($createdEvidences) . ' bằng chứng thành công.',
                'evidences' => $createdEvidences,
            ]);
        }

        return redirect()->back()->with('success', 'Đã lưu ' . count($createdEvidences) . ' bằng chứng đối soát thành công.');
    }

    /**
     * Xóa 1 file bằng chứng
     */
    public function destroy(Campaign $campaign, CampaignCreator $creator, CampaignCreatorChatEvidence $evidence): RedirectResponse|JsonResponse
    {
        $this->authorizeAccess($campaign, $creator);

        if ($evidence->campaign_creator_id !== $creator->id) {
            abort(404, 'Bằng chứng không thuộc KOC trong chiến dịch này.');
        }

        $currentUser = auth()->user();
        $isLeaderOrAdmin = AuthHelper::isLeaderOrAdmin($currentUser);

        // Chỉ người tải lên hoặc Admin/Leader mới được xóa bằng chứng
        if (!$isLeaderOrAdmin && $evidence->uploaded_by !== $currentUser->id) {
            abort(403, 'Bạn không có quyền xóa bằng chứng do người khác tải lên.');
        }

        // Xóa file vật lý trên disk public
        if (!empty($evidence->file_path) && Storage::disk('public')->exists($evidence->file_path)) {
            Storage::disk('public')->delete($evidence->file_path);
        }

        $evidence->delete();

        if (request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Đã xóa bằng chứng thành công.',
            ]);
        }

        return redirect()->back()->with('success', 'Đã xóa bằng chứng thành công.');
    }

    /**
     * Phân quyền truy cập KOC trong chiến dịch
     */
    protected function authorizeAccess(Campaign $campaign, CampaignCreator $creator): void
    {
        if ($creator->campaign_id !== $campaign->id) {
            abort(404, 'KOC không thuộc chiến dịch này.');
        }

        $currentUser = auth()->user();
        $isLeaderOrAdmin = AuthHelper::isLeaderOrAdmin($currentUser);

        // Nếu là staff thường, chỉ được thao tác với KOC được giao
        if (!$isLeaderOrAdmin && $creator->assigned_to !== $currentUser->id) {
            abort(403, 'Bạn không có quyền thao tác với KOC này trong chiến dịch.');
        }
    }
}
