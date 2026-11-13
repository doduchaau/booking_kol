import React, { FormEventHandler, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface LoginProps {
    status?: string;
    warning?: string;
    canResetPassword?: boolean;
}

export default function Login({ status, warning, canResetPassword = true }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout
            title="Đăng nhập hệ thống"
            description="Chào mừng bạn quay trở lại! Vui lòng nhập thông tin tài khoản nhân sự để truy cập bảng điều hành."
            badge="Xác thực nội bộ"
        >
            <Head title="Đăng nhập - KOL Booking Enterprise" />

            {/* Warning Notification (e.g. attempted self-registration or missing role) */}
            {warning && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-xs">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                    <div className="leading-relaxed font-medium">{warning}</div>
                </div>
            )}

            {/* Flash Status Notification (e.g. reset password link sent) */}
            {status && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                    <div className="leading-relaxed font-medium">{status}</div>
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                {/* Email Address */}
                <FormField
                    id="email"
                    label="Email nhân sự"
                    required
                    error={errors.email}
                >
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        placeholder="name@company.com"
                        className="w-full"
                        autoComplete="username"
                        isFocused={true}
                        error={!!errors.email}
                        iconLeft={<Mail className="h-4 w-4" />}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                </FormField>

                {/* Password with Show/Hide toggle */}
                <FormField
                    id="password"
                    label="Mật khẩu"
                    required
                    error={errors.password}
                >
                    <TextInput
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={data.password}
                        placeholder="••••••••"
                        className="w-full"
                        autoComplete="current-password"
                        error={!!errors.password}
                        iconLeft={<Lock className="h-4 w-4" />}
                        iconRight={
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        }
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                </FormField>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 shadow-sm focus:ring-primary-500 transition-colors"
                        />
                        <span className="text-sm text-slate-600 hover:text-slate-800">
                            Ghi nhớ đăng nhập
                        </span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                        >
                            Quên mật khẩu?
                        </Link>
                    )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full justify-center shadow-md shadow-primary-500/20"
                        loading={processing}
                        loadingText="Đang xác thực..."
                        iconRight={<ArrowRight className="h-4 w-4" />}
                    >
                        Đăng nhập vào hệ thống
                    </Button>
                </div>

                {/* Enterprise Internal Notice (Replaces open public registration link) */}
                <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700 flex items-center justify-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
                        Hệ thống Quản trị Booking KOL/KOC Nội bộ
                    </p>
                    <p className="text-slate-400 leading-normal">
                        Để đảm bảo an toàn dữ liệu, cổng đăng ký tự do không mở công khai. Nhân sự cần cấp tài khoản vui lòng liên hệ <strong>Quản trị viên (Admin)</strong>.
                    </p>
                </div>
            </form>
        </GuestLayout>
    );
}
