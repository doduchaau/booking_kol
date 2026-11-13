import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    Save,
    ArrowLeft,
    User,
    Share2,
    DollarSign,
    MapPin,
    ShieldAlert,
    Plus,
    Trash2,
    AlertCircle,
    Sparkles,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Select from '@/Components/Form/Select';
import Textarea from '@/Components/Form/Textarea';
import PlatformIcon from '@/Components/Common/PlatformIcon';

interface AccountItem {
    id?: number;
    platform: string;
    handle: string;
    followers_count: number;
    url?: string;
}

interface RateCardItem {
    id?: number;
    content_type: string;
    price: number | string;
    currency?: string;
    notes?: string;
}

interface CreatorData {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    shipping_address: string | null;
    city_province: string | null;
    district: string | null;
    ward: string | null;
    niche: string;
    tier: string;
    trust_score: number;
    blacklist_status: boolean;
    blacklist_reason?: string | null;
    notes: string | null;
    accounts: AccountItem[];
    rate_cards?: RateCardItem[];
}

interface Props {
    creator: CreatorData;
    platforms: { value: string; label: string }[];
    tiers: { value: string; label: string }[];
}

export default function Edit({ creator, platforms, tiers }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: creator.name || '',
        phone: creator.phone || '',
        email: creator.email || '',
        shipping_address: creator.shipping_address || '',
        city_province: creator.city_province || '',
        district: creator.district || '',
        ward: creator.ward || '',
        niche: creator.niche || 'beauty',
        tier: creator.tier || 'nano',
        trust_score: creator.trust_score ?? 100,
        blacklist_status: Boolean(creator.blacklist_status),
        blacklist_reason: creator.blacklist_reason || '',
        notes: creator.notes || '',
        accounts: (creator.accounts && creator.accounts.length > 0
            ? creator.accounts.map((acc) => ({
                id: acc.id,
                platform: acc.platform,
                handle: acc.handle,
                followers_count: acc.followers_count || 0,
                url: acc.url || '',
            }))
            : [
                { platform: 'tiktok', handle: '', followers_count: 0, url: '' },
            ]) as AccountItem[],
        rate_cards: (creator.rate_cards && creator.rate_cards.length > 0
            ? creator.rate_cards.map((rc) => ({
                id: rc.id,
                content_type: rc.content_type || 'Video Review',
                price: rc.price || 0,
                currency: 'VND',
                notes: rc.notes || '',
            }))
            : []) as RateCardItem[],
    });

    // Quản lý kênh mạng xã hội
    const addAccount = () => {
        setData('accounts', [
            ...data.accounts,
            { platform: 'tiktok', handle: '', followers_count: 0, url: '' },
        ]);
    };

    const removeAccount = (index: number) => {
        setData('accounts', data.accounts.filter((_, i) => i !== index));
    };

    const handleAccountChange = (index: number, field: keyof AccountItem, value: any) => {
        const updated = [...data.accounts];
        let val = value;

        // Tự động phân giải nếu người dùng dán URL vào ô handle
        if (field === 'handle' && typeof value === 'string') {
            const raw = value.trim();
            if (raw.includes('tiktok.com/@')) {
                const match = raw.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/i);
                if (match?.[1]) {
                    val = match[1];
                    updated[index].platform = 'tiktok';
                    updated[index].url = raw.split('?')[0];
                }
            } else if (raw.includes('youtube.com/')) {
                const match = raw.match(/youtube\.com\/(?:@|c\/|channel\/)?([a-zA-Z0-9._-]+)/i);
                if (match?.[1]) {
                    val = match[1];
                    updated[index].platform = 'youtube';
                    updated[index].url = raw.split('?')[0];
                }
            } else if (raw.includes('facebook.com/')) {
                const match = raw.match(/facebook\.com\/([a-zA-Z0-9._-]+)/i);
                if (match?.[1]) {
                    val = match[1];
                    updated[index].platform = 'facebook';
                    updated[index].url = raw.split('?')[0];
                }
            } else if (raw.includes('instagram.com/')) {
                const match = raw.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
                if (match?.[1]) {
                    val = match[1];
                    updated[index].platform = 'instagram';
                    updated[index].url = raw.split('?')[0];
                }
            }
        }

        updated[index] = { ...updated[index], [field]: val };
        setData('accounts', updated);
    };

    // Quản lý bảng giá Rate Cards
    const addRateCard = () => {
        setData('rate_cards', [
            ...data.rate_cards,
            { content_type: 'Video Review TikTok', price: 0, currency: 'VND', notes: '' },
        ]);
    };

    const removeRateCard = (index: number) => {
        setData('rate_cards', data.rate_cards.filter((_, i) => i !== index));
    };

    const handleRateCardChange = (index: number, field: keyof RateCardItem, value: any) => {
        const updated = [...data.rate_cards];
        updated[index] = { ...updated[index], [field]: value };
        setData('rate_cards', updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // @ts-ignore
        put(route('creators.update', creator.id));
    };

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <AppLayout title={`Chỉnh Sửa - ${creator.name}`}>
            <Head title={`Chỉnh Sửa - ${creator.name}`} />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
                {/* Page Header Chuẩn */}
                <PageHeader
                    title={`Chỉnh Sửa: ${creator.name}`}
                    description={`Cập nhật thông tin hồ sơ KOC ID #${creator.id}, tài khoản mạng xã hội và bảng giá.`}
                    backHref={route('creators.show', creator.id)}
                    breadcrumbs={[
                        { label: 'Tổng quan', href: route('dashboard') },
                        { label: 'Creator CRM', href: route('creators.index') },
                        { label: creator.name, href: route('creators.show', creator.id) },
                        { label: 'Chỉnh sửa' },
                    ]}
                    actions={
                        <div className="flex items-center gap-3">
                            <Link href={route('creators.show', creator.id)}>
                                <Button variant="secondary" type="button">
                                    Hủy Bỏ
                                </Button>
                            </Link>
                            <Button
                                variant="primary"
                                type="submit"
                                loading={processing}
                                iconLeft={<Save className="h-4 w-4" />}
                            >
                                Lưu Thay Đổi
                            </Button>
                        </div>
                    }
                />

                {/* Banner lỗi tổng quát */}
                {hasErrors && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-sm">Có lỗi xảy ra khi lưu thông tin</h4>
                            <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                                {Object.values(errors).map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* 1. THÔNG TIN CƠ BẢN */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                        <User className="h-5 w-5 text-primary-600" />
                        Thông Tin Cơ Bản
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label="Họ tên / Nghệ danh" required error={errors.name}>
                            <TextInput
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Ví dụ: Ninh Anh Bùi"
                                error={!!errors.name}
                            />
                        </FormField>

                        <FormField label="Ngành hàng (Niche)" required error={errors.niche}>
                            <TextInput
                                value={data.niche}
                                onChange={(e) => setData('niche', e.target.value)}
                                placeholder="Ví dụ: beauty, food, lifestyle..."
                                error={!!errors.niche}
                            />
                        </FormField>

                        <FormField label="Số điện thoại (10 chữ số)" error={errors.phone}>
                            <TextInput
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                placeholder="0912345678"
                                error={!!errors.phone}
                            />
                        </FormField>

                        <FormField label="Email liên hệ" error={errors.email}>
                            <TextInput
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="creator@gmail.com"
                                error={!!errors.email}
                            />
                        </FormField>

                        <FormField label="Phân hạng (Tier)" error={errors.tier}>
                            <Select
                                value={data.tier}
                                onChange={(e) => setData('tier', e.target.value)}
                                options={tiers.map((t) => ({ value: t.value, label: t.label }))}
                                error={!!errors.tier}
                            />
                        </FormField>

                        <FormField label="Điểm uy tín (0 - 100)" error={errors.trust_score}>
                            <TextInput
                                type="number"
                                min={0}
                                max={100}
                                value={data.trust_score}
                                onChange={(e) => setData('trust_score', parseInt(e.target.value) || 0)}
                                error={!!errors.trust_score}
                            />
                        </FormField>
                    </div>

                    {/* Blacklist Control */}
                    <div className="pt-3 border-t border-slate-100 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.blacklist_status}
                                onChange={(e) => setData('blacklist_status', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-sm font-semibold text-rose-700 flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4" />
                                Đưa vào danh sách Blacklist (Cấm hợp tác)
                            </span>
                        </label>

                        {data.blacklist_status && (
                            <FormField label="Lý do đưa vào Blacklist" error={errors.blacklist_reason}>
                                <TextInput
                                    value={data.blacklist_reason || ''}
                                    onChange={(e) => setData('blacklist_reason', e.target.value)}
                                    placeholder="Ví dụ: Bom hàng nhiều lần, phát ngôn tiêu cực..."
                                    error={!!errors.blacklist_reason}
                                />
                            </FormField>
                        )}
                    </div>

                    <FormField label="Ghi chú hồ sơ" error={errors.notes}>
                        <Textarea
                            rows={3}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Ghi chú về phong cách video, tệp fan, tính cách KOC..."
                        />
                    </FormField>
                </div>

                {/* 2. ĐỊA CHỈ GIAO HÀNG */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                        <MapPin className="h-5 w-5 text-primary-600" />
                        Địa Chỉ Nhận Mẫu Sản Phẩm
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-3">
                            <FormField label="Địa chỉ chi tiết (Số nhà, Tên đường)" error={errors.shipping_address}>
                                <TextInput
                                    value={data.shipping_address}
                                    onChange={(e) => setData('shipping_address', e.target.value)}
                                    placeholder="Ví dụ: Tòa Landmark 81, 720A Điện Biên Phủ"
                                    error={!!errors.shipping_address}
                                />
                            </FormField>
                        </div>

                        <FormField label="Tỉnh / Thành phố" error={errors.city_province}>
                            <TextInput
                                value={data.city_province}
                                onChange={(e) => setData('city_province', e.target.value)}
                                placeholder="Ví dụ: TP. Hồ Chí Minh"
                            />
                        </FormField>

                        <FormField label="Quận / Huyện" error={errors.district}>
                            <TextInput
                                value={data.district}
                                onChange={(e) => setData('district', e.target.value)}
                                placeholder="Ví dụ: Bình Thạnh"
                            />
                        </FormField>

                        <FormField label="Phường / Xã" error={errors.ward}>
                            <TextInput
                                value={data.ward}
                                onChange={(e) => setData('ward', e.target.value)}
                                placeholder="Ví dụ: Phường 22"
                            />
                        </FormField>
                    </div>
                </div>

                {/* 3. TÀI KHOẢN MẠNG XÃ HỘI */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Share2 className="h-5 w-5 text-primary-600" />
                            Kênh Mạng Xã Hội ({data.accounts.length})
                        </h2>
                        <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={addAccount}
                            iconLeft={<Plus className="h-4 w-4" />}
                        >
                            Thêm Kênh Mới
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {data.accounts.map((acc, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3 relative group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Kênh #{idx + 1}
                                    </span>
                                    {data.accounts.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeAccount(idx)}
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                                            title="Xóa kênh này"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-3">
                                        <FormField label="Nền tảng">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center">
                                                    <PlatformIcon platform={acc.platform} className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <Select
                                                        value={acc.platform}
                                                        onChange={(e) => handleAccountChange(idx, 'platform', e.target.value)}
                                                        options={platforms.map((p) => ({ value: p.value, label: p.label }))}
                                                    />
                                                </div>
                                            </div>
                                        </FormField>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <FormField label="Username / Handle / Link">
                                            <TextInput
                                                value={acc.handle}
                                                onChange={(e) => handleAccountChange(idx, 'handle', e.target.value)}
                                                placeholder="hoac dán link kênh..."
                                            />
                                        </FormField>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <FormField label="Người theo dõi">
                                            <TextInput
                                                type="number"
                                                min={0}
                                                value={acc.followers_count}
                                                onChange={(e) => handleAccountChange(idx, 'followers_count', parseInt(e.target.value) || 0)}
                                            />
                                        </FormField>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <FormField label="Đường link URL">
                                            <TextInput
                                                value={acc.url || ''}
                                                onChange={(e) => handleAccountChange(idx, 'url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. BẢNG GIÁ DỊCH VỤ (RATE CARDS) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary-600" />
                            Bảng Giá Dịch Vụ - Rate Card ({data.rate_cards.length})
                        </h2>
                        <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={addRateCard}
                            iconLeft={<Plus className="h-4 w-4" />}
                        >
                            Thêm Gói Báo Giá
                        </Button>
                    </div>

                    {data.rate_cards.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                            Chưa có thông tin bảng giá cho KOC này. Bấm "Thêm Gói Báo Giá" để thiết lập mức phí tiêu chuẩn.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.rate_cards.map((rc, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3 relative"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Gói #{idx + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeRateCard(idx)}
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                                            title="Xóa gói này"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                        <div className="sm:col-span-5">
                                            <FormField label="Định dạng nội dung">
                                                <TextInput
                                                    value={rc.content_type}
                                                    onChange={(e) => handleRateCardChange(idx, 'content_type', e.target.value)}
                                                    placeholder="Ví dụ: 1 Video TikTok 60s, Livestream 1h..."
                                                />
                                            </FormField>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <FormField label="Giá thỏa thuận (VND)">
                                                <TextInput
                                                    type="number"
                                                    min={0}
                                                    step={500000}
                                                    value={rc.price}
                                                    onChange={(e) => handleRateCardChange(idx, 'price', parseFloat(e.target.value) || 0)}
                                                    placeholder="5000000"
                                                />
                                            </FormField>
                                        </div>

                                        <div className="sm:col-span-4">
                                            <FormField label="Ghi chú điều kiện">
                                                <TextInput
                                                    value={rc.notes || ''}
                                                    onChange={(e) => handleRateCardChange(idx, 'notes', e.target.value)}
                                                    placeholder="Bao gồm bản quyền 30 ngày, tặng kèm story..."
                                                />
                                            </FormField>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom Sticky Action Bar */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <Link href={route('creators.show', creator.id)}>
                        <Button variant="secondary" type="button">
                            Hủy Bỏ
                        </Button>
                    </Link>
                    <Button
                        variant="primary"
                        type="submit"
                        loading={processing}
                        iconLeft={<Save className="h-4 w-4" />}
                    >
                        Lưu Thay Đổi
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
