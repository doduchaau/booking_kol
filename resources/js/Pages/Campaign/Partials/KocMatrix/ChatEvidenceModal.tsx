import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    UploadCloud,
    Paperclip,
    FileText,
    Image as ImageIcon,
    Download,
    Trash2,
    Eye,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Maximize2,
    User,
    Calendar,
    MessageSquare,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';
import { router } from '@inertiajs/react';
import { CampaignCreatorPivot, ChatEvidenceItem } from './types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: CampaignCreatorPivot | null;
    campaignId: number;
    campaignName?: string;
    currentUserId?: number;
    isAdminOrLeader?: boolean;
}

export default function ChatEvidenceModal({
    isOpen,
    onClose,
    item,
    campaignId,
    campaignName,
    currentUserId,
    isAdminOrLeader = false,
}: Props) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [notes, setNotes] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens or item changes
    useEffect(() => {
        if (isOpen) {
            setSelectedFiles([]);
            setNotes('');
            setUploadError(null);
            setUploadSuccess(null);
            setLightboxUrl(null);
            setIsDeletingId(null);
        }
    }, [isOpen, item?.id]);

    if (!isOpen || !item) return null;

    const evidences: ChatEvidenceItem[] = (item.chatEvidences || item.chat_evidences || []) as ChatEvidenceItem[];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            // Validate file size (10MB max per file)
            const oversizedFiles = filesArray.filter((f) => f.size > 10 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                setUploadError(`Có ${oversizedFiles.length} file vượt quá giới hạn 10MB.`);
                return;
            }
            setSelectedFiles((prev) => [...prev, ...filesArray]);
            setUploadError(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const filesArray = Array.from(e.dataTransfer.files);
            const oversizedFiles = filesArray.filter((f) => f.size > 10 * 1024 * 1024);
            if (oversizedFiles.length > 0) {
                setUploadError(`Có ${oversizedFiles.length} file vượt quá giới hạn 10MB.`);
                return;
            }
            setSelectedFiles((prev) => [...prev, ...filesArray]);
            setUploadError(null);
        }
    };

    const handleRemoveSelectedFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0) {
            setUploadError('Vui lòng chọn ít nhất một ảnh hoặc file tài liệu.');
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        setUploadSuccess(null);

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append('files[]', file);
        });
        if (notes.trim()) {
            formData.append('notes', notes.trim());
        }

        router.post(
            route('campaigns.creators.chat-evidences.store', {
                campaign: campaignId,
                creator: item.id,
            }),
            formData,
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setIsUploading(false);
                    setSelectedFiles([]);
                    setNotes('');
                    setUploadSuccess('Đã tải lên bằng chứng thành công!');
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    setTimeout(() => setUploadSuccess(null), 3000);
                },
                onError: (errs) => {
                    setIsUploading(false);
                    const errorMsg =
                        Object.values(errs)[0] || 'Tải file thất bại. Vui lòng thử lại.';
                    setUploadError(typeof errorMsg === 'string' ? errorMsg : 'Lỗi tải lên.');
                },
            }
        );
    };

    const handleDeleteEvidence = (evidenceId: number) => {
        if (!confirm('Bạn có chắc chắn muốn xóa file bằng chứng này? Thao tác không thể hoàn tác.')) {
            return;
        }

        setIsDeletingId(evidenceId);
        router.delete(
            route('campaigns.creators.chat-evidences.destroy', {
                campaign: campaignId,
                creator: item.id,
                evidence: evidenceId,
            }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeletingId(null);
                },
                onError: () => {
                    setIsDeletingId(null);
                    alert('Không thể xóa file. Vui lòng kiểm tra lại quyền hạn.');
                },
            }
        );
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* 1. Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 shadow-2xs">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">
                                    Bằng Chứng Trao Đổi & Đối Soát KOC
                                </h3>
                                <Badge variant="primary" size="sm">
                                    {evidences.length} file
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                KOC: <span className="font-semibold text-slate-700">{item.creator?.name}</span>
                                {item.creator?.phone && (
                                    <span> • SĐT: <span className="font-semibold text-slate-700">{item.creator.phone}</span></span>
                                )}
                                {campaignName && <span> • Chiến dịch: <span className="text-slate-600">{campaignName}</span></span>}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 2. Body Nội Dung (Cuộn mượt) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Thông báo Alert */}
                    {uploadSuccess && (
                        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 animate-in fade-in">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{uploadSuccess}</span>
                        </div>
                    )}
                    {uploadError && (
                        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-800 animate-in fade-in">
                            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {/* Vùng Tải Lên Nhiều File (Upload Box) */}
                    <form onSubmit={handleUploadSubmit} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <UploadCloud className="h-4 w-4 text-primary-600" />
                                Tải Lên Bằng Chứng Mới (Nhiều Ảnh / File)
                            </span>
                            <span className="text-[11px] text-slate-500">
                                Định dạng: PNG, JPG, WEBP, PDF, Word • Tối đa 10MB/file
                            </span>
                        </div>

                        {/* Drag & drop dropzone */}
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                isDragging
                                    ? 'border-primary-500 bg-primary-50/50'
                                    : 'border-slate-300 hover:border-primary-400 hover:bg-white'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Paperclip className="h-4 w-4 text-primary-600" />
                                <span className="font-semibold text-primary-600 hover:underline">
                                    Bấm để chọn file
                                </span>
                                <span>hoặc kéo thả ảnh/tài liệu vào đây</span>
                            </div>
                        </div>

                        {/* Danh sách các file chuẩn bị upload */}
                        {selectedFiles.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="text-[11px] font-semibold text-slate-700">
                                    Đã chọn ({selectedFiles.length} file):
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-white border border-slate-200">
                                    {selectedFiles.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-[11px] text-slate-700 border border-slate-200"
                                        >
                                            {file.type.startsWith('image/') ? (
                                                <ImageIcon className="h-3 w-3 text-teal-600" />
                                            ) : (
                                                <FileText className="h-3 w-3 text-blue-600" />
                                            )}
                                            <span className="truncate max-w-[140px]" title={file.name}>
                                                {file.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                ({(file.size / 1024).toFixed(0)} KB)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSelectedFile(idx)}
                                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ghi chú đợt tải */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ghi chú đối soát (Ví dụ: Chụp màn hình Zalo chốt giá 2M, KOC xác nhận địa chỉ...)"
                                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                disabled={isUploading || selectedFiles.length === 0}
                                iconLeft={isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            >
                                {isUploading ? 'Đang tải lên...' : `Tải lên (${selectedFiles.length})`}
                            </Button>
                        </div>
                    </form>

                    {/* Danh sách Bằng Chứng Đã Tải Lên (Gallery) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-slate-600" />
                                Danh Sách Bằng Chứng Đã Lưu ({evidences.length})
                            </h4>
                            <span className="text-[11px] text-slate-500">
                                Bằng chứng ảnh sẽ tự động được nhúng vào file Excel khi xuất báo cáo đối soát
                            </span>
                        </div>

                        {evidences.length === 0 ? (
                            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-2">
                                    <Paperclip className="h-6 w-6" />
                                </div>
                                <p className="text-xs font-semibold text-slate-700">Chưa có bằng chứng nhắn tin nào</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Hãy tải lên ảnh chụp màn hình trao đổi với KOC ở khung phía trên để làm evidence đối soát.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {evidences.map((ev) => {
                                    const isImg = ev.is_image;
                                    const canDelete =
                                        isAdminOrLeader ||
                                        (currentUserId && ev.uploaded_by === currentUserId);

                                    return (
                                        <div
                                            key={ev.id}
                                            className="group relative flex flex-col rounded-xl border border-slate-200 bg-white hover:border-primary-300 hover:shadow-xs transition-all overflow-hidden"
                                        >
                                            {/* Preview Thumbnail */}
                                            {isImg && ev.file_url ? (
                                                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setLightboxUrl(ev.file_url!)}>
                                                    <img
                                                        src={ev.file_url}
                                                        alt={ev.file_name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <span className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white shadow-2xs">
                                                            <Maximize2 className="h-4 w-4" />
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center aspect-video w-full bg-slate-50 border-b border-slate-100 text-slate-400">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <FileText className="h-8 w-8 text-slate-400" />
                                                        <span className="text-[10px] font-semibold uppercase bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                                                            {ev.file_name.split('.').pop() || 'FILE'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Card Content & Metadata */}
                                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                                                <div>
                                                    <div className="flex items-start justify-between gap-1">
                                                        <h5
                                                            className="text-xs font-semibold text-slate-800 truncate"
                                                            title={ev.file_name}
                                                        >
                                                            {ev.file_name}
                                                        </h5>
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            {ev.formatted_file_size || `${(ev.file_size / 1024).toFixed(0)} KB`}
                                                        </span>
                                                    </div>

                                                    {ev.notes && (
                                                        <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-md mt-1 border border-slate-100 italic line-clamp-2" title={ev.notes}>
                                                            "{ev.notes}"
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                                    <div className="flex flex-col">
                                                        <span className="flex items-center gap-1 text-slate-600">
                                                            <User className="h-2.5 w-2.5" />
                                                            {ev.uploadedBy?.name || ev.uploaded_by_user?.name || 'Nhân viên'}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-slate-400 mt-0.5">
                                                            <Calendar className="h-2.5 w-2.5" />
                                                            {formatDate(ev.created_at)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        {ev.file_url && (
                                                            <a
                                                                href={ev.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                download={ev.file_name}
                                                                className="p-1 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                                title="Xem / Tải file"
                                                            >
                                                                <Download className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}

                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteEvidence(ev.id)}
                                                                disabled={isDeletingId === ev.id}
                                                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title="Xóa bằng chứng này"
                                                            >
                                                                {isDeletingId === ev.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                                                                ) : (
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Footer */}
                <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50/70">
                    <Button variant="secondary" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            </div>

            {/* Lightbox Zoom Ảnh Phóng To */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
                    onClick={() => setLightboxUrl(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute -top-10 right-0 p-1 text-white/80 hover:text-white cursor-pointer"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <img
                            src={lightboxUrl}
                            alt="Phóng to bằng chứng"
                            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
