import React, { useRef } from 'react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import { ShoppingBag, Plus, Trash2, Link as LinkIcon, FileText, Upload, X, Tag, DollarSign, Package } from 'lucide-react';

export interface CampaignProductFormItem {
    id?: number;
    name: string;
    sku: string;
    product_url: string;
    retail_price: string;
    brief_content: string;
    brief_file: File | null;
    brief_file_url?: string | null;
    brief_file_name?: string | null;
    remove_brief_file?: boolean;
    hashtags: string;
    sample_requirement: string;
}

interface Props {
    products: CampaignProductFormItem[];
    onChange: (products: CampaignProductFormItem[]) => void;
    errors?: Record<string, string>;
}

export default function CampaignProductsBuilder({ products, onChange, errors = {} }: Props) {
    const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    const handleAddProduct = () => {
        onChange([
            ...products,
            {
                name: '',
                sku: '',
                product_url: '',
                retail_price: '',
                brief_content: '',
                brief_file: null,
                hashtags: '',
                sample_requirement: '',
            },
        ]);
    };

    const handleRemoveProduct = (index: number) => {
        if (products.length <= 1) return;
        const updated = products.filter((_, idx) => idx !== index);
        onChange(updated);
    };

    const handleFieldChange = (index: number, field: keyof CampaignProductFormItem, value: any) => {
        const updated = [...products];
        updated[index] = {
            ...updated[index],
            [field]: value,
        };
        onChange(updated);
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-primary-600" />
                        Danh Sách Sản Phẩm & Brief Riêng Cho Từng Món
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Một chiến dịch có thể chứa nhiều sản phẩm (combo). Mỗi sản phẩm có link mua hàng và kịch bản brief riêng.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddProduct}
                    iconLeft={<Plus className="h-4 w-4" />}
                >
                    Thêm Sản Phẩm
                </Button>
            </div>

            <div className="space-y-4">
                {products.map((p, idx) => {
                    const nameError = errors[`products.${idx}.name`];
                    const urlError = errors[`products.${idx}.product_url`];
                    const priceError = errors[`products.${idx}.retail_price`];
                    const fileError = errors[`products.${idx}.brief_file`];

                    return (
                        <div
                            key={idx}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4 relative transition-all hover:border-slate-300"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-100 text-primary-800">
                                    <ShoppingBag className="h-3.5 w-3.5" />
                                    Sản phẩm #{idx + 1}
                                </span>

                                {products.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveProduct(idx)}
                                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50"
                                        title="Xóa sản phẩm này"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Dòng 1: Tên & Link SP */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Tên sản phẩm" required error={nameError}>
                                    <TextInput
                                        value={p.name}
                                        onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                                        placeholder="Ví dụ: Serum Phục Hồi Da B5 30ml"
                                        error={!!nameError}
                                    />
                                </FormField>

                                <FormField label="Link sản phẩm (TikTok Shop / Shopee / Web)" error={urlError}>
                                    <TextInput
                                        value={p.product_url}
                                        onChange={(e) => handleFieldChange(idx, 'product_url', e.target.value)}
                                        placeholder="https://shop.tiktok.com/view/product/..."
                                        iconLeft={<LinkIcon className="h-4 w-4" />}
                                        error={!!urlError}
                                    />
                                </FormField>
                            </div>

                            {/* Dòng 2: SKU, Giá niêm yết, Hashtags */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField label="Mã SKU kho">
                                    <TextInput
                                        value={p.sku}
                                        onChange={(e) => handleFieldChange(idx, 'sku', e.target.value)}
                                        placeholder="Ví dụ: SKU-B5-30ML"
                                    />
                                </FormField>

                                <FormField label="Giá niêm yết (VNĐ)" error={priceError}>
                                    <TextInput
                                        type="number"
                                        value={p.retail_price}
                                        onChange={(e) => handleFieldChange(idx, 'retail_price', e.target.value)}
                                        placeholder="350000"
                                        iconLeft={<DollarSign className="h-4 w-4" />}
                                        error={!!priceError}
                                    />
                                </FormField>

                                <FormField label="Hashtags riêng cho sản phẩm">
                                    <TextInput
                                        value={p.hashtags}
                                        onChange={(e) => handleFieldChange(idx, 'hashtags', e.target.value)}
                                        placeholder="#SerumB5 #ReviewSerum"
                                        iconLeft={<Tag className="h-4 w-4" />}
                                    />
                                </FormField>
                            </div>

                            {/* Dòng 3: Brief độc lập của sản phẩm */}
                            <div className="space-y-3 pt-3 border-t border-slate-200/80">
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-amber-600" />
                                    <span>Brief & Hướng Dẫn Kịch Bản Riêng Của Sản Phẩm Này</span>
                                </div>

                                <FormField label="Kịch bản nội dung, góc quay & thông điệp USP của sản phẩm">
                                    <textarea
                                        value={p.brief_content}
                                        onChange={(e) => handleFieldChange(idx, 'brief_content', e.target.value)}
                                        placeholder="Mô tả thông điệp chính, góc quay cận cảnh giọt serum, cảm nhận thẩm thấu sau 10 giây..."
                                        rows={3}
                                        className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                    />
                                </FormField>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Upload file brief riêng */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">
                                            File Brief / Moodboard đính kèm riêng cho sản phẩm
                                        </label>
                                        <input
                                            type="file"
                                            ref={(el) => (fileInputRefs.current[idx] = el)}
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                handleFieldChange(idx, 'brief_file', file);
                                                handleFieldChange(idx, 'remove_brief_file', false);
                                            }}
                                        />

                                        {p.brief_file ? (
                                            <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white text-xs">
                                                <div className="flex items-center gap-2 truncate">
                                                    <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                                                    <span className="font-semibold text-slate-800 truncate">
                                                        {p.brief_file.name}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleFieldChange(idx, 'brief_file', null);
                                                        if (fileInputRefs.current[idx]) {
                                                            fileInputRefs.current[idx]!.value = '';
                                                        }
                                                    }}
                                                    className="text-slate-400 hover:text-rose-600 p-0.5"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : p.brief_file_url && !p.remove_brief_file ? (
                                            <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white text-xs">
                                                <a
                                                    href={p.brief_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 text-primary-600 hover:underline truncate"
                                                >
                                                    <FileText className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">{p.brief_file_name || 'File brief hiện tại'}</span>
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFieldChange(idx, 'remove_brief_file', true)}
                                                    className="text-slate-400 hover:text-rose-600 p-0.5"
                                                    title="Xóa file cũ"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs.current[idx]?.click()}
                                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-600 bg-white transition-colors"
                                            >
                                                <Upload className="h-3.5 w-3.5" />
                                                Tải file brief riêng (.pdf, .docx, ảnh)
                                            </button>
                                        )}
                                        {fileError && <p className="text-xs text-rose-600 mt-1">{fileError}</p>}
                                    </div>

                                    {/* Quy định mẫu của sản phẩm */}
                                    <FormField label="Lưu ý khi gửi mẫu (phân loại tone màu, size, dung tích)">
                                        <TextInput
                                            value={p.sample_requirement}
                                            onChange={(e) => handleFieldChange(idx, 'sample_requirement', e.target.value)}
                                            placeholder="Ví dụ: KOC chọn Tone 01 hoặc Tone 02 khi điền form"
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

