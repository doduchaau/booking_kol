import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Download,
    Key,
    Copy,
    Check,
    RefreshCw,
    Trash2,
    CheckCircle2,
    ExternalLink,
    HelpCircle,
    Database,
    Sparkles,
    ShieldCheck,
    Layers,
    ArrowRight,
    Users,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import ConfirmDialog from '@/Components/Common/ConfirmDialog';

interface CreatorAccount {
    id: number;
    platform: string;
    handle: string;
    url: string;
    followers_count: number;
}

interface Creator {
    id: number;
    name: string;
    phone: string | null;
    tier: string;
    niche: string;
    accounts: CreatorAccount[];
}

interface Props {
    hasToken: boolean;
    tokenLastUsed?: string;
    tokenCreatedAt?: string;
    newExtensionToken?: string;
    apiUrl: string;
    totalCollected: number;
    recentCreators: Creator[];
}

export default function Extension({
    hasToken,
    tokenLastUsed,
    tokenCreatedAt,
    newExtensionToken,
    apiUrl,
    totalCollected,
    recentCreators,
}: Props) {
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedApiUrl, setCopiedApiUrl] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

    const handleCopy = (text: string, type: 'token' | 'url') => {
        navigator.clipboard.writeText(text);
        if (type === 'token') {
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 2000);
        } else {
            setCopiedApiUrl(true);
            setTimeout(() => setCopiedApiUrl(false), 2000);
        }
    };

    const handleGenerateToken = () => {
        setIsGenerating(true);
        router.post(
            route('creators.extension.token.generate'),
            {},
            {
                onFinish: () => setIsGenerating(false),
            }
        );
    };

    const handleRevokeToken = () => {
        setIsRevoking(true);
        router.delete(route('creators.extension.token.revoke'), {
            onFinish: () => {
                setIsRevoking(false);
                setConfirmRevokeOpen(false);
            },
        });
    };

    return (
        <AppLayout title="Tiện ích Chrome Extension - Thu thập KOL/KOC">
            <PageHeader
                title="Tiện Ích Chrome Extension (Thu Thập Dữ Liệu)"
                description="Công cụ thu thập hồ sơ Creator công khai trực tiếp khi lướt TikTok, Facebook, Instagram chỉ với 1-chạm"
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Creator CRM', href: route('creators.index') },
                    { label: 'Chrome Extension' },
                ]}
                actions={
                    <a href={route('creators.extension.download')}>
                        <Button variant="primary" iconLeft={<Download className="h-4 w-4" />}>
                            Tải Tiện Ích (.zip)
                        </Button>
                    </a>
                }
            />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Database className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Hồ sơ thu thập qua Extension</div>
                        <div className="text-2xl font-bold text-slate-900 mt-0.5">{totalCollected}</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Trạng thái kết nối API</div>
                        <div className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Sẵn sàng kết nối (Sanctum v1)
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <Layers className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500">Nền tảng hỗ trợ</div>
                        <div className="text-sm font-bold text-slate-800 mt-0.5">TikTok, Facebook, Instagram</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cột Trái: Cấu hình API Token */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Token Setup Card */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                    <Key className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Mã Xác Thực API Token Cá Nhân</h2>
                                    <p className="text-xs text-slate-500">Mã này giúp tiện ích trình duyệt gửi dữ liệu về tài khoản của bạn trên Booking CRM</p>
                                </div>
                            </div>
                        </div>

                        {/* Flash hiển thị mã mới tạo */}
                        {newExtensionToken && (
                            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-emerald-900">Mã API Token Mới Tạo Của Bạn:</div>
                                        <div className="text-xs text-emerald-700 mt-0.5 mb-2.5">
                                            Lưu ý: Mã này chỉ hiển thị <strong>một lần duy nhất</strong>. Hãy sao chép và dán ngay vào cài đặt tiện ích Chrome!
                                        </div>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-300">
                                            <code className="text-xs font-mono font-bold text-slate-800 break-all flex-1">
                                                {newExtensionToken}
                                            </code>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleCopy(newExtensionToken, 'token')}
                                                iconLeft={copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                            >
                                                {copiedToken ? 'Đã chép!' : 'Sao chép'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cấu hình URL */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Địa chỉ API Web Tool (Dán vào mục "Địa chỉ API" trong tiện ích)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={apiUrl}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono focus:outline-none"
                                    />
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleCopy(apiUrl, 'url')}
                                        iconLeft={copiedApiUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                    >
                                        {copiedApiUrl ? 'Đã chép' : 'Chép URL'}
                                    </Button>
                                </div>
                            </div>

                            {/* Trạng thái Token hiện tại */}
                            <div className="pt-2">
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Trạng thái Token hiện tại
                                </label>
                                {hasToken ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200 gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="success">Đang hoạt động</Badge>
                                                <span className="text-xs text-slate-500">Tạo lúc: {tokenCreatedAt}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Lần dùng gần nhất: <span className="font-medium text-slate-700">{tokenLastUsed || 'Chưa sử dụng'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={isGenerating}
                                                onClick={handleGenerateToken}
                                                iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
                                            >
                                                Cấp lại mã mới
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => setConfirmRevokeOpen(true)}
                                                iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                                            >
                                                Thu hồi
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200">
                                        <div className="text-xs text-amber-800">
                                            Bạn chưa tạo mã API Token cho tiện ích Chrome.
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            loading={isGenerating}
                                            onClick={handleGenerateToken}
                                            iconLeft={<Key className="h-3.5 w-3.5" />}
                                        >
                                            Tạo mã Token ngay
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Hướng Dẫn Cài Đặt */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-indigo-600" />
                            Hướng Dẫn Cài Đặt & Sử Dụng Tiện Ích Trong 3 Bước
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3.5 p-3.5 rounded-lg border border-slate-100 bg-slate-50">
                                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    1
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold text-slate-900">
                                        Tải về và giải nén thư mục Extension
                                    </div>
                                    <div className="text-xs text-slate-600 leading-relaxed">
                                        Bấm nút <strong>"Tải Tiện Ích (.zip)"</strong> ở góc phải trên màn hình, lưu về máy tính và giải nén file zip ra một thư mục riêng (ví dụ: <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">D:\booking-extension</code>).
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5 p-3.5 rounded-lg border border-slate-100 bg-slate-50">
                                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    2
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold text-slate-900">
                                        Cài vào trình duyệt Chrome / Brave / Edge / Cốc Cốc
                                    </div>
                                    <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                                        <p>• Mở trình duyệt, nhập vào thanh địa chỉ: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-indigo-700">chrome://extensions</code> rồi nhấn Enter.</p>
                                        <p>• Gạt bật công tắc <strong>"Chế độ dành cho nhà phát triển" (Developer mode)</strong> ở góc trên bên phải.</p>
                                        <p>• Bấm nút <strong>"Tải tiện ích đã giải nén" (Load unpacked)</strong> và chọn thư mục vừa giải nén ở Bước 1.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5 p-3.5 rounded-lg border border-slate-100 bg-slate-50">
                                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    3
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold text-slate-900">
                                        Dán mã Token và lướt web thu thập
                                    </div>
                                    <div className="text-xs text-slate-600 leading-relaxed">
                                        Ghim icon <strong>Booking KOL</strong> lên thanh công cụ trình duyệt. Bấm vào icon, dán <strong>Địa chỉ API</strong> và <strong>Mã Token</strong>. Khi lướt xem profile Creator trên TikTok hay Facebook, tiện ích sẽ tự động nhận diện và chỉ cần 1 cú click để lưu thẳng vào CRM!
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột Phải: Danh sách vừa thu thập gần đây */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                Hồ Sơ Vừa Lưu Từ Extension
                            </h2>
                            <Link href={route('creators.index')} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                Xem tất cả →
                            </Link>
                        </div>

                        {recentCreators.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                                <Users className="h-8 w-8 text-slate-300 mx-auto" />
                                <p>Chưa có Creator nào được lưu qua tiện ích.</p>
                                <p className="text-[11px] text-slate-400">Hãy cài đặt tiện ích và lưu Creator đầu tiên!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentCreators.map((creator) => {
                                    const primaryAcc = creator.accounts[0];
                                    return (
                                        <div key={creator.id} className="py-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <Link
                                                    href={route('creators.show', creator.id)}
                                                    className="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate block"
                                                >
                                                    {creator.name}
                                                </Link>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                    {primaryAcc && (
                                                        <span className="font-mono text-indigo-600">
                                                            @{primaryAcc.handle}
                                                        </span>
                                                    )}
                                                    <span>•</span>
                                                    <span>{creator.niche}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Badge variant="purple">{creator.tier.toUpperCase()}</Badge>
                                                <Link
                                                    href={route('creators.show', creator.id)}
                                                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Banner Cam kết tuân thủ chính sách */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-xl shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1">
                            An Toàn & Chuẩn Mực
                        </div>
                        <h3 className="text-sm font-bold text-white mb-2">
                            Không cào lậu - Hoàn toàn bảo vệ tài khoản
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Tiện ích chỉ đọc thông tin công khai trong phiên duyệt web thực tế của nhân viên, không dùng bot quét ngầm, tránh hoàn toàn rủi ro bị khóa IP, captcha hay vi phạm ToS của TikTok/Facebook.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal Xác nhận thu hồi token */}
            <ConfirmDialog
                isOpen={confirmRevokeOpen}
                title="Thu Hồi Mã API Token Extension?"
                message="Sau khi thu hồi, tiện ích Chrome đang sử dụng mã này sẽ không thể gửi dữ liệu về CRM cho đến khi bạn cấp và cấu hình lại mã mới."
                confirmText="Xác nhận thu hồi"
                cancelText="Hủy bỏ"
                variant="danger"
                loading={isRevoking}
                onConfirm={handleRevokeToken}
                onClose={() => setConfirmRevokeOpen(false)}
            />
        </AppLayout>
    );
}
