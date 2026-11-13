import React, { FormEventHandler, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import { User, Mail, Lock, ShieldCheck, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout
            title="Tạo tài khoản quản trị"
            description="Bắt đầu quản lý chiến dịch booking KOL/KOC chuyên nghiệp và xây dựng mạng lưới Creator của riêng bạn."
            badge="Khởi tạo workspace"
        >
            <Head title="Đăng ký tài khoản - KOL Booking Enterprise" />

            <form onSubmit={submit} className="space-y-4">
                {/* Full Name */}
                <FormField
                    id="name"
                    label="Họ và tên người quản trị"
                    required
                    error={errors.name}
                >
                    <TextInput
                        id="name"
                        type="text"
                        name="name"
                        value={data.name}
                        placeholder="Nguyễn Văn A"
                        className="w-full"
                        autoComplete="name"
                        isFocused={true}
                        error={!!errors.name}
                        iconLeft={<User className="h-4 w-4" />}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                </FormField>

                {/* Email Address */}
                <FormField
                    id="email"
                    label="Email công việc"
                    required
                    error={errors.email}
                >
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        placeholder="admin@brand.vn"
                        className="w-full"
                        autoComplete="username"
                        error={!!errors.email}
                        iconLeft={<Mail className="h-4 w-4" />}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                </FormField>

                {/* Password */}
                <FormField
                    id="password"
                    label="Mật khẩu"
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

                {/* Confirm Password */}
                <FormField
                    id="password_confirmation"
                    label="Xác nhận lại mật khẩu"
                    required
                    error={errors.password_confirmation}
                >
                    <TextInput
                        id="password_confirmation"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="password_confirmation"
                        value={data.password_confirmation}
                        placeholder="Nhập lại mật khẩu phía trên"
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

                {/* Terms Disclaimer */}
                <div className="pt-1">
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Bằng việc bấm Tạo tài khoản, bạn đồng ý với{' '}
                        <span className="text-slate-700 font-medium">Điều khoản dịch vụ</span>{' '}
                        và{' '}
                        <span className="text-slate-700 font-medium">Chính sách bảo mật</span>{' '}
                        của hệ thống.
                    </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full justify-center shadow-md shadow-primary-500/20"
                        loading={processing}
                        loadingText="Đang khởi tạo tài khoản..."
                        iconRight={<UserPlus className="h-4 w-4" />}
                    >
                        Tạo tài khoản quản trị
                    </Button>
                </div>

                {/* Bottom Login Link */}
                <div className="pt-4 border-t border-slate-100 text-center text-sm text-slate-500">
                    Đã có tài khoản quản trị?{' '}
                    <Link
                        href={route('login')}
                        className="font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                    >
                        Đăng nhập ngay
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
