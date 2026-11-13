import React, { FormEventHandler, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import { Lock, Eye, EyeOff, ShieldAlert, ArrowRight } from 'lucide-react';

export default function ConfirmPassword() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout
            title="Xác nhận mật khẩu"
            description="Đây là khu vực bảo mật nâng cao. Vui lòng xác thực mật khẩu hiện tại của bạn trước khi tiếp tục thực hiện thao tác."
            badge="Bảo mật nâng cao"
        >
            <Head title="Xác nhận mật khẩu - KOL Booking Enterprise" />

            <form onSubmit={submit} className="space-y-5">
                {/* Notice Card */}
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <p className="leading-relaxed">
                        Thao tác này yêu cầu quyền quản trị đặc biệt. Mật khẩu của bạn được mã hóa an toàn và không bao giờ lưu trữ dạng văn bản thô.
                    </p>
                </div>

                {/* Password Input */}
                <FormField
                    id="password"
                    label="Mật khẩu của bạn"
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
                        Xác nhận và tiếp tục
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
