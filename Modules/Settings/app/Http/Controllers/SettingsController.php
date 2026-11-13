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
            'default_sample_shipping_note' => Setting::get('default_sample_shipping_note', 'Hàng mẫu tặng KOC quay video review - Không thu tiền COD'),
            'zalo_oa_app_id' => Setting::get('zalo_oa_app_id', ''),
            'zalo_oa_secret_key' => Setting::get('zalo_oa_secret_key', ''),
            'zalo_oa_id' => Setting::get('zalo_oa_id', ''),
            'groq_api_key' => Setting::get('groq_api_key', ''),
            'openai_api_key' => Setting::get('openai_api_key', ''),
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
            'default_sample_shipping_note' => ['nullable', 'string', 'max:500'],
        ]);

        Setting::set('default_video_deadline_days', $validated['default_video_deadline_days'], 'general');
        Setting::set('blacklist_penalty_score', $validated['blacklist_penalty_score'], 'general');
        if (array_key_exists('default_sample_shipping_note', $validated)) {
            Setting::set('default_sample_shipping_note', $validated['default_sample_shipping_note'] ?? '', 'general');
        }

        return back()->with('success', 'Đã lưu cấu hình thời hạn nộp video, điểm uy tín và ghi chú xuất mẫu thành công.');
    }

    /**
     * Cập nhật Cấu hình Tích hợp (Zalo OA & AI API Keys)
     */
    public function updateIntegrations(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'zalo_oa_app_id' => ['nullable', 'string', 'max:100'],
            'zalo_oa_secret_key' => ['nullable', 'string', 'max:255'],
            'zalo_oa_id' => ['nullable', 'string', 'max:100'],
            'groq_api_key' => ['nullable', 'string', 'max:255'],
            'openai_api_key' => ['nullable', 'string', 'max:255'],
        ]);

        // Lưu Zalo OA
        Setting::set('zalo_oa_app_id', $validated['zalo_oa_app_id'] ?? '', 'integration');
        if (!empty($validated['zalo_oa_secret_key']) && !str_contains($validated['zalo_oa_secret_key'], '••••')) {
            Setting::set('zalo_oa_secret_key', $validated['zalo_oa_secret_key'], 'integration', true);
        }
        Setting::set('zalo_oa_id', $validated['zalo_oa_id'] ?? '', 'integration');

        // Lưu API Key cho Tầng 3 AI Smart Schema Mapper (Groq / OpenAI)
        if (!empty($validated['groq_api_key']) && !str_contains($validated['groq_api_key'], '••••')) {
            Setting::set('groq_api_key', $validated['groq_api_key'], 'ai_integration', true);
        }
        if (!empty($validated['openai_api_key']) && !str_contains($validated['openai_api_key'], '••••')) {
            Setting::set('openai_api_key', $validated['openai_api_key'], 'ai_integration', true);
        }

        return back()->with('success', 'Đã lưu thông tin cấu hình kết nối Zalo OA và AI API Keys an toàn.');
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
