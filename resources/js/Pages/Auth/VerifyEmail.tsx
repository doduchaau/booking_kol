import React, { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import Button from '@/Components/Common/Button';
import { MailCheck, CheckCircle2, Send, LogOut } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout
            title="Xác thực địa chỉ Email"
            description="Cảm ơn bạn đã đăng ký tài khoản quản trị! Để đảm bảo an toàn, vui lòng kiểm tra hộp thư và bấm vào liên kết xác thực chúng tôi vừa gửi."
            badge="Kích hoạt tài khoản"
        >
            <Head title="Xác thực Email - KOL Booking Enterprise" />

            {/* Success Feedback Alert */}
            {status === 'verification-link-sent' && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                    <div className="leading-relaxed font-medium">
                        Một liên kết xác thực mới vừa được gửi tới địa chỉ email của bạn. Vui lòng kiểm tra hộp thư!
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-6 flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                    <MailCheck className="h-5 w-5" />
                </div>
                <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                    <p className="font-semibold text-slate-800">
                        Chưa nhận được email kích hoạt?
                    </p>
                    <p>
                        Vui lòng kiểm tra mục Thư rác (Spam/Junk). Nếu vẫn không nhận được, bấm vào nút bên dưới để hệ thống gửi lại ngay lập tức.
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center shadow-md shadow-primary-500/20"
                    loading={processing}
                    loadingText="Đang gửi lại email..."
                    iconRight={<Send className="h-4 w-4" />}
                >
                    Gửi lại email xác thực
                </Button>

                <div className="pt-3 border-t border-slate-100 text-center">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất tài khoản
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
