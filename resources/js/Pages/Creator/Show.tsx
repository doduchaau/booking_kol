import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    Phone,
    Mail,
    MapPin,
    ExternalLink,
    ShieldAlert,
    CheckCircle2,
    Calendar,
    Share2,
    DollarSign,
    Sparkles,
    FileText,
    Users,
    GitMerge,
    RefreshCw,
    Eye,
    ThumbsUp,
    MessageSquare,
    Zap,
    AlertCircle,
    Clock,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge, { BadgeVariant } from '@/Components/Common/Badge';

interface Account {
    id: number;
    platform: string;
    handle: string;
    url: string;
    followers_count: number;
    engagement_rate: number;
    view_engagement_rate?: number;
    average_views: number;
    average_likes?: number;
    average_comments?: number;
    average_shares?: number;
    posts_sample_count?: number;
    gmv_estimate: number;
    data_source?: string;
    last_synced_at?: string | null;
    sync_status?: string;
    sync_error_message?: string | null;
}

interface RateCard {
    id: number;
    content_type: string;
    price: string | number;
    currency: string;
    notes?: string;
}

interface Creator {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    shipping_address: string | null;
    city_province: string | null;
    district: string | null;
    niche: string;
    tier: string;
    trust_score: number;
    blacklist_status: boolean;
    blacklist_reason?: string;
    notes: string | null;
    created_at: string;
    accounts: Account[];
    rate_cards: RateCard[];
    merged_profiles?: Creator[];
}

interface Props {
    creator: Creator;
}

export default function Show({ creator }: Props) {
    const [syncingAccountId, setSyncingAccountId] = useState<number | null>(null);

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(val));
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const getTierVariant = (t: string): BadgeVariant => {
        switch (t.toLowerCase()) {
            case 'mega':
                return 'primary';
            case 'macro':
                return 'purple';
            case 'micro':
                return 'info';
            default:
                return 'default';
        }
    };

    const handleSyncAccount = (accountId: number) => {
        setSyncingAccountId(accountId);
        router.post(
            route('creators.accounts.sync', [creator.id, accountId]),
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncingAccountId(null),
            }
        );
    };

    return (
        <AppLayout title={`Chi tiết Creator - ${creator.name}`}>
            {/* Page Header Chuẩn */}
            <PageHeader
                title={creator.name}
                description={`Mã hồ sơ: #${creator.id} • Ngành hàng: ${creator.niche.toUpperCase()}`}
                backHref={route('creators.index')}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Creator CRM', href: route('creators.index') },
                    { label: creator.name },
                ]}
                actions={
                    <div className="flex items-center gap-2">
                        <Badge variant={getTierVariant(creator.tier)} size="md">
                            TIER: {creator.tier.toUpperCase()}
                        </Badge>
                        {creator.blacklist_status && (
                            <Badge
                                variant="danger"
                                size="md"
                                icon={<ShieldAlert className="h-3.5 w-3.5" />}
                            >
                                BLACKLIST
                            </Badge>
                        )}
                    </div>
                }
            />

            <div className="space-y-6">
                {/* Hàng 1: Thẻ tóm tắt thông tin */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Thẻ 1: Thông tin liên hệ */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary-600" />
                            Thông Tin Liên Hệ
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-xs text-slate-500 block">Số điện thoại:</span>
                                <span className="font-semibold text-slate-900">
                                    {creator.phone || <span className="text-slate-400 italic">Chưa cung cấp</span>}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Email:</span>
                                <span className="font-semibold text-slate-900">
                                    {creator.email || <span className="text-slate-400 italic">Chưa cung cấp</span>}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Địa chỉ nhận hàng / gửi mẫu:</span>
                                <span className="font-medium text-slate-800 leading-relaxed block mt-0.5">
                                    {creator.shipping_address ? (
                                        `${creator.shipping_address}${creator.district ? `, ${creator.district}` : ''}${
                                            creator.city_province ? `, ${creator.city_province}` : ''
                                        }`
                                    ) : (
                                        <span className="text-slate-400 italic">Chưa có địa chỉ</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Thẻ 2: Điểm uy tín & Trạng thái */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Đánh Giá Kỷ Luật & Uy Tín
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-xs text-slate-500">Điểm kỷ luật/uy tín:</span>
                                    <span className="font-bold text-slate-900">{creator.trust_score} / 100</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            creator.trust_score >= 80
                                                ? 'bg-emerald-500'
                                                : creator.trust_score >= 50
                                                ? 'bg-amber-500'
                                                : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${creator.trust_score}%` }}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 text-xs text-slate-500 leading-relaxed">
                                {creator.trust_score >= 80 ? (
                                    <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4" /> Kỷ luật tốt, lên video đúng hẹn và bảo quản mẫu cẩn thận.
                                    </span>
                                ) : (
                                    <span className="text-amber-700 font-medium flex items-center gap-1.5">
                                        <ShieldAlert className="h-4 w-4" /> Cần lưu ý theo dõi tiến độ khi gửi mẫu.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Thẻ 3: Ghi chú nội bộ */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary-600" />
                            Ghi Chú Nội Bộ
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {creator.notes || <span className="text-slate-400 italic">Chưa có ghi chú nào về Creator này.</span>}
                        </p>
                    </div>
                </div>

                {/* Hàng 2: Kênh Mạng Xã Hội & Bảng Chỉ Số Tương Tác 15 Bài Gần Nhất */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-indigo-600" />
                                Kênh Mạng Xã Hội & Chỉ Số Tương Tác
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Dữ liệu được chuẩn hóa từ Data Provider: loại bỏ bài ghim, tính tương tác trung bình 15 bài gần nhất
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200/80">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span>Tự động làm mới định kỳ mỗi 7 ngày</span>
                        </div>
                    </div>

                    {creator.accounts && creator.accounts.length > 0 ? (
                        <div className="space-y-4">
                            {creator.accounts.map((acc) => {
                                const isSyncing = syncingAccountId === acc.id || acc.sync_status === 'syncing' || acc.sync_status === 'pending';

                                return (
                                    <div
                                        key={acc.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 transition-all hover:bg-white hover:shadow-sm space-y-4"
                                    >
                                        {/* Header của Kênh */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="primary" size="md">
                                                    {acc.platform.toUpperCase()}
                                                </Badge>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-base">
                                                            @{acc.handle}
                                                        </span>
                                                        <a
                                                            href={acc.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                            title="Mở kênh trên mạng xã hội"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                        <span>Nguồn: <strong>{acc.data_source || 'manual'}</strong></span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {acc.last_synced_at
                                                                ? `Đồng bộ: ${new Date(acc.last_synced_at).toLocaleDateString('vi-VN')} ${new Date(acc.last_synced_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                                                                : 'Chưa từng đồng bộ'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Trạng thái & Nút Làm Mới */}
                                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                                {acc.sync_status === 'syncing' && (
                                                    <Badge variant="info" size="sm">Đang đồng bộ...</Badge>
                                                )}
                                                {acc.sync_status === 'failed' && (
                                                    <Badge variant="danger" size="sm">Lỗi đồng bộ</Badge>
                                                )}
                                                {acc.sync_status === 'success' && (
                                                    <Badge variant="success" size="sm">Đã đồng bộ</Badge>
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    disabled={isSyncing}
                                                    loading={isSyncing}
                                                    loadingText="Đang gửi..."
                                                    onClick={() => handleSyncAccount(acc.id)}
                                                    iconLeft={<RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
                                                >
                                                    Làm mới số liệu
                                                </Button>
                                            </div>
                                        </div>

                                        {acc.sync_error_message && (
                                            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                                                <span>Chi tiết lỗi: {acc.sync_error_message}</span>
                                            </div>
                                        )}

                                        {/* Grid 4 Chỉ Số Phân Tích Thực Tế */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                            {/* Followers */}
                                            <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs">
                                                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                                                    Người theo dõi
                                                </span>
                                                <p className="text-lg font-black text-slate-900 mt-1">
                                                    {formatNumber(acc.followers_count)}
                                                </p>
                                            </div>

                                            {/* Avg Views (15 bài gần nhất) */}
                                            <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs">
                                                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <Eye className="h-3.5 w-3.5 text-sky-500" />
                                                    Views TB (15 bài)
                                                </span>
                                                <p className="text-lg font-black text-slate-900 mt-1">
                                                    {formatNumber(acc.average_views)}
                                                </p>
                                            </div>

                                            {/* ER on Followers */}
                                            <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs">
                                                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                                                    ER Fan Cứng (Followers)
                                                </span>
                                                <p className="text-lg font-black text-emerald-600 mt-1">
                                                    {Number(acc.engagement_rate || 0).toFixed(2)}%
                                                </p>
                                            </div>

                                            {/* ER on Views */}
                                            <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs">
                                                <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                                                    ER Nội Dung (Views)
                                                </span>
                                                <p className="text-lg font-black text-purple-600 mt-1">
                                                    {Number(acc.view_engagement_rate || 0).toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Chi tiết trung bình tương tác (Likes / Comments / Shares) */}
                                        {(acc.average_likes !== undefined && acc.average_likes > 0) && (
                                            <div className="text-xs text-slate-500 flex items-center gap-4 pt-1 border-t border-slate-200/60 font-mono">
                                                <span>❤️ Likes TB: <strong>{formatNumber(acc.average_likes)}</strong></span>
                                                <span>💬 Comments TB: <strong>{formatNumber(acc.average_comments || 0)}</strong></span>
                                                <span>🔄 Shares TB: <strong>{formatNumber(acc.average_shares || 0)}</strong></span>
                                                <span className="text-slate-400 italic ml-auto font-sans">
                                                    (Mẫu: {acc.posts_sample_count || 15} bài thường, đã loại trừ bài ghim)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic py-4">Chưa có kênh mạng xã hội nào được liên kết.</p>
                    )}
                </div>

                {/* Hàng 3: Bảng giá tham khảo (Rate Cards) */}
                {creator.rate_cards && creator.rate_cards.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            Bảng Giá Tham Khảo (Rate Card)
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Loại nội dung / Hình thức</th>
                                        <th className="px-4 py-3">Mức giá tham khảo</th>
                                        <th className="px-4 py-3">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {creator.rate_cards.map((rc) => (
                                        <tr key={rc.id}>
                                            <td className="px-4 py-3 font-semibold text-slate-900">
                                                {rc.content_type}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-emerald-600">
                                                {formatCurrency(rc.price)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 text-xs">
                                                {rc.notes || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Hàng 4: Hồ sơ đã gộp (nếu có) */}
                {creator.merged_profiles && creator.merged_profiles.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                            <GitMerge className="h-5 w-5 text-purple-600" />
                            Lịch Sử Hồ Sơ Đã Gộp Vào Creator Này
                        </h3>
                        <div className="divide-y divide-slate-100">
                            {creator.merged_profiles.map((mp) => (
                                <div key={mp.id} className="py-2.5 flex items-center justify-between text-sm">
                                    <div>
                                        <span className="font-semibold text-slate-900">
                                            #{mp.id} - {mp.name}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-2">({mp.phone || 'Không có SĐT'})</span>
                                    </div>
                                    <Badge variant="purple" size="sm">Đã gộp</Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
