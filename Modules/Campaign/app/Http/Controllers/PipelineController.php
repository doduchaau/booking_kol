<?php

namespace Modules\Campaign\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Campaign\Enums\CampaignStatusEnum;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Http\Requests\UpdatePipelineStatusRequest;
use Modules\Campaign\Models\Campaign;
use Modules\Campaign\Models\CampaignCreator;
use Modules\Campaign\Services\PipelineService;

class PipelineController extends Controller
{
    public function __construct(
        protected PipelineService $pipelineService
    ) {}

    /**
     * Chuyển hướng tới trang Quản lý Chiến dịch & Ma Trận KOC phù hợp
     */
    public function general(Request $request): RedirectResponse
    {
        if ($campaignId = $request->query('campaign_id')) {
            $campaign = Campaign::find($campaignId);
            if ($campaign) {
                return redirect()->route('campaigns.show', ['id' => $campaign->id]);
            }
        }

        // Tìm chiến dịch đang diễn ra (ACTIVE) gần nhất, hoặc bất kỳ chiến dịch nào gần nhất
        $campaign = Campaign::query()
            ->where('status', CampaignStatusEnum::ACTIVE)
            ->latest('id')
            ->first()
            ?? Campaign::query()->latest('id')->first();

        if ($campaign) {
            return redirect()->route('campaigns.show', ['id' => $campaign->id]);
        }

        return redirect()->route('campaigns.index')->with('warning', 'Chưa có chiến dịch nào. Vui lòng tạo chiến dịch mới.');
    }

    /**
     * Chuyển hướng route cũ /campaigns/{id}/pipeline sang giao diện Ma Trận KOC của chiến dịch
     */
    public function index(Request $request, int $campaignId): RedirectResponse
    {
        $campaign = Campaign::findOrFail($campaignId);

        return redirect()->route('campaigns.show', ['id' => $campaign->id]);
    }

    /**
     * Cập nhật trạng thái thẻ khi kéo thả trên Kanban hoặc đổi trạng thái 1-chạm
     */
    public function updateStatus(
        UpdatePipelineStatusRequest $request,
        int $id
    ): RedirectResponse|JsonResponse {
        $campaignCreator = CampaignCreator::findOrFail($id);

        // Phân quyền: Staff chỉ được sửa KOC mình được phân công
        $currentUser = auth()->user();
        if ($currentUser && $currentUser->hasRole('Staff') && !$currentUser->hasAnyRole(['Admin', 'Leader'])) {
            if ($campaignCreator->assigned_to !== null && $campaignCreator->assigned_to !== $currentUser->id) {
                $msg = 'Bạn chỉ được sửa trạng thái của KOC mà mình được phân công.';
                return $request->wantsJson()
                    ? response()->json(['success' => false, 'message' => $msg], 403)
                    : back()->withErrors(['error' => $msg]);
            }
        }

        $newStatus = PipelineStatusEnum::from($request->input('status'));

        try {
            $this->pipelineService->updateCreatorStatus(
                campaignCreator: $campaignCreator,
                newStatus: $newStatus,
                notes: $request->input('notes')
            );

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => "Đã chuyển Creator sang [{$newStatus->label()}] thành công.",
                ]);
            }

            return back()->with('success', "Đã chuyển Creator sang trạng thái [{$newStatus->label()}].");
        } catch (Exception $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->withErrors(['status' => $e->getMessage()]);
        }
    }

    /**
     * Gán nhân viên phụ trách thẻ Creator
     */
    public function assignStaff(
        Request $request,
        int $id
    ): RedirectResponse|JsonResponse {
        $request->validate([
            'assigned_to' => ['nullable', 'exists:users,id'],
        ]);

        $campaignCreator = CampaignCreator::findOrFail($id);
        $this->pipelineService->assignStaff($campaignCreator, $request->input('assigned_to'));

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật nhân viên phụ trách thành công.',
            ]);
        }

        return back()->with('success', 'Đã cập nhật nhân viên phụ trách thành công.');
    }

    /**
     * Cập nhật trạng thái hàng loạt cho nhiều KOC trong chiến dịch
     */
    public function bulkUpdateStatus(
        Request $request,
        int $campaignId
    ): RedirectResponse|JsonResponse {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:campaign_creators,id'],
            'status' => ['required', 'string', 'in:' . implode(',', array_column(PipelineStatusEnum::cases(), 'value'))],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $newStatus = PipelineStatusEnum::from($request->input('status'));
        $result = $this->pipelineService->bulkUpdateStatus(
            ids: $request->input('ids'),
            newStatus: $newStatus,
            notes: $request->input('notes')
        );

        $msg = "Đã cập nhật {$result['updated']} KOC sang trạng thái [{$newStatus->label()}].";
        if (!empty($result['errors'])) {
            $msg .= ' Bỏ qua ' . count($result['errors']) . ' KOC do ràng buộc: ' . implode('; ', array_slice($result['errors'], 0, 3));
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $msg,
                'result' => $result,
            ]);
        }

        if (!empty($result['errors']) && $result['updated'] === 0) {
            return back()->withErrors(['error' => $msg]);
        }

        return back()->with('success', $msg);
    }

    /**
     * Phân bổ nhân sự phụ trách hàng loạt cho nhiều KOC
     */
    public function bulkAssignStaff(
        Request $request,
        int $campaignId
    ): RedirectResponse|JsonResponse {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:campaign_creators,id'],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ]);

        $assignedTo = $request->input('assigned_to') ? (int) $request->input('assigned_to') : null;
        $count = $this->pipelineService->bulkAssignStaff(
            ids: $request->input('ids'),
            userId: $assignedTo
        );

        $msg = "Đã phân bổ {$count} KOC cho nhân viên phụ trách thành công.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $msg,
            ]);
        }

        return back()->with('success', $msg);
    }

    /**
     * Cập nhật nhanh thông tin dòng (Inline Edit: Phí booking, Ghi chú, Phụ trách, Trạng thái)
     */
    public function quickUpdate(
        Request $request,
        int $campaignId,
        int $pivotId
    ): RedirectResponse|JsonResponse {
        $request->validate([
            'booking_fee' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'status' => ['nullable', 'string', 'in:' . implode(',', array_column(PipelineStatusEnum::cases(), 'value'))],
        ]);

        $campaignCreator = CampaignCreator::where('campaign_id', $campaignId)->findOrFail($pivotId);

        // Phân quyền: Staff chỉ được sửa KOC mình được phân công
        $currentUser = auth()->user();
        if ($currentUser && $currentUser->hasRole('Staff') && !$currentUser->hasAnyRole(['Admin', 'Leader'])) {
            if ($campaignCreator->assigned_to !== null && $campaignCreator->assigned_to !== $currentUser->id) {
                $msg = 'Bạn chỉ được chỉnh sửa KOC mà mình được phân công.';
                return $request->wantsJson()
                    ? response()->json(['success' => false, 'message' => $msg], 403)
                    : back()->withErrors(['error' => $msg]);
            }
        }

        try {
            $updated = $this->pipelineService->quickUpdate($campaignCreator, $request->only([
                'booking_fee',
                'notes',
                'assigned_to',
                'status',
            ]));

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Đã cập nhật thông tin KOC thành công.',
                    'data' => $updated,
                ]);
            }

            return back()->with('success', 'Đã cập nhật thông tin KOC thành công.');
        } catch (Exception $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
