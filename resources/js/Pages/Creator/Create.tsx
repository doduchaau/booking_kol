import React from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2, Save, User, Share2, MapPin, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Select from '@/Components/Form/Select';
import Textarea from '@/Components/Form/Textarea';

interface Props {
    platforms: { value: string; label: string }[];
    tiers: { value: string; label: string }[];
}

interface SocialAccountInput {
    platform: string;
    handle: string;
    followers_count: number;
    url?: string;
}

export default function Create({ platforms, tiers }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        email: '',
        shipping_address: '',
        city_province: '',
        district: '',
        niche: 'beauty',
        tier: 'nano',
        notes: '',
        accounts: [
            { platform: 'tiktok', handle: '', followers_count: 0, url: '' },
        ] as SocialAccountInput[],
    });

    const addAccount = () => {
        setData('accounts', [
            ...data.accounts,
            { platform: 'tiktok', handle: '', followers_count: 0, url: '' },
        ]);
    };

    const removeAccount = (index: number) => {
        const updated = data.accounts.filter((_, i) => i !== index);
        setData('accounts', updated);
    };

    const handleAccountChange = (index: number, field: keyof SocialAccountInput, value: any) => {
        const updated = [...data.accounts];
        let val = value;

        // Nếu người dùng dán cả URL vào ô handle, tự động nhận diện và bóc tách
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('creators.store'));
    };

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <AppLayout title="Thêm Creator mới">
            {/* Header chuẩn có Breadcrumb và Back Button */}
            <PageHeader
                title="Thêm Hồ Sơ Creator Mới"
                description="Nhập thông tin định danh, địa chỉ gửi hàng và liên kết các kênh mạng xã hội"
                backHref={route('creators.index')}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Creator CRM', href: route('creators.index') },
                    { label: 'Thêm mới' },
                ]}
            />

            {/* Banner hiển thị lỗi validation tổng quát nếu có */}
            {hasErrors && (
                <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-xs">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-rose-800">
                                Không thể lưu hồ sơ. Vui lòng kiểm tra lại các thông tin sau:
                            </h3>
                            <ul className="mt-1.5 list-disc list-inside text-xs text-rose-700 space-y-1">
                                {Object.entries(errors).map(([field, msg]) => (
                                    <li key={field}>
                                        <span className="font-semibold">{field}:</span> {msg}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Cột Trái: Thông Tin Chính & Kênh MXH (Chiếm 2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Khối 1: Thông tin cơ bản */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                                <User className="h-5 w-5 text-primary-600" />
                                <h2 className="text-base font-bold text-slate-900">
                                    1. Thông Tin Định Danh & Liên Hệ
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <FormField
                                        label="Họ và tên / Nghệ danh Creator"
                                        required
                                        error={errors.name}
                                    >
                                        <TextInput
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Ví dụ: Nguyễn Văn An (An Tech Review)"
                                            error={!!errors.name}
                                        />
                                    </FormField>
                                </div>

                                <div>
                                    <FormField
                                        label="Số điện thoại"
                                        hint="Hệ thống tự động chuẩn hóa về 10 số"
                                        error={errors.phone}
                                    >
                                        <TextInput
                                            type="tel"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder="0912345678"
                                            error={!!errors.phone}
                                        />
                                    </FormField>
                                </div>

                                <div>
                                    <FormField
                                        label="Email liên hệ"
                                        error={errors.email}
                                    >
                                        <TextInput
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="an.nguyen@example.com"
                                            error={!!errors.email}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        {/* Khối 2: Địa chỉ giao nhận mẫu */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                                <MapPin className="h-5 w-5 text-primary-600" />
                                <h2 className="text-base font-bold text-slate-900">
                                    2. Địa Chỉ Nhận Hàng / Gửi Mẫu
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <FormField
                                        label="Địa chỉ chi tiết (Số nhà, đường, phường/xã)"
                                        error={errors.shipping_address}
                                    >
                                        <TextInput
                                            value={data.shipping_address}
                                            onChange={(e) => setData('shipping_address', e.target.value)}
                                            placeholder="Ví dụ: 123 Nguyễn Trãi, Phường Bến Thành"
                                            error={!!errors.shipping_address}
                                        />
                                    </FormField>
                                </div>

                                <div>
                                    <FormField
                                        label="Tỉnh / Thành phố"
                                        error={errors.city_province}
                                    >
                                        <TextInput
                                            value={data.city_province}
                                            onChange={(e) => setData('city_province', e.target.value)}
                                            placeholder="Ví dụ: TP. Hồ Chí Minh"
                                            error={!!errors.city_province}
                                        />
                                    </FormField>
                                </div>

                                <div>
                                    <FormField
                                        label="Quận / Huyện"
                                        error={errors.district}
                                    >
                                        <TextInput
                                            value={data.district}
                                            onChange={(e) => setData('district', e.target.value)}
                                            placeholder="Ví dụ: Quận 1"
                                            error={!!errors.district}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        {/* Khối 3: Kênh Mạng Xã Hội */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Share2 className="h-5 w-5 text-primary-600" />
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">
                                            3. Kênh Mạng Xã Hội Đang Hoạt Động
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Có thể nhập @handle hoặc dán trực tiếp đường link trang cá nhân
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addAccount}
                                    iconLeft={<Plus className="h-4 w-4" />}
                                >
                                    Thêm kênh
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {data.accounts.map((acc, index) => {
                                    const handleErr = (errors as Record<string, string>)[`accounts.${index}.handle`];
                                    const platformErr = (errors as Record<string, string>)[`accounts.${index}.platform`];

                                    return (
                                        <div
                                            key={index}
                                            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                                        >
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                <div className="w-full sm:w-36 shrink-0">
                                                    <Select
                                                        value={acc.platform}
                                                        onChange={(e) =>
                                                            handleAccountChange(index, 'platform', e.target.value)
                                                        }
                                                        options={platforms}
                                                    />
                                                </div>

                                                <div className="w-full sm:flex-1">
                                                    <TextInput
                                                        value={acc.handle}
                                                        onChange={(e) =>
                                                            handleAccountChange(index, 'handle', e.target.value)
                                                        }
                                                        placeholder="@handle hoặc dán link TikTok/YouTube..."
                                                        error={!!handleErr}
                                                    />
                                                </div>

                                                <div className="w-full sm:w-36 shrink-0">
                                                    <TextInput
                                                        type="number"
                                                        value={acc.followers_count || ''}
                                                        onChange={(e) =>
                                                            handleAccountChange(
                                                                index,
                                                                'followers_count',
                                                                parseInt(e.target.value) || 0
                                                            )
                                                        }
                                                        placeholder="Followers"
                                                    />
                                                </div>

                                                {data.accounts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAccount(index)}
                                                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors self-end sm:self-center"
                                                        title="Xóa kênh này"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {handleErr && (
                                                <p className="text-xs text-rose-600 font-medium pl-1">
                                                    {handleErr}
                                                </p>
                                            )}
                                            {platformErr && (
                                                <p className="text-xs text-rose-600 font-medium pl-1">
                                                    {platformErr}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Cột Phải: Phân Loại & Ghi Chú (Chiếm 1/3) */}
                    <div className="space-y-6">
                        {/* Thẻ Phân loại Niche & Tier */}
                        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary-600" />
                                Phân Loại Hồ Sơ
                            </h3>

                            <FormField label="Phân hạng Creator (Tier)" required error={errors.tier}>
                                <Select
                                    value={data.tier}
                                    onChange={(e) => setData('tier', e.target.value)}
                                    options={tiers}
                                    error={!!errors.tier}
                                />
                            </FormField>

                            <FormField label="Ngành hàng chính (Niche)" required error={errors.niche}>
                                <TextInput
                                    value={data.niche}
                                    onChange={(e) => setData('niche', e.target.value)}
                                    placeholder="Ví dụ: beauty, tech, fashion..."
                                    error={!!errors.niche}
                                />
                            </FormField>

                            <FormField label="Ghi chú nội bộ" error={errors.notes}>
                                <Textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={4}
                                    placeholder="Đặc điểm phong cách, thói quen hợp tác, người liên hệ phụ trách..."
                                />
                            </FormField>
                        </div>

                        {/* Thẻ Quy tắc chống trùng & Lưu */}
                        <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-5 space-y-4">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-600 leading-relaxed">
                                    <p className="font-semibold text-slate-900 mb-1">
                                        Cơ chế kiểm tra trùng lặp
                                    </p>
                                    Hệ thống tự động kiểm tra đối chiếu Số điện thoại và Email với cơ sở dữ liệu để cảnh báo và ngăn ngừa tạo trùng hồ sơ.
                                </div>
                            </div>

                            <div className="pt-2 border-t border-primary-100/60 flex flex-col gap-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    loading={processing}
                                    loadingText="Đang lưu hồ sơ..."
                                    iconLeft={<Save className="h-4 w-4" />}
                                    className="w-full"
                                >
                                    Lưu Creator Mới
                                </Button>

                                <Link href={route('creators.index')} className="w-full">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="w-full"
                                    >
                                        Hủy bỏ
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
