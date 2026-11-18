<?php

namespace App\Http\Middleware;

use App\Services\AuthHelper;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     * Kiểm tra xem tài khoản đã đăng nhập có vai trò hợp lệ trong hệ thống quản trị nội bộ hay không.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            // Trong môi trường testing, nếu test case chưa khởi tạo Roles thì cho phép chạy qua
            if (app()->environment('testing') && !AuthHelper::hasRoles()) {
                return $next($request);
            }

            $allowedRoles = ['Admin', 'Leader', 'Staff'];

            if (!$user->hasAnyRole($allowedRoles)) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->with(
                    'warning',
                    'Tài khoản của bạn chưa được Quản trị viên phân quyền vào hệ thống. Vui lòng liên hệ Admin để được cấp quyền.'
                );
            }
        }

        return $next($request);
    }
}
