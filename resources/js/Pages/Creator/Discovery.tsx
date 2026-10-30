import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Sparkles,
    Search,
    Filter,
    Users,
    Eye,
    ThumbsUp,
    MessageSquare,
    ExternalLink,
    CheckCircle2,
    ShieldCheck,
    Download,
    Layers,
    ArrowRight,
    Zap,
    Plus,
    Check,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';

interface DiscoveredKol {
    platform: string;
    handle: string;
    name: string;
    url: string;
    avatar_url: string;
    bio: string;
    phone: string | null;
    email: string | null;
    followers_count: number;
    average_views: number;
    engagement_rate: number;
    view_engagement_rate: number;
    tier: string;
    niche: string;
    is_already_in_crm: boolean;
    is_live?: boolean;
}

interface Props {
    filters: {
        keyword: string;
        niche: string;
        platform: string;
        tier: string;
        limit: number;
    };
    results: DiscoveredKol[];
}

export default function Discovery({ filters, results }: Props) {
    const { data, setData, get, processing } = useForm({
        keyword: filters.keyword || '',
        niche: filters.niche || 'general',
        platform: filters.platform || 'tiktok',
        tier: filters.tier || 'all',
        limit: filters.limit || 12,
    });

    const [selectedItems, setSelectedItems] = useState<Record<string, DiscoveredKol>>({});
    const [importing, setImporting] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        get(route('creators.discovery'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const toggleSelect = (kol: DiscoveredKol) => {
        const key = `${kol.platform}_${kol.handle}`;
        setSelectedItems((prev) => {
            const next = { ...prev };
            if (next[key]) {
                delete next[key];
            } else {
                next[key] = kol;
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        const unimported = results.filter((r) => !r.is_already_in_crm);
        if (Object.keys(selectedItems).length === unimported.length) {
            setSelectedItems({});
        } else {
            const next: Record<string, DiscoveredKol> = {};
            unimported.forEach((kol) => {
                next[`${kol.platform}_${kol.handle}`] = kol;
            });
            setSelectedItems(next);
        }
    };

    const handleImportSelected = () => {
        const items = Object.values(selectedItems);
        if (items.length === 0) return;

        setImporting(true);
        router.post(
            route('creators.discovery.import'),
            {
                selected: items.map((i) => ({
                    platform: i.platform,
                    handle: i.handle,
                })),
            },
            {
                onFinish: () => setImporting(false),
            }
        );
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const niches = [
        { id: 'general', name: 'Tất Cả Ngành Hàng' },
        { id: 'beauty', name: 'Làm Đẹp & Mỹ Phẩm' },
        { id: 'tech', name: 'Công Nghệ & Đập Hộp' },
        { id: 'food', name: 'Ẩm Thực & Ăn Uống' },
        { id: 'fashion', name: 'Thời Trang & Phối Đồ' },
    ];

    const platforms = [
        { id: 'tiktok', name: 'TikTok' },
        { id: 'youtube', name: 'YouTube' },
        { id: 'instagram', name: 'Instagram' },
        { id: 'facebook', name: 'Facebook' },
        { id: 'shopee', name: 'Shopee Live' },
    ];

    const tiers = [
        { id: 'all', name: 'Tất Cả Phân Hạng' },
        { id: 'nano', name: 'Nano (2k - 10k)' },
        { id: 'micro', name: 'Micro (10k - 100k)' },
        { id: 'macro', name: 'Macro (100k - 1M)' },
        { id: 'mega', name: 'Mega (> 1M)' },
    ];

    const unimportedCount = results.filter((r) => !r.is_already_in_crm).length;
    const selectedCount = Object.keys(selectedItems).length;

    return (
        <AppLayout title="Khám Phá & Tự Động Thu Thập KOL">
            <PageHeader
                title="Khám Phá & Quét KOL Tự Động"
                description="Hệ thống tự động tìm kiếm, phân tích và trích xuất danh sách KOL/KOC theo từ khóa và ngành hàng mà không cần dán link thủ công"
                backHref={route('creators.index')}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Creator CRM', href: route('creators.index') },
                    { label: 'Khám Phá Tự Động' },
                ]}
                actions={
                    <div className="flex items-center gap-2">
                        <Link href={route('creators.import.view')}>
                            <Button variant="secondary" size="sm">
                                Nhập file hoặc dán link
                            </Button>
                        </Link>
                    </div>
                }
            />

            <div className="space-y-6">
                {/* Thanh Tìm Kiếm & Bộ Lọc Nâng Cao */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <form onSubmit={handleSearch} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                            {/* Từ khóa */}
                            <div className="md:col-span-5">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Từ khóa / Hashtag / Tên chủ đề
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={data.keyword}
                                        onChange={(e) => setData('keyword', e.target.value)}
                                        placeholder="Ví dụ: son môi, review mỹ phẩm, đập hộp iphone..."
                                        className="w-full rounded-lg border-slate-300 pl-10 text-sm shadow-xs focus:border-indigo-500 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Ngành hàng */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Ngành hàng
                                </label>
                                <select
                                    value={data.niche}
                                    onChange={(e) => setData('niche', e.target.value)}
                                    className="w-full rounded-lg border-slate-300 text-sm shadow-xs focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    {niches.map((n) => (
                                        <option key={n.id} value={n.id}>
                                            {n.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Nền tảng */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Nền tảng
                                </label>
                                <select
                                    value={data.platform}
                                    onChange={(e) => setData('platform', e.target.value)}
                                    className="w-full rounded-lg border-slate-300 text-sm shadow-xs focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    {platforms.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Phân hạng */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Phân hạng
                                </label>
                                <select
                                    value={data.tier}
                                    onChange={(e) => setData('tier', e.target.value)}
                                    className="w-full rounded-lg border-slate-300 text-sm shadow-xs focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    {tiers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Nút bấm */}
                            <div className="md:col-span-1 flex items-end">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    loading={processing}
                                    loadingText="Đang quét..."
                                    iconLeft={<Sparkles className="h-4 w-4 text-amber-300" />}
                                >
                                    Quét
                                </Button>
                            </div>
                        </div>

                        {/* Gợi ý từ khóa nhanh */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                            <span className="font-semibold">Gợi ý chủ đề hot:</span>
                            {['#reviewmypham', 'công nghệ', 'đập hộp', 'ẩm thực', 'thời trang genz', 'son dưỡng', 'phối đồ'].map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                        setData('keyword', tag);
                                        router.get(
                                            route('creators.discovery'),
                                            { keyword: tag, niche: data.niche, platform: data.platform, tier: data.tier },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>

                {/* Kết Quả Khám Phá */}
                {results.length > 0 ? (
                    <div className="space-y-4">
                        {/* Thanh tác vụ hàng loạt */}
                        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={unimportedCount > 0 && selectedCount === unimportedCount}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Chọn tất cả ({unimportedCount} KOL mới)</span>
                                </label>
                                {selectedCount > 0 && (
                                    <Badge variant="purple" size="sm">
                                        Đã chọn {selectedCount}
                                    </Badge>
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={selectedCount === 0}
                                loading={importing}
                                loadingText="Đang nạp vào CRM..."
                                onClick={handleImportSelected}
                                iconLeft={<Zap className="h-3.5 w-3.5 text-amber-300" />}
                            >
                                Nạp {selectedCount} KOL Đã Chọn Vào CRM
                            </Button>
                        </div>

                        {/* Danh sách thẻ KOL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {results.map((kol) => {
                                const key = `${kol.platform}_${kol.handle}`;
                                const isSelected = !!selectedItems[key];

                                return (
                                    <div
                                        key={key}
                                        className={`rounded-xl border p-5 transition-all bg-white relative flex flex-col justify-between ${
                                            isSelected
                                                ? 'border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                                        }`}
                                    >
                                        <div>
                                            {/* Header thẻ */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={kol.avatar_url}
                                                        alt={kol.name}
                                                        className="h-11 w-11 rounded-full object-cover border border-slate-200"
                                                    />
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
                                                            {kol.name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                @{kol.handle}
                                                            </span>
                                                            <a
                                                                href={kol.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-slate-400 hover:text-indigo-600"
                                                                title="Xem kênh"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                            {kol.is_live && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                    Live
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Checkbox chọn */}
                                                {!kol.is_already_in_crm ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(kol)}
                                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                ) : (
                                                    <Badge variant="success" size="sm">
                                                        Đã có trong CRM
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Bio trích xuất */}
                                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                "{kol.bio}"
                                            </p>

                                            {/* Grid chỉ số tương tác */}
                                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                                    <span className="text-slate-400 block text-[11px]">Followers</span>
                                                    <span className="font-black text-slate-900">
                                                        {formatNumber(kol.followers_count)}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                                    <span className="text-slate-400 block text-[11px]">Views TB (15 bài)</span>
                                                    <span className="font-black text-slate-900">
                                                        {formatNumber(kol.average_views)}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                                    <span className="text-slate-400 block text-[11px]">ER Fan Cứng</span>
                                                    <span className="font-black text-emerald-600">
                                                        {kol.engagement_rate}%
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                                                    <span className="text-slate-400 block text-[11px]">ER Nội Dung</span>
                                                    <span className="font-black text-purple-600">
                                                        {kol.view_engagement_rate}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer thẻ */}
                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="primary" size="sm">
                                                    {kol.platform.toUpperCase()}
                                                </Badge>
                                                <Badge variant="info" size="sm">
                                                    {kol.tier.toUpperCase()}
                                                </Badge>
                                            </div>

                                            {!kol.is_already_in_crm ? (
                                                <Button
                                                    type="button"
                                                    variant={isSelected ? 'primary' : 'secondary'}
                                                    size="sm"
                                                    onClick={() => toggleSelect(kol)}
                                                >
                                                    {isSelected ? 'Đã chọn' : 'Chọn nạp'}
                                                </Button>
                                            ) : (
                                                <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                                                    <Check className="h-3 w-3" /> Đã lưu
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Trạng thái chưa tìm kiếm hoặc không có kết quả */
                    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                        <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                            {filters.keyword ? 'Không tìm thấy KOL phù hợp' : 'Khám Phá Hàng Nghìn KOL / KOC Tiềm Năng'}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            {filters.keyword
                                ? 'Hãy thử điều chỉnh từ khóa hoặc chọn ngành hàng rộng hơn để quét được nhiều Creator hơn.'
                                : 'Nhập từ khóa chủ đề (ví dụ: review mỹ phẩm, công nghệ, thời trang) hoặc chọn Ngành hàng ở trên rồi bấm Quét để hệ thống tự động tìm kiếm.'}
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
