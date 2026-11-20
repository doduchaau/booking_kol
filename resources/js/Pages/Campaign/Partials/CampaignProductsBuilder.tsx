import React, { useRef, useState } from 'react';
import FormField from '@/Components/Form/FormField';
import TextInput from '@/Components/Form/TextInput';
import Button from '@/Components/Common/Button';
import {
    ShoppingBag,
    Plus,
    Trash2,
    Link as LinkIcon,
    FileText,
    Upload,
    X,
    Tag,
    DollarSign,
    Image as ImageIcon,
    ImagePlus,
    Eye,
    Paperclip,
    FileSpreadsheet,
    FileCode,
    FileCheck,
    Download,
    ExternalLink,
} from 'lucide-react';

export interface ExistingProductFile {
    path: string;
    url: string;
    name: string;
    size?: number | null;
    type?: string | null;
}

export interface LocalPreviewImage {
    file: File;
    previewUrl: string;
    name: string;
    size: number;
}

export interface CampaignProductFormItem {
    id?: number;
    name: string;
    sku: string;
    product_url: string;
    retail_price: string;
    brief_content: string;
    hashtags: string;
    sample_requirement: string;

    // Đa ảnh sản phẩm
    images?: File[];
    preview_images?: LocalPreviewImage[];
    existing_images?: ExistingProductFile[];
    removed_image_paths?: string[];

    // Đa file brief / kịch bản
    brief_files?: File[];
    existing_brief_files?: ExistingProductFile[];
    removed_brief_file_paths?: string[];

    // Tương thích ngược
    thumbnail_url?: string | null;
    brief_file?: File | null;
    brief_file_url?: string | null;
    brief_file_name?: string | null;
    remove_brief_file?: boolean;
}

interface Props {
    products: CampaignProductFormItem[];
    onChange: (products: CampaignProductFormItem[]) => void;
    errors?: Record<string, string>;
}

// Hàm format dung lượng file
function formatBytes(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Icon tương ứng cho từng loại file
function getFileIcon(fileName: string, mimeType?: string | null) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) {
        return <FileText className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    if (['doc', 'docx'].includes(ext)) {
        return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
        return <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        return <ImageIcon className="h-4 w-4 text-purple-500 shrink-0" />;
    }
    return <FileText className="h-4 w-4 text-slate-500 shrink-0" />;
}

export default function CampaignProductsBuilder({ products, onChange, errors = {} }: Props) {
    const imageInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
    const briefInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    // Modal xem trước ảnh kích thước lớn (Lightbox)
    const [previewModalImage, setPreviewModalImage] = useState<{ url: string; name: string } | null>(null);

    const handleAddProduct = () => {
        onChange([
            ...products,
            {
                name: '',
                sku: '',
                product_url: '',
                retail_price: '',
                brief_content: '',
                hashtags: '',
                sample_requirement: '',
                images: [],
                preview_images: [],
                existing_images: [],
                removed_image_paths: [],
                brief_files: [],
                existing_brief_files: [],
                removed_brief_file_paths: [],
                brief_file: null,
            },
        ]);
    };

    const handleRemoveProduct = (index: number) => {
        if (products.length <= 1) return;
        // Giải phóng các object URLs của sản phẩm bị xóa
        const p = products[index];
        if (p?.preview_images) {
            p.preview_images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        }
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

    // 1. Thêm ảnh mới (Multiple Images)
    const handleAddImages = (index: number, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const currentProd = products[index];
        const existingLocalFiles = currentProd.images || [];
        const existingLocalPreviews = currentProd.preview_images || [];

        const newFiles: File[] = [];
        const newPreviews: LocalPreviewImage[] = [];

        Array.from(files).forEach((file) => {
            // Kiểm tra trùng tên/size sơ bộ
            const alreadyAdded = existingLocalFiles.some((f) => f.name === file.name && f.size === file.size);
            if (!alreadyAdded) {
                newFiles.push(file);
                newPreviews.push({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    name: file.name,
                    size: file.size,
                });
            }
        });

        const updated = [...products];
        updated[index] = {
            ...updated[index],
            images: [...existingLocalFiles, ...newFiles],
            preview_images: [...existingLocalPreviews, ...newPreviews],
        };
        onChange(updated);

        // Reset input để có thể chọn lại cùng file
        if (imageInputRefs.current[index]) {
            imageInputRefs.current[index]!.value = '';
        }
    };

    // Xóa ảnh mới chọn (local preview)
    const handleRemoveLocalImage = (prodIndex: number, imageIndex: number) => {
        const currentProd = products[prodIndex];
        const localPreviews = currentProd.preview_images || [];
        const localFiles = currentProd.images || [];

        // Revoke URL để giải phóng RAM
        if (localPreviews[imageIndex]) {
            URL.revokeObjectURL(localPreviews[imageIndex].previewUrl);
        }

        const nextPreviews = localPreviews.filter((_, idx) => idx !== imageIndex);
        const nextFiles = localFiles.filter((_, idx) => idx !== imageIndex);

        const updated = [...products];
        updated[prodIndex] = {
            ...updated[prodIndex],
            images: nextFiles,
            preview_images: nextPreviews,
        };
        onChange(updated);
    };

    // Xóa ảnh đã lưu từ trước trên server (Existing Image)
    const handleRemoveExistingImage = (prodIndex: number, imagePath: string) => {
        const currentProd = products[prodIndex];
        const existing = currentProd.existing_images || [];
        const removed = currentProd.removed_image_paths || [];

        const nextExisting = existing.filter((img) => img.path !== imagePath);
        const nextRemoved = [...removed, imagePath];

        const updated = [...products];
        updated[prodIndex] = {
            ...updated[prodIndex],
            existing_images: nextExisting,
            removed_image_paths: nextRemoved,
        };
        onChange(updated);
    };

    // 2. Thêm file brief mới (Multiple Brief Files)
    const handleAddBriefFiles = (index: number, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const currentProd = products[index];
        const existingFiles = currentProd.brief_files || [];

        const newFiles: File[] = [];
        Array.from(files).forEach((file) => {
            const alreadyAdded = existingFiles.some((f) => f.name === file.name && f.size === file.size);
            if (!alreadyAdded) {
                newFiles.push(file);
            }
        });

        const updated = [...products];
        updated[index] = {
            ...updated[index],
            brief_files: [...existingFiles, ...newFiles],
            // Xóa flag remove_brief_file nếu có
            remove_brief_file: false,
        };
        onChange(updated);

        if (briefInputRefs.current[index]) {
            briefInputRefs.current[index]!.value = '';
        }
    };

    // Xóa file brief mới chọn (local)
    const handleRemoveLocalBriefFile = (prodIndex: number, fileIndex: number) => {
        const currentProd = products[prodIndex];
        const localFiles = currentProd.brief_files || [];
        const nextFiles = localFiles.filter((_, idx) => idx !== fileIndex);

        const updated = [...products];
        updated[prodIndex] = {
            ...updated[prodIndex],
            brief_files: nextFiles,
        };
        onChange(updated);
    };

    // Xóa file brief đã lưu từ server (Existing Brief File)
    const handleRemoveExistingBriefFile = (prodIndex: number, filePath: string) => {
        const currentProd = products[prodIndex];
        const existing = currentProd.existing_brief_files || [];
        const removed = currentProd.removed_brief_file_paths || [];

        const nextExisting = existing.filter((f) => f.path !== filePath);
        const nextRemoved = [...removed, filePath];

        const updated = [...products];
        updated[prodIndex] = {
            ...updated[prodIndex],
            existing_brief_files: nextExisting,
            removed_brief_file_paths: nextRemoved,
            // Nếu file xóa trùng với brief_file cũ
            remove_brief_file: currentProd.brief_file_url?.includes(filePath) ? true : currentProd.remove_brief_file,
        };
        onChange(updated);
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-primary-600" />
                        Danh Sách Sản Phẩm & Tài Liệu Brief Riêng
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Thiết lập thông tin, bộ sưu tập ảnh và kịch bản brief độc lập cho từng sản phẩm trong chiến dịch (combo).
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

            {/* List products */}
            <div className="space-y-6">
                {products.map((p, idx) => {
                    const nameError = errors[`products.${idx}.name`];
                    const urlError = errors[`products.${idx}.product_url`];
                    const priceError = errors[`products.${idx}.retail_price`];
                    const imagesError = errors[`products.${idx}.images`];
                    const briefsError = errors[`products.${idx}.brief_files`];

                    const existingImages = p.existing_images || [];
                    const localPreviews = p.preview_images || [];
                    const totalImagesCount = existingImages.length + localPreviews.length;

                    const existingBriefs = p.existing_brief_files || [];
                    const localBriefs = p.brief_files || [];
                    const totalBriefsCount = existingBriefs.length + localBriefs.length;

                    return (
                        <div
                            key={idx}
                            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-5 relative transition-all hover:border-slate-300"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-primary-100 text-primary-800">
                                    <ShoppingBag className="h-3.5 w-3.5" />
                                    Sản phẩm #{idx + 1} {p.name ? `- ${p.name}` : ''}
                                </span>

                                {products.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveProduct(idx)}
                                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
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

                            {/* PHẦN 1: BỘ SƯU TẬP ẢNH SẢN PHẨM & XEM TRƯỚC (PREVIEW THUMBNAILS) */}
                            <div className="space-y-3 pt-3 border-t border-slate-200/80">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <ImageIcon className="h-4 w-4 text-primary-600" />
                                        <span>Bộ Sưu Tập Ảnh Sản Phẩm ({totalImagesCount} ảnh)</span>
                                    </label>
                                    <span className="text-[11px] text-slate-500">
                                        Hỗ trợ chọn nhiều ảnh (.jpg, .png, .webp). Ảnh đầu tiên tự động làm ảnh bìa.
                                    </span>
                                </div>

                                <input
                                    type="file"
                                    ref={(el) => (imageInputRefs.current[idx] = el)}
                                    className="hidden"
                                    multiple
                                    accept="image/png,image/jpeg,image/webp,image/jpg"
                                    onChange={(e) => handleAddImages(idx, e.target.files)}
                                />

                                {/* Thumbnail Grid */}
                                <div className="flex flex-wrap gap-3 items-center">
                                    {/* Danh sách ảnh đã lưu từ trước (Server) */}
                                    {existingImages.map((img, imgIdx) => (
                                        <div
                                            key={`exist-${img.path}-${imgIdx}`}
                                            className="group relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all"
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                className="w-full h-full object-cover"
                                            />
                                            {imgIdx === 0 && (
                                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary-600 text-white shadow-xs">
                                                    Ảnh bìa
                                                </span>
                                            )}
                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewModalImage({ url: img.url, name: img.name })}
                                                    className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white hover:text-primary-600 shadow-xs"
                                                    title="Xem ảnh lớn"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveExistingImage(idx, img.path)}
                                                    className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 shadow-xs"
                                                    title="Gỡ ảnh này"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Danh sách ảnh mới chọn từ máy tính (Client preview) */}
                                    {localPreviews.map((preview, prevIdx) => {
                                        const isFirst = existingImages.length === 0 && prevIdx === 0;
                                        return (
                                            <div
                                                key={`local-${preview.name}-${prevIdx}`}
                                                className="group relative w-24 h-24 rounded-xl border-2 border-primary-300 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all ring-2 ring-primary-500/20"
                                            >
                                                <img
                                                    src={preview.previewUrl}
                                                    alt={preview.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                {isFirst ? (
                                                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary-600 text-white shadow-xs">
                                                        Ảnh bìa
                                                    </span>
                                                ) : (
                                                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-600 text-white shadow-xs">
                                                        Mới
                                                    </span>
                                                )}
                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPreviewModalImage({
                                                                url: preview.previewUrl,
                                                                name: preview.name,
                                                            })
                                                        }
                                                        className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white hover:text-primary-600 shadow-xs"
                                                        title="Xem ảnh lớn"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveLocalImage(idx, prevIdx)}
                                                        className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 shadow-xs"
                                                        title="Hủy chọn ảnh"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Nút bấm Thêm Ảnh */}
                                    <button
                                        type="button"
                                        onClick={() => imageInputRefs.current[idx]?.click()}
                                        className="w-24 h-24 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-primary-500 hover:bg-primary-50/30 text-slate-500 hover:text-primary-600 transition-all cursor-pointer group"
                                    >
                                        <ImagePlus className="h-6 w-6 text-slate-400 group-hover:text-primary-600 transition-colors" />
                                        <span className="text-[11px] font-semibold">Thêm ảnh</span>
                                    </button>
                                </div>
                                {imagesError && <p className="text-xs text-rose-600 mt-1">{imagesError}</p>}
                            </div>

                            {/* PHẦN 2: BRIEF & TÀI LIỆU KỊCH BẢN RIÊNG */}
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
                                    {/* Upload nhiều file brief riêng */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-medium text-slate-700">
                                                Tài liệu Brief / Moodboard đính kèm ({totalBriefsCount} file)
                                            </label>
                                            <span className="text-[11px] text-slate-500">PDF, Word, Excel, Ảnh...</span>
                                        </div>

                                        <input
                                            type="file"
                                            ref={(el) => (briefInputRefs.current[idx] = el)}
                                            className="hidden"
                                            multiple
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.zip,.txt"
                                            onChange={(e) => handleAddBriefFiles(idx, e.target.files)}
                                        />

                                        {/* Danh sách các file brief đã có hoặc mới chọn */}
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {/* File đã lưu trên server */}
                                            {existingBriefs.map((file, fIdx) => (
                                                <div
                                                    key={`exist-brief-${file.path}-${fIdx}`}
                                                    className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white text-xs hover:border-slate-300 transition-colors"
                                                >
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 truncate text-slate-800 hover:text-primary-600"
                                                        title="Bấm để mở tải file"
                                                    >
                                                        {getFileIcon(file.name, file.type)}
                                                        <span className="font-semibold truncate">{file.name}</span>
                                                        {file.size ? (
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                ({formatBytes(file.size)})
                                                            </span>
                                                        ) : null}
                                                        <ExternalLink className="h-3 w-3 text-slate-400 shrink-0 ml-0.5" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExistingBriefFile(idx, file.path)}
                                                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50"
                                                        title="Gỡ file này"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* File mới chọn từ máy tính */}
                                            {localBriefs.map((file, fIdx) => (
                                                <div
                                                    key={`local-brief-${file.name}-${fIdx}`}
                                                    className="flex items-center justify-between p-2 rounded-lg border border-primary-200 bg-primary-50/40 text-xs"
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        {getFileIcon(file.name, file.type)}
                                                        <span className="font-semibold text-slate-800 truncate">
                                                            {file.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 shrink-0">
                                                            ({formatBytes(file.size)})
                                                        </span>
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary-100 text-primary-700">
                                                            Mới
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveLocalBriefFile(idx, fIdx)}
                                                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50"
                                                        title="Hủy chọn file"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Nút bấm chọn file brief */}
                                        <button
                                            type="button"
                                            onClick={() => briefInputRefs.current[idx]?.click()}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-600 bg-white transition-colors cursor-pointer"
                                        >
                                            <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Đính kèm thêm file tài liệu / brief (.pdf, .docx, ảnh)</span>
                                        </button>
                                        {briefsError && <p className="text-xs text-rose-600 mt-1">{briefsError}</p>}
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

            {/* LIGHTBOX MODAL XEM TRƯỚC ẢNH PHÓNG TO */}
            {previewModalImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setPreviewModalImage(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                            <span className="text-xs font-bold text-slate-800 truncate max-w-md">
                                {previewModalImage.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewModalImage(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {/* Modal Body */}
                        <div className="p-2 flex items-center justify-center bg-slate-900/5 overflow-auto max-h-[80vh]">
                            <img
                                src={previewModalImage.url}
                                alt={previewModalImage.name}
                                className="max-w-full max-h-[75vh] object-contain rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
