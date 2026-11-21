import React, { FormEventHandler, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import { KeyRound, Lock, Eye, EyeOff, Check, X } from 'lucide-react';

export default function UpdatePasswordForm({
    className = '',
}: {
    className?: string;
}) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (formErrors) => {
                if (formErrors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (formErrors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    // Tính toán độ mạnh mật khẩu mới
    const hasMinLength = data.password.length >= 8;
    const hasNumber = /\d/.test(data.password);
    const hasLetter = /[a-zA-Z]/.test(data.password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(data.password);
    const passwordScore =
        (hasMinLength ? 1 : 0) +
        (hasNumber ? 1 : 0) +
        (hasLetter ? 1 : 0) +
        (hasSpecial ? 1 : 0);

    return (
        <section className={`space-y-6 ${className}`}>
            <header className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary-600" />
                    <h2 className="text-base font-bold text-slate-900">
                        Thay Đổi Mật Khẩu
                    </h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                    Đảm bảo tài khoản của bạn được bảo vệ bằng mật khẩu mạnh, an toàn và không chia sẻ cho người khác.
                </p>
            </header>

            <form onSubmit={updatePassword} className="space-y-4">
                {/* Mật khẩu hiện tại */}
                <FormField
                    id="current_password"
                    label="Mật khẩu hiện tại"
                    required
                    error={errors.current_password}
                    hint="Nhập mật khẩu đang dùng để xác thực quyền thay đổi"
                >
                    <div className="relative">
                        <TextInput
                            id="current_password"
                            ref={currentPasswordInput}
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            required
                            autoComplete="current-password"
                            iconLeft={<Lock className="h-4 w-4" />}
                            placeholder="••••••••"
                            error={Boolean(errors.current_password)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                            tabIndex={-1}
                            title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                            {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </FormField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Mật khẩu mới */}
                    <FormField
                        id="password"
                        label="Mật khẩu mới"
                        required
                        error={errors.password}
                        hint="Tối thiểu 8 ký tự, nên gồm chữ hoa, số và ký tự đặc biệt"
                    >
                        <div className="relative">
                            <TextInput
                                id="password"
                                ref={passwordInput}
                                type={showNewPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                autoComplete="new-password"
                                iconLeft={<Lock className="h-4 w-4" />}
                                placeholder="••••••••"
                                error={Boolean(errors.password)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                tabIndex={-1}
                                title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </FormField>

                    {/* Xác nhận mật khẩu mới */}
                    <FormField
                        id="password_confirmation"
                        label="Xác nhận mật khẩu mới"
                        required
                        error={errors.password_confirmation}
                        hint="Nhập lại chính xác mật khẩu mới ở ô bên cạnh"
                    >
                        <div className="relative">
                            <TextInput
                                id="password_confirmation"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                                autoComplete="new-password"
                                iconLeft={<Lock className="h-4 w-4" />}
                                placeholder="••••••••"
                                error={Boolean(errors.password_confirmation)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                tabIndex={-1}
                                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </FormField>
                </div>

                {/* Tiêu chí độ mạnh mật khẩu */}
                {data.password && (
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">Độ mạnh mật khẩu:</span>
                            <span
                                className={`font-bold ${
                                    passwordScore >= 4
                                        ? 'text-emerald-600'
                                        : passwordScore >= 2
                                        ? 'text-amber-600'
                                        : 'text-rose-600'
                                }`}
                            >
                                {passwordScore >= 4
                                    ? 'Rất mạnh'
                                    : passwordScore >= 3
                                    ? 'Khá an toàn'
                                    : passwordScore >= 2
                                    ? 'Trung bình'
                                    : 'Yếu'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 sm:grid-cols-4">
                            <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Ít nhất 8 ký tự
                            </span>
                            <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                {hasLetter ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Có chữ cái
                            </span>
                            <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                {hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Có số
                            </span>
                            <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                {hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Ký tự đặc biệt
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end pt-2">
                    <Button
                        type="submit"
                        variant="primary"
                        loading={processing}
                        loadingText="Đang đổi mật khẩu..."
                        iconLeft={<KeyRound className="h-4 w-4" />}
                    >
                        Cập Nhật Mật Khẩu
                    </Button>
                </div>
            </form>
        </section>
    );
}
