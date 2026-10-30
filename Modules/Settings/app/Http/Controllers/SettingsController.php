<?php

namespace Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Settings\Models\Setting;
use Spatie\Permission\Models\Role;

class SettingsController extends Controller
{
    /**
     * Màn hình Quản trị Cấu hình Hệ thống & Phân quyền
     */
    public function index(): Response
    {
        // Chỉ Admin hoặc người có quyền manage_settings mới được vào
        $currentUser = auth()->user();
        if ($currentUser && !$currentUser->hasAnyRole(['Admin'])) {
            abort(403, 'Bạn không có quyền truy cập trang Cài đặt hệ thống.');
        }

        // Lấy danh sách cấu hình
        $settings = [
            'default_video_deadline_days' => (int) Setting::get('default_video_deadline_days', 7),
            'blacklist_penalty_score' => (int) Setting::get('blacklist_penalty_score', 30),
            'zalo_oa_app_id' => Setting::get('zalo_oa_app_id', ''),
            'zalo_oa_secret_key' => Setting::get('zalo_oa_secret_key', ''),
            'zalo_oa_id' => Setting::get('zalo_oa_id', ''),
            'ghn_token' => Setting::get('ghn_token', ''),
            'ghn_shop_id' => Setting::get('ghn_shop_id', ''),
            'ghtk_token' => Setting::get('ghtk_token', ''),
        ];

        // Lấy danh sách nhân sự kèm vai trò
        $users = User::with('roles')
            ->orderBy('name')
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'roles' => $u->roles->pluck('name')->toArray(),
                    'created_at' => $u->created_at?->format('d/m/Y'),
                ];
            });

        $availableRoles = Role::pluck('name')->toArray();
        if (empty($availableRoles)) {
            $availableRoles = ['Admin', 'Leader', 'Staff'];
        }

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
            'users' => $users,
            'availableRoles' => $availableRoles,
        ]);
    }

    /**
     * Cập nhật Cấu hình Quy trình Chung
     */
    public function updateGeneral(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_video_deadline_days' => ['required', 'integer', 'min:1', 'max:60'],
            'blacklist_penalty_score' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        Setting::set('default_video_deadline_days', $validated['default_video_deadline_days'], 'general');
        Setting::set('blacklist_penalty_score', $validated['blacklist_penalty_score'], 'general');

        return back()->with('success', 'Đã lưu cấu hình thời hạn nộp video và điểm uy tín thành công.');
    }

    /**
     * Cập nhật Cấu hình Tích hợp (Zalo OA & Tài khoản Hãng vận chuyển)
     */
    public function updateIntegrations(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'zalo_oa_app_id' => ['nullable', 'string', 'max:100'],
            'zalo_oa_secret_key' => ['nullable', 'string', 'max:255'],
            'zalo_oa_id' => ['nullable', 'string', 'max:100'],
            'ghn_token' => ['nullable', 'string', 'max:255'],
            'ghn_shop_id' => ['nullable', 'string', 'max:100'],
            'ghtk_token' => ['nullable', 'string', 'max:255'],
        ]);

        // Lưu Zalo OA
        Setting::set('zalo_oa_app_id', $validated['zalo_oa_app_id'] ?? '', 'integration');
        if (!empty($validated['zalo_oa_secret_key']) && !str_contains($validated['zalo_oa_secret_key'], '••••')) {
            Setting::set('zalo_oa_secret_key', $validated['zalo_oa_secret_key'], 'integration', true);
        }
        Setting::set('zalo_oa_id', $validated['zalo_oa_id'] ?? '', 'integration');

        // Lưu Tài khoản hãng vận chuyển (ghn, ghtk) với mã hóa an toàn
        if (!empty($validated['ghn_token']) && !str_contains($validated['ghn_token'], '••••')) {
            Setting::set('ghn_token', $validated['ghn_token'], 'carrier', true);
        }
        Setting::set('ghn_shop_id', $validated['ghn_shop_id'] ?? '', 'carrier');
        if (!empty($validated['ghtk_token']) && !str_contains($validated['ghtk_token'], '••••')) {
            Setting::set('ghtk_token', $validated['ghtk_token'], 'carrier', true);
        }

        return back()->with('success', 'Đã lưu thông tin cấu hình kết nối Zalo OA và Hãng vận chuyển an toàn.');
    }

    /**
     * Thêm tài khoản nhân sự mới
     */
    public function createUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'string', Rule::in(['Admin', 'Leader', 'Staff'])],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);

        return back()->with('success', "Đã tạo tài khoản cho nhân sự [{$user->name}] với vai trò [{$validated['role']}].");
    }

    /**
     * Cập nhật vai trò phân quyền của nhân sự
     */
    public function updateUserRole(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(['Admin', 'Leader', 'Staff'])],
        ]);

        $user = User::findOrFail($id);

        // Chặn hạ quyền Admin nếu đây là tài khoản Admin duy nhất
        if ($user->hasRole('Admin') && $validated['role'] !== 'Admin') {
            $adminCount = User::role('Admin')->count();
            if ($adminCount <= 1) {
                return back()->withErrors(['role' => 'Không thể đổi vai trò của tài khoản Quản trị viên (Admin) duy nhất còn lại trong hệ thống.']);
            }
        }

        $user->syncRoles([$validated['role']]);

        return back()->with('success', "Đã cập nhật vai trò của [{$user->name}] thành [{$validated['role']}].");
    }
}
