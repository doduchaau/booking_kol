import React, { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import { Mail, Send, ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout
            title="Khôi phục mật khẩu"
            description="Đừng lo lắng! Hãy nhập địa chỉ email đã đăng ký của bạn, hệ thống sẽ gửi liên kết an toàn để thiết lập mật khẩu mới."
            badge="Bảo mật tài khoản"
        >
            <Head title="Khôi phục mật khẩu - KOL Booking Enterprise" />

            {/* Success Status Notice */}
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
                    label="Email đăng ký của bạn"
                    required
                    error={errors.email}
                    hint="Chúng tôi sẽ gửi một liên kết xác thực có hiệu lực trong 60 phút."
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

                {/* Submit Button */}
                <div className="pt-2">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full justify-center shadow-md shadow-primary-500/20"
                        loading={processing}
                        loadingText="Đang gửi liên kết..."
                        iconRight={<Send className="h-4 w-4" />}
                    >
                        Gửi liên kết đặt lại mật khẩu
                    </Button>
                </div>

                {/* Helpful instructions notice */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 flex items-start gap-2.5">
                    <HelpCircle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                    <p className="leading-relaxed">
                        Nếu không tìm thấy email trong Hộp thư đến, vui lòng kiểm tra thư mục <strong>Thư rác (Spam)</strong> hoặc liên hệ quản trị viên hệ thống để được hỗ trợ.
                    </p>
                </div>

                {/* Back to Login Link */}
                <div className="pt-4 border-t border-slate-100 text-center">
                    <Link
                        href={route('login')}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary-600 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Quay lại trang Đăng nhập
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
