<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Lấy danh sách thông báo và số lượng chưa đọc của user hiện tại
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'notifications' => [],
                'unread_count' => 0,
            ], 401);
        }

        $filter = $request->input('filter', 'all'); // 'all' | 'unread'
        $limit = (int) $request->input('limit', 20);

        $query = $user->notifications();

        if ($filter === 'unread') {
            $query = $user->unreadNotifications();
        }

        $rawNotifications = $query->latest()->take($limit)->get();
        $unreadCount = $user->unreadNotifications()->count();

        $notifications = $rawNotifications->map(function ($n) {
            $data = is_array($n->data) ? $n->data : json_decode($n->data, true);
            return [
                'id' => $n->id,
                'title' => $data['title'] ?? 'Thông báo hệ thống',
                'message' => $data['message'] ?? '',
                'category' => $data['category'] ?? 'system',
                'icon' => $data['icon'] ?? 'Bell',
                'url' => $data['url'] ?? null,
                'read_at' => $n->read_at ? $n->read_at->toIso8601String() : null,
                'is_unread' => is_null($n->read_at),
                'created_at' => $n->created_at ? $n->created_at->diffForHumans() : '',
                'created_at_raw' => $n->created_at ? $n->created_at->toIso8601String() : null,
                'data' => $data,
            ];
        });

        return response()->json([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Endpoint siêu nhẹ (< 2ms) kiểm tra thông báo mới và số lượng chưa đọc định kỳ
     */
    public function checkNew(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'unread_count' => 0], 401);
        }

        $unreadCount = $user->unreadNotifications()->count();
        $latest = null;

        if ($unreadCount > 0) {
            $latestRaw = $user->unreadNotifications()->latest()->first();
            if ($latestRaw) {
                $data = is_array($latestRaw->data) ? $latestRaw->data : json_decode($latestRaw->data, true);
                $latest = [
                    'id' => $latestRaw->id,
                    'title' => $data['title'] ?? 'Thông báo mới',
                    'message' => $data['message'] ?? '',
                    'category' => $data['category'] ?? 'system',
                    'icon' => $data['icon'] ?? 'Bell',
                    'url' => $data['url'] ?? null,
                    'created_at' => $latestRaw->created_at ? $latestRaw->created_at->diffForHumans() : 'Vừa xong',
                    'created_at_raw' => $latestRaw->created_at ? $latestRaw->created_at->toIso8601String() : null,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
            'latest' => $latest,
        ]);
    }

    /**
     * Đánh dấu 1 thông báo là đã đọc
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false], 401);
        }

        $notification = $user->notifications()->where('id', $id)->first();
        if ($notification && is_null($notification->read_at)) {
            $notification->markAsRead();
        }

        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false], 401);
        }

        $user->unreadNotifications->markAsRead();

        return response()->json([
            'success' => true,
            'unread_count' => 0,
            'message' => 'Đã đánh dấu tất cả thông báo là đã đọc.',
        ]);
    }

    /**
     * Xóa 1 thông báo
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false], 401);
        }

        $user->notifications()->where('id', $id)->delete();
        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
            'message' => 'Đã xóa thông báo.',
        ]);
    }
}

