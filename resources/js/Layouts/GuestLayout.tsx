import React, { PropsWithChildren, ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import {
    Sparkles,
    ShieldCheck,
    KanbanSquare,
    TrendingUp,
    Users,
    CheckCircle2,
    Lock,
} from 'lucide-react';

export interface GuestLayoutProps {
    children: ReactNode;
    title?: string;
    description?: string;
    badge?: string;
}

export default function GuestLayout({
    children,
    title,
    description,
    badge,
}: GuestLayoutProps) {
    const highlights = [
        {
            icon: Users,
            title: 'Creator CRM Đa Kênh',
            desc: 'Quản lý tập trung hồ sơ KOL/KOC, đồng bộ chỉ số follower từ TikTok, YouTube, Instagram & Facebook.',
        },
        {
            icon: KanbanSquare,
            title: 'Pipeline & Tự Động Hóa Vận Hành',
            desc: 'Quy trình kéo thả trực quan 8 giai đoạn, tự động gửi link xác nhận nhận mẫu và kết nối Zalo nhanh chóng.',
        },
        {
            icon: TrendingUp,
            title: 'Kiểm Soát Tiến Độ & Đo Lường ROI',
            desc: 'Cảnh báo hạn nộp video, nghiệm thu bài đăng và đối soát hiệu quả chuyển đổi đơn hàng minh bạch.',
        },
    ];

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans text-slate-800 antialiased selection:bg-primary-500 selection:text-white">
            {/* LEFT COLUMN: Enterprise Hero Showcase (Desktop only) */}
            <aside className="relative hidden lg:flex lg:w-[480px] xl:w-[540px] 2xl:w-[600px] shrink-0 flex-col justify-between overflow-hidden bg-slate-950 p-10 xl:p-12 text-white">
                {/* Background Ambient Glow & Grid Pattern */}
                <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-600/25 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
                        backgroundSize: '24px 24px',
                    }}
                />

                {/* Top: Logo & System Badge */}
                <div className="relative z-10 flex items-center justify-between">
                    <Link href="/" className="inline-flex transition-transform hover:scale-[1.02]">
                        <ApplicationLogo theme="light" size="lg" />
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary-300">
                        <Sparkles className="h-3 w-3 text-primary-400" />
                        Enterprise Platform
                    </span>
                </div>

                {/* Middle: Hero Narrative & Core Pillars */}
                <div className="relative z-10 my-auto py-10 space-y-8">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 border border-white/10">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            Hệ Thống Quản Trị Chiến Dịch B2B
                        </div>
                        <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white leading-tight">
                            Tối ưu hóa toàn diện chu trình Booking KOL & KOC
                        </h1>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                            Giải pháp công nghệ chuyên sâu cho nhãn hàng và agency: Vận hành chiến dịch mượt mà, kiểm soát rủi ro và tối đa hóa hiệu quả truyền thông.
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-4">
                        {highlights.map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={idx}
                                    className="group flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition-all hover:bg-white/[0.06] hover:border-white/20"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600/30 text-primary-300 border border-primary-500/30">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-semibold text-slate-100">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Metrics / Social Proof */}
                    <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                        <div>
                            <div className="text-lg xl:text-xl font-bold text-white">2,500+</div>
                            <div className="text-[11px] text-slate-400">Creator Mạng Lưới</div>
                        </div>
                        <div className="border-x border-white/10">
                            <div className="text-lg xl:text-xl font-bold text-emerald-400">99.2%</div>
                            <div className="text-[11px] text-slate-400">Đúng Hạn Video</div>
                        </div>
                        <div>
                            <div className="text-lg xl:text-xl font-bold text-primary-400">500+</div>
                            <div className="text-[11px] text-slate-400">Chiến Dịch Chạy</div>
                        </div>
                    </div>
                </div>

                {/* Bottom: Security & Support */}
                <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-primary-400" />
                        Bảo mật dữ liệu chuẩn SSL 256-bit
                    </span>
                    <span>Hỗ trợ kỹ thuật 24/7</span>
                </div>
            </aside>

            {/* RIGHT COLUMN: Form Workspace */}
            <main className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-12 overflow-y-auto">
                {/* Mobile Header: Brand Logo Bar */}
                <div className="flex items-center justify-between pb-6 lg:hidden">
                    <Link href="/">
                        <ApplicationLogo theme="dark" size="md" />
                    </Link>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200">
                        <Sparkles className="h-3 w-3" />
                        Enterprise
                    </span>
                </div>

                {/* Form Card Container */}
                <div className="my-auto w-full max-w-lg mx-auto">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/40">
                        {/* Optional Header inside card if provided */}
                        {(title || description || badge) && (
                            <div className="mb-6 space-y-1 text-left border-b border-slate-100 pb-5">
                                {badge && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 border border-primary-200 mb-1.5">
                                        {badge}
                                    </span>
                                )}
                                {title && (
                                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                                        {title}
                                    </h2>
                                )}
                                {description && (
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}

                        {children}
                    </div>

                    {/* Trust badges footer under card */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Đăng nhập an toàn
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
                            Tuân thủ bảo vệ dữ liệu
                        </span>
                        <span>•</span>
                        <span>Bản quyền © 2026 KOL Booking</span>
                    </div>
                </div>

                {/* Bottom Footer Info */}
                <footer className="pt-6 text-center text-xs text-slate-400">
                    <p>Hệ thống phần mềm quản lý chiến dịch Booking KOL/KOC dành cho doanh nghiệp.</p>
                </footer>
            </main>
        </div>
    );
}
