import React, { FormEventHandler, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import { Mail, Lock, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout
            title="Đặt lại mật khẩu mới"
            description="Vui lòng thiết lập mật khẩu mới an toàn cho tài khoản quản trị của bạn."
            badge="Khôi phục tài khoản"
        >
            <Head title="Đặt lại mật khẩu - KOL Booking Enterprise" />

            <form onSubmit={submit} className="space-y-4">
                {/* Email Address */}
                <FormField
                    id="email"
                    label="Email tài khoản"
                    required
                    error={errors.email}
                >
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="w-full"
                        autoComplete="username"
                        error={!!errors.email}
                        iconLeft={<Mail className="h-4 w-4" />}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                </FormField>

                {/* New Password */}
                <FormField
                    id="password"
                    label="Mật khẩu mới"
                    required
                    error={errors.password}
                    hint="Tối thiểu 8 ký tự, nên kết hợp cả chữ và số."
                >
                    <TextInput
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={data.password}
                        placeholder="••••••••"
                        className="w-full"
                        autoComplete="new-password"
                        isFocused={true}
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

                {/* Confirm New Password */}
                <FormField
                    id="password_confirmation"
                    label="Xác nhận lại mật khẩu mới"
                    required
                    error={errors.password_confirmation}
                >
                    <TextInput
                        id="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password_confirmation"
                        value={data.password_confirmation}
                        placeholder="Nhập lại mật khẩu mới phía trên"
                        className="w-full"
                        autoComplete="new-password"
                        error={!!errors.password_confirmation}
                        iconLeft={<ShieldCheck className="h-4 w-4" />}
                        iconRight={
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        }
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />
                </FormField>

                {/* Submit Button */}
                <div className="pt-2">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full justify-center shadow-md shadow-primary-500/20"
                        loading={processing}
                        loadingText="Đang cập nhật mật khẩu..."
                        iconRight={<CheckCircle2 className="h-4 w-4" />}
                    >
                        Cập nhật mật khẩu mới
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
