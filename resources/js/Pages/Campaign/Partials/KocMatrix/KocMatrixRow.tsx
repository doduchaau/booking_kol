import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Copy,
    Check,
    Clock,
    Package,
    Truck,
    Video,
    CheckCircle2,
    MessageCircle,
    Trash2,
    ExternalLink,
    Sparkles,
    Edit3,
    X,
    Plus,
    RotateCcw,
    FileText,
} from 'lucide-react';
import { CampaignCreatorPivot, STATUS_DEFINITIONS } from './types';
import PlatformLogo, { getPlatformDisplayName } from '@/Components/Common/PlatformLogo';
import KocPlatformCluster from '@/Components/Common/KocPlatformCluster';
import CampaignPlatformBadges from '@/Components/Common/CampaignPlatformBadges';

interface Props {
    item: CampaignCreatorPivot;
    isSelected: boolean;
    isFocused?: boolean;
    onToggleSelect: (id: number) => void;
    staffUsers: { id: number; name: string; email: string }[];
    campaignTargetPlatforms?: string[];
    onInlineAssign: (pivotId: number, staffId: string) => void;
    onInlineCollaborationTypeChange: (pivotId: number, type: string) => void;
    onInlinePlatformsChange?: (pivotId: number, platforms: string[]) => void;
    onInlineNoteChange: (pivotId: number, note: string) => void;
    editingFeeId: number | null;
    tempFeeValue: string;
    onStartEditFee: (id: number, currentFee: string | number) => void;
    onTempFeeChange: (val: string) => void;
    onSaveInlineFee: (id: number) => void;
    onCancelEditFee: () => void;
    onOpenDealModal: (item: CampaignCreatorPivot) => void;
    onOpenConfirmApprovalModal: (item: CampaignCreatorPivot) => void;
    onReopenDeal: (item: CampaignCreatorPivot) => void;
    onCopyPortal: (token: string | null) => void;
    onExtendPortal?: (item: CampaignCreatorPivot) => void;
    copiedToken: string | null;
    onQuickStatusChange: (itemOrId: CampaignCreatorPivot | number, newStatus: string) => void;
    onOpenShipmentModal: (item: CampaignCreatorPivot) => void;
    onOpenVideoModal: (item: CampaignCreatorPivot) => void;
    onOpenNoteModal: (item: CampaignCreatorPivot) => void;
    onOpenZalo: (item: CampaignCreatorPivot) => void;
    onRemoveCreator: (id: number, name: string) => void;
    formatCurrency: (val: string | number) => string;
    formatDate: (val: string) => string;
}

export default React.memo(function KocMatrixRow({
    item,
    isSelected,
    isFocused = false,
    onToggleSelect,
    staffUsers,
    campaignTargetPlatforms,
    onInlineAssign,
    onInlineCollaborationTypeChange,
    onInlinePlatformsChange,
    onInlineNoteChange,
    editingFeeId,
    tempFeeValue,
    onStartEditFee,
    onTempFeeChange,
    onSaveInlineFee,
    onCancelEditFee,
    onOpenDealModal,
    onOpenConfirmApprovalModal,
    onReopenDeal,
    onCopyPortal,
    onExtendPortal,
    copiedToken,
    onQuickStatusChange,
    onOpenShipmentModal,
    onOpenVideoModal,
    onOpenNoteModal,
    onOpenZalo,
    onRemoveCreator,
    formatCurrency,
    formatDate,
}: Props) {
    const creator = item.creator;
    const [isEditingPlatforms, setIsEditingPlatforms] = useState(false);

    const shortStatusLabels: Record<string, string> = {
        new: 'Mới thêm',
        contacted: 'Đã liên hệ',
        waiting_approval: 'Chờ duyệt phí',
        price_proposed: 'Chờ duyệt phí',
        agreed: 'Đã chốt deal',
        deal_closed: 'Đã chốt deal',
        address_confirmed: 'Đã chốt đ/c',
        sample_sent: 'Đã gửi mẫu',
        sample_received: 'Đang làm vid',
        posted: 'Đã lên video',
        completed: 'Nghiệm thu',
        declined: 'Từ chối',
        rejected: 'Từ chối',
        dropped: 'Bom hàng',
    };

    return (
        <tr
            id={`koc-row-${item.id}`}
            className={`transition-all duration-150 ${
                isFocused
                    ? 'bg-primary-50/80 ring-2 ring-primary-500/60 shadow-xs'
                    : isSelected
                    ? 'bg-primary-50/30 hover:bg-slate-50/80'
                    : 'hover:bg-slate-50/80'
            }`}
        >
            {/* 1. Checkbox */}
            <td className="w-9 px-2.5 py-3 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
            </td>

            {/* 2. Creator Info & Kênh MXH */}
            <td className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700 text-xs shadow-2xs">
                        {creator?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                                href={route('creators.show', item.creator_id)}
                                className="font-bold text-slate-900 hover:text-primary-600 transition-colors text-xs truncate max-w-[130px]"
                                title={creator?.name}
                            >
                                {creator?.name}
                            </Link>
                            {isFocused && (
                                <span className="inline-flex items-center rounded bg-primary-600 px-1 py-0.2 text-[9px] font-extrabold text-white shadow-2xs animate-pulse">
                                    Thông báo
                                </span>
                            )}
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {creator?.tier?.toUpperCase()}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span>{creator?.phone || 'Chưa SĐT'}</span>
                            {creator?.city_province && <span>• {creator.city_province}</span>}
                        </div>

                        {creator?.accounts && creator.accounts.length > 0 && (
                            <div className="mt-1">
                                <KocPlatformCluster
                                    accounts={creator.accounts}
                                    bookedPlatforms={item.booking_platforms}
                                    size="xs"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </td>

            {/* 3. Nền tảng Book & Hình thức */}
            <td className="px-3 py-3">
                <div className="space-y-1.5">
                    {/* Cụm logo nền tảng book */}
                    <div className="relative">
                        <div
                            onClick={() => setIsEditingPlatforms(!isEditingPlatforms)}
                            className="cursor-pointer group inline-flex items-center gap-1 hover:opacity-90 transition-opacity"
                            title="Click để điều chỉnh nền tảng giao cho KOC này"
                        >
                            <CampaignPlatformBadges
                                platforms={item.booking_platforms}
                                deliverables={item.platform_deliverables}
                                size="xs"
                                showLabel={false}
                                showStatus={true}
                            />
                            <span className="text-[10px] text-slate-400 group-hover:text-primary-600 font-bold px-1 rounded bg-slate-100 hover:bg-slate-200">
                                ✎
                            </span>
                        </div>

                        {/* Popover Bật/Tắt nền tảng booking */}
                        {isEditingPlatforms && (
                            <div
                                className="absolute left-0 top-full mt-1.5 z-40 w-44 rounded-xl bg-white p-2.5 shadow-xl border border-slate-200 text-xs animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="font-bold text-slate-800 pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
                                    <span>Giao nền tảng</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingPlatforms(false)}
                                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {(campaignTargetPlatforms && campaignTargetPlatforms.length > 0
                                        ? campaignTargetPlatforms
                                        : ['tiktok', 'shopee', 'facebook', 'youtube', 'instagram']
                                    ).map((plat) => {
                                        const cur = item.booking_platforms || [];
                                        const isChecked = cur.includes(plat);
                                        return (
                                            <label
                                                key={plat}
                                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer font-medium text-slate-700 select-none"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        const next = isChecked
                                                            ? cur.filter((p) => p !== plat)
                                                            : [...cur, plat];
                                                        onInlinePlatformsChange?.(item.id, next);
                                                    }}
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                                                />
                                                <PlatformLogo platform={plat} size="xs" />
                                                <span className="text-[11px]">{getPlatformDisplayName(plat)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Hình thức hợp tác */}
                    <select
                        value={item.collaboration_type || ''}
                        onChange={(e) => onInlineCollaborationTypeChange(item.id, e.target.value)}
                        className={`w-full max-w-[110px] py-0.5 pl-2 pr-6 text-[11px] font-semibold rounded-lg border shadow-2xs cursor-pointer focus:ring-2 focus:ring-primary-500 transition-colors ${
                            item.collaboration_type === 'livestream'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/70'
                                : item.collaboration_type === 'both'
                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70'
                                : item.collaboration_type === 'video'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        <option value="">Chưa chọn</option>
                        <option value="video">🎬 Lên Video</option>
                        <option value="livestream">🎙️ Live</option>
                        <option value="both">⚡ Cả 2</option>
                    </select>
                </div>
            </td>

            {/* 4. Trạng thái & Hạn định (Gộp) */}
            <td className="px-3 py-3">
                <div className="space-y-1.5">
                    {/* Dropdown trạng thái */}
                    <div className="relative inline-block w-full">
                        <select
                            value={item.status}
                            onChange={(e) => onQuickStatusChange(item, e.target.value)}
                            className="w-full max-w-[125px] py-1 pl-2 pr-6 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-primary-500 hover:border-slate-300"
                        >
                            {Object.entries(STATUS_DEFINITIONS).map(([stKey, stVal]) => {
                                const isMissingAddressForSent =
                                    stKey === 'sample_sent' && !item.creator?.shipping_address?.trim();
                                const isSent =
                                    Boolean(item.sample_sent_at) ||
                                    ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);
                                const cannotReceiveOrPostYet = ['sample_received', 'posted'].includes(stKey) && !isSent;
                                const hasVideo = Boolean(
                                    (item.content_posts && item.content_posts.length > 0) ||
                                    (item.contentPosts && item.contentPosts.length > 0)
                                );
                                const isMissingVideoForPosted = stKey === 'posted' && !hasVideo;

                                return (
                                    <option key={stKey} value={stKey} disabled={cannotReceiveOrPostYet}>
                                        {shortStatusLabels[stKey] || stVal.label}
                                        {isMissingAddressForSent ? ' ⚠️' : ''}
                                        {cannotReceiveOrPostYet ? ' ⛔' : ''}
                                        {!cannotReceiveOrPostYet && isMissingVideoForPosted ? ' 🔗' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Hạn video đếm ngược */}
                    <div>
                        {item.deadline_info ? (
                            <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    item.deadline_info.status === 'overdue'
                                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                                        : item.deadline_info.status === 'warning'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-50 text-emerald-700'
                                }`}
                            >
                                <Clock className="h-3 w-3" />
                                {item.deadline_info.text}
                            </span>
                        ) : item.sample_sent_at && !item.sample_received_at ? (
                            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                Đang giao
                            </span>
                        ) : ['posted', 'completed'].includes(item.status) ? (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Đúng hạn
                            </span>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">Chưa nhận mẫu</span>
                        )}
                    </div>
                </div>
            </td>

            {/* 5. Mẫu & Video (Deliverables) */}
            <td className="px-3 py-3">
                <div className="space-y-1.5">
                    {/* Phần Mẫu */}
                    {(() => {
                        const isSent =
                            Boolean(item.sample_sent_at) ||
                            ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);
                        const creatorProds = item.creatorProducts || item.creator_products || [];
                        const sentProds = creatorProds.filter((cp) => (cp.quantity_sent || 0) > 0 || cp.sample_status === 'sent' || cp.sample_status === 'received');
                        const totalSent = item.total_samples_sent || sentProds.reduce((sum, cp) => sum + (cp.quantity_sent || 0), 0) || (isSent ? 1 : 0);

                        return (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onOpenShipmentModal(item)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                        isSent
                                            ? 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                    title="Xem chi tiết hoặc gửi mẫu"
                                >
                                    <Package className="h-3 w-3 text-amber-600" />
                                    <span>{isSent ? `Mẫu: ${totalSent} món` : 'Chưa gửi mẫu'}</span>
                                </button>
                            </div>
                        );
                    })()}

                    {/* Phần Video */}
                    {(() => {
                        const posts = item.content_posts || item.contentPosts || [];
                        const count = posts.length;
                        const latest = count > 0 ? posts[posts.length - 1] : null;

                        return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {count > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => onOpenVideoModal(item)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/80 hover:bg-purple-100 transition-colors"
                                    >
                                        <Video className="h-3 w-3 text-purple-600" />
                                        <span>{count} video</span>
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-slate-400 italic">Chưa lên video</span>
                                )}

                                {latest?.post_url && (
                                    <a
                                        href={latest.post_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-primary-600 hover:underline"
                                    >
                                        <span>Link</span>
                                        <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </td>

            {/* 6. Phí Booking & Phụ Trách */}
            <td className="px-3 py-3">
                <div className="space-y-1.5">
                    {/* Phí Booking (Inline Edit) */}
                    <div>
                        {editingFeeId === item.id ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={tempFeeValue}
                                    onChange={(e) => onTempFeeChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveInlineFee(item.id);
                                        if (e.key === 'Escape') onCancelEditFee();
                                    }}
                                    autoFocus
                                    className="w-20 px-1.5 py-0.5 text-xs rounded border border-primary-500 focus:outline-hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => onSaveInlineFee(item.id)}
                                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    <Check className="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    onClick={onCancelEditFee}
                                    className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onStartEditFee(item.id, item.booking_fee)}
                                className="group flex items-center gap-1 font-bold text-slate-900 hover:text-primary-600 text-xs"
                                title="Bấm để sửa nhanh phí booking"
                            >
                                <span>{formatCurrency(item.booking_fee)}</span>
                                <Edit3 className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}
                    </div>

                    {/* Phụ trách */}
                    <select
                        value={item.assigned_to || ''}
                        onChange={(e) => onInlineAssign(item.id, e.target.value)}
                        className="w-full max-w-[120px] py-0.5 pl-1.5 pr-6 text-[11px] rounded-lg border border-slate-200 bg-slate-50/60 text-slate-700 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                    >
                        <option value="">-- PIC --</option>
                        {staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>
            </td>

            {/* 7. Ghi Chú (Ở BÊN NGOÀI) */}
            <td className="px-3 py-3">
                {item.notes ? (
                    <button
                        type="button"
                        onClick={() => onOpenNoteModal(item)}
                        className="group flex items-center gap-1.5 max-w-[130px] w-full text-left py-1 px-2 rounded-lg bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-300 transition-all cursor-pointer"
                        title={`Ghi chú: ${item.notes}\n(Bấm để sửa)`}
                    >
                        <FileText className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                        <span className="truncate text-[11px] text-slate-700 font-medium group-hover:text-primary-700">
                            {item.notes}
                        </span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => onOpenNoteModal(item)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary-600 hover:bg-slate-100 px-2 py-0.5 rounded-md border border-dashed border-slate-300 transition-colors cursor-pointer"
                        title="Bấm để thêm ghi chú"
                    >
                        <Plus className="h-2.5 w-2.5" />
                        <span>Ghi chú</span>
                    </button>
                )}
            </td>

            {/* 8. Kết Nối & Thao Tác (Ở BÊN NGOÀI TRỰC DIỆN 1-CHẠM) */}
            <td className="px-3 py-3 text-right">
                <div className="flex flex-col items-end gap-1.5">
                    {/* Dòng 1: Tiện ích kết nối (Copy Portal, Nhắn Zalo, Xóa KOC) */}
                    <div className="flex items-center gap-1">
                        {/* Nút Sao Chép Link Portal & Gia Hạn */}
                        {item.portal_token ? (() => {
                            const isExpired = item.portal_token_expires_at
                                ? new Date(item.portal_token_expires_at) < new Date()
                                : false;

                            return (
                                <div className="inline-flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => onCopyPortal(item.portal_token)}
                                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold border transition-all shadow-2xs cursor-pointer ${
                                            copiedToken === item.portal_token
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400'
                                                : isExpired
                                                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                        title={
                                            isExpired
                                                ? `Link Portal đã hết hạn (${formatDate(item.portal_token_expires_at!)}). Bấm để sao chép hoặc bấm gia hạn bên cạnh.`
                                                : item.portal_token_expires_at
                                                ? `Link Portal còn hạn đến ${formatDate(item.portal_token_expires_at)}. Bấm để sao chép.`
                                                : 'Link Portal vô thời hạn. Bấm để sao chép.'
                                        }
                                    >
                                        {copiedToken === item.portal_token ? (
                                            <>
                                                <Check className="h-3 w-3 text-emerald-600" />
                                                <span>Đã chép!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3 text-slate-500" />
                                                <span>{isExpired ? 'Portal (Hết hạn)' : 'Portal'}</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Nút Gia Hạn Link 1-chạm */}
                                    {onExtendPortal && (
                                        <button
                                            type="button"
                                            onClick={() => onExtendPortal(item)}
                                            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-primary-600 shadow-2xs transition-colors cursor-pointer"
                                            title="Gia hạn thêm thời hạn cho link Portal"
                                        >
                                            <Clock className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        })() : null}

                        {/* Nút Mở Zalo 1-chạm */}
                        <button
                            type="button"
                            onClick={() => onOpenZalo(item)}
                            className="p-1 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 shadow-2xs transition-colors cursor-pointer"
                            title="Mở mẫu tin nhắn Zalo 1-chạm thông minh"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                        </button>

                        {/* Nút Xóa Khỏi Chiến Dịch */}
                        <button
                            type="button"
                            onClick={() => onRemoveCreator(item.id, creator?.name || 'KOC')}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa KOC khỏi chiến dịch này"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Dòng 2: Nút Hành Động Bước Tiếp Theo Nổi Bật */}
                    <div>
                        {/* KOC MỚI THÊM */}
                        {item.status === 'new' && (
                            <button
                                type="button"
                                onClick={() => onOpenZalo(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                                <MessageCircle className="h-3 w-3" />
                                <span>Tiếp cận Zalo</span>
                            </button>
                        )}

                        {/* ĐÃ LIÊN HỆ */}
                        {item.status === 'contacted' && (
                            <button
                                type="button"
                                onClick={() => onOpenDealModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                                <Sparkles className="h-3 w-3" />
                                <span>Chốt Hợp Tác</span>
                            </button>
                        )}

                        {/* CHỜ DUYỆT CHI PHÍ */}
                        {item.status === 'waiting_approval' && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onOpenConfirmApprovalModal(item)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                    title="Xác nhận Lãnh đạo đã duyệt chi phí"
                                >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Đã duyệt phí</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onReopenDeal(item)}
                                    className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                                    title="Đàm phán lại"
                                >
                                    <RotateCcw className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        )}

                        {/* ĐÃ CHỐT HỢP TÁC */}
                        {item.status === 'agreed' && (
                            <button
                                type="button"
                                onClick={() => onQuickStatusChange(item.id, 'address_confirmed')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-600 text-white hover:bg-cyan-700 shadow-2xs cursor-pointer"
                            >
                                <Check className="h-3 w-3" />
                                <span>Đã có Đ/C</span>
                            </button>
                        )}

                        {/* ĐÃ CHỐT ĐỊA CHỈ */}
                        {item.status === 'address_confirmed' && (
                            <button
                                type="button"
                                onClick={() => onOpenShipmentModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                                <Package className="h-3 w-3" />
                                <span>Gửi mẫu ngay</span>
                            </button>
                        )}

                        {/* ĐÃ GỬI MẪU */}
                        {item.status === 'sample_sent' && (
                            <button
                                type="button"
                                onClick={() => onQuickStatusChange(item.id, 'sample_received')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                                <Truck className="h-3 w-3" />
                                <span>Đã nhận mẫu</span>
                            </button>
                        )}

                        {/* ĐÃ NHẬN MẪU */}
                        {item.status === 'sample_received' && (
                            <button
                                type="button"
                                onClick={() => onOpenVideoModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-pink-600 text-white hover:bg-pink-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                                <Video className="h-3 w-3" />
                                <span>Nộp link video</span>
                            </button>
                        )}

                        {/* ĐÃ LÊN VIDEO */}
                        {item.status === 'posted' && (
                            <button
                                type="button"
                                onClick={() => onQuickStatusChange(item.id, 'completed')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Nghiệm thu</span>
                            </button>
                        )}

                        {/* HOÀN TẤT */}
                        {item.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Hoàn tất</span>
                            </span>
                        )}

                        {/* NGOẠI LỆ */}
                        {['declined', 'no_show'].includes(item.status) && (
                            <button
                                type="button"
                                onClick={() => onQuickStatusChange(item.id, 'new')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                                <span>Khôi phục</span>
                            </button>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
});
