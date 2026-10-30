<?php

namespace Modules\Creator\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Creator\Connectors\ChromeExtensionConnector;
use Modules\Creator\Http\Requests\CollectCreatorFromExtensionRequest;

class CreatorExtensionApiController extends Controller
{
    /**
     * Kiểm tra trạng thái kết nối từ Extension (Ping)
     */
    public function ping(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'connected' => true,
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ],
            'system' => 'Booking KOL / KOC CRM',
            'time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Kiểm tra xem Creator theo Platform và Handle đã có trong CRM chưa
     */
    public function check(Request $request, ChromeExtensionConnector $connector): JsonResponse
    {
        $platform = $request->query('platform', 'tiktok');
        $handle = $request->query('handle', '');

        if (empty($handle)) {
            return response()->json([
                'exists' => false,
                'creator' => null,
            ]);
        }

        $existing = $connector->checkExists($platform, $handle);

        if ($existing) {
            return response()->json([
                'exists' => true,
                'creator' => [
                    'id' => $existing->id,
                    'name' => $existing->name,
                    'phone' => $existing->phone ? substr($existing->phone, 0, 4) . '****' . substr($existing->phone, -3) : null,
                    'tier' => $existing->tier?->value ?? 'nano',
                    'niche' => $existing->niche,
                    'trust_score' => $existing->trust_score,
                    'url' => route('creators.show', $existing->id),
                ],
            ]);
        }

        return response()->json([
            'exists' => false,
            'creator' => null,
        ]);
    }

    /**
     * Tiếp nhận dữ liệu trích xuất từ Chrome Extension và lưu vào CRM
     */
    public function collect(
        CollectCreatorFromExtensionRequest $request,
        ChromeExtensionConnector $connector
    ): JsonResponse {
        try {
            $parsed = $connector->parse($request->validated());
            $result = $connector->save($parsed, $request->user());

            return response()->json([
                'status' => 'success',
                'action' => $result['action'],
                'message' => $result['message'],
                'creator' => [
                    'id' => $result['creator']->id,
                    'name' => $result['creator']->name,
                    'phone' => $result['creator']->phone,
                    'tier' => $result['creator']->tier?->value,
                    'niche' => $result['creator']->niche,
                    'accounts' => $result['creator']->accounts,
                ],
                'crm_url' => route('creators.show', $result['creator']->id),
            ], 200);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Lỗi hệ thống khi lưu hồ sơ: ' . $e->getMessage(),
            ], 500);
        }
    }
}
