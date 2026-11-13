import React from 'react';
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
} from 'lucide-react';
import { CampaignCreatorPivot, STATUS_DEFINITIONS } from './types';
import PlatformBadge from '@/Components/Common/PlatformBadge';
import PlatformIcon from '@/Components/Common/PlatformIcon';

interface Props {
    item: CampaignCreatorPivot;
    isSelected: boolean;
    isFocused?: boolean;
    onToggleSelect: (id: number) => void;
    staffUsers: { id: number; name: string; email: string }[];
    onInlineAssign: (pivotId: number, staffId: string) => void;
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
    copiedToken: string | null;
    onQuickStatusChange: (itemOrId: CampaignCreatorPivot | number, newStatus: string) => void;
    onOpenShipmentModal: (item: CampaignCreatorPivot) => void;
    onOpenVideoModal: (item: CampaignCreatorPivot) => void;
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
    onInlineAssign,
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
    copiedToken,
    onQuickStatusChange,
    onOpenShipmentModal,
    onOpenVideoModal,
    onOpenZalo,
    onRemoveCreator,
    formatCurrency,
    formatDate,
}: Props) {
    const creator = item.creator;
    const mainAccount = creator?.accounts?.[0];

    return (
        <tr
            id={`koc-row-${item.id}`}
            className={`transition-all duration-300 ${
                isFocused
                    ? 'bg-primary-50/80 ring-2 ring-primary-500/60 shadow-xs'
                    : isSelected
                    ? 'bg-primary-50/30 hover:bg-slate-50/80'
                    : 'hover:bg-slate-50/80'
            }`}
        >
            {/* Checkbox */}
            <td className="px-4 py-3.5 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
            </td>

            {/* Creator Info */}
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700 text-xs shadow-2xs">
                        {creator?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                                href={route('creators.show', item.creator_id)}
                                className="font-bold text-slate-900 hover:text-primary-600 transition-colors"
                            >
                                {creator?.name}
                            </Link>
                            {isFocused && (
                                <span className="inline-flex items-center rounded-md bg-primary-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-2xs animate-pulse">
                                    Mục trong thông báo
                                </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {creator?.tier?.toUpperCase()}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                            <span>{creator?.phone || 'Chưa có SĐT'}</span>
                            {mainAccount && (
                                <>
                                    <span>•</span>
                                    <PlatformBadge
                                        platform={mainAccount.platform}
                                        handle={mainAccount.handle}
                                        followersCount={mainAccount.followers_count}
                                        size="xs"
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </td>

            {/* Trạng thái tiến độ với Dropdown chuyển nhanh */}
            <td className="px-4 py-3.5">
                <div className="relative inline-block">
                    <select
                        value={item.status}
                        onChange={(e) => onQuickStatusChange(item, e.target.value)}
                        className="py-1 pl-2.5 pr-7 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-primary-500 hover:border-slate-300"
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
                                    {stVal.label}
                                    {isMissingAddressForSent ? ' ⚠️ (Thiếu Đ/c)' : ''}
                                    {cannotReceiveOrPostYet ? ' ⛔ (Chưa gửi mẫu)' : ''}
                                    {!cannotReceiveOrPostYet && isMissingVideoForPosted ? ' 🔗 (Cần link video)' : ''}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </td>

            {/* Hạn Video (Deadline đếm ngược) */}
            <td className="px-4 py-3.5">
                {item.deadline_info ? (
                    <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
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
                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Đang giao hàng
                    </span>
                ) : ['posted', 'completed'].includes(item.status) ? (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Đã lên video
                    </span>
                ) : (
                    <span className="text-[11px] text-slate-400 italic">Chưa nhận mẫu</span>
                )}
            </td>

            {/* Gửi Mẫu KOC */}
            <td className="px-4 py-3.5">
                {(() => {
                    const isSent =
                        Boolean(item.sample_sent_at) ||
                        ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);

                    return (
                        <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5">
                                {isSent ? (
                                    <button
                                        type="button"
                                        onClick={() => onOpenShipmentModal(item)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100 transition-colors"
                                        title="Xem thông tin hoặc gửi lại"
                                    >
                                        <Package className="h-3 w-3" />
                                        <span>Đã gửi mẫu</span>
                                    </button>
                                ) : (
                                    <span className="text-[11px] text-slate-400 italic">Chưa gửi</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onOpenShipmentModal(item)}
                                    className="p-1 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 transition-colors"
                                    title="Xác nhận gửi mẫu cho KOC"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                            {item.sample_sent_at && (
                                <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                                    Ngày {formatDate(item.sample_sent_at)}
                                </span>
                            )}
                        </div>
                    );
                })()}
            </td>

            {/* Video Đã Lên */}
            <td className="px-4 py-3.5">
                {(() => {
                    const posts = item.content_posts || item.contentPosts || [];
                    const count = posts.length;
                    const latest = count > 0 ? posts[posts.length - 1] : null;
                    const isSent =
                        Boolean(item.sample_sent_at) ||
                        ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);

                    return (
                        <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5">
                                {count > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => onOpenVideoModal(item)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200/60 hover:bg-purple-100 transition-colors"
                                        title="Xem chi tiết các video đã lên"
                                    >
                                        <Video className="h-3 w-3" />
                                        <span>{count} video</span>
                                    </button>
                                ) : (
                                    <span className="text-[11px] text-slate-400 italic">Chưa lên</span>
                                )}
                                {isSent && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenVideoModal(item)}
                                        className="p-1 rounded-md bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-800 transition-colors"
                                        title="Thêm link video mới"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                            {latest && latest.post_url && (
                                <div className="flex flex-col gap-0.5 items-start">
                                    <a
                                        href={latest.post_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-primary-600 hover:text-primary-800 font-medium truncate max-w-[130px]"
                                        title={latest.video_title || latest.post_url}
                                    >
                                        <PlatformIcon platform={latest.platform} className="h-2.5 w-2.5" />
                                        <span>Xem video</span>
                                        <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
                                    </a>
                                    {latest.benchmark && (
                                        <span
                                            title={`Lượt xem: ${(latest.views_count || 0).toLocaleString(
                                                'vi-VN'
                                            )} / TB kênh: ${latest.benchmark.average_channel_views.toLocaleString(
                                                'vi-VN'
                                            )}`}
                                            className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold border ${
                                                latest.benchmark.status === 'viral'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                    : latest.benchmark.status === 'exceeded'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : latest.benchmark.status === 'expected'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : latest.benchmark.status === 'below'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}
                                        >
                                            {latest.benchmark.label}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </td>

            {/* Phí Booking (Inline Edit) */}
            <td className="px-4 py-3.5">
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
                            className="w-24 px-1.5 py-0.5 text-xs rounded border border-primary-500 focus:outline-hidden"
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
                        className="group flex items-center gap-1 font-bold text-slate-900 hover:text-primary-600"
                        title="Bấm để sửa nhanh phí booking"
                    >
                        <span>{formatCurrency(item.booking_fee)}</span>
                        <Edit3 className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                )}
            </td>

            {/* Phụ trách (Inline Dropdown) */}
            <td className="px-4 py-3.5">
                <select
                    value={item.assigned_to || ''}
                    onChange={(e) => onInlineAssign(item.id, e.target.value)}
                    className="w-full max-w-[130px] py-0.5 px-1.5 text-[11px] rounded border border-slate-200 bg-slate-50/60 text-slate-700 focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                    <option value="">-- Chưa gán --</option>
                    {staffUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>
            </td>

            {/* Cổng Portal Tự Điền */}
            <td className="px-4 py-3.5">
                {item.portal_token ? (
                    <button
                        type="button"
                        onClick={() => onCopyPortal(item.portal_token)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                        title="Sao chép link gửi cho Creator qua Zalo"
                    >
                        {copiedToken === item.portal_token ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                            <Copy className="h-3 w-3 text-slate-500" />
                        )}
                        <span>{copiedToken === item.portal_token ? 'Đã chép!' : 'Copy Link'}</span>
                    </button>
                ) : (
                    <span className="text-[11px] text-slate-400 italic">Chưa có link</span>
                )}
            </td>

            {/* NÚT THAO TÁC 1-CHẠM THÔNG MINH */}
            <td className="px-4 py-3.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                    {/* KOC MỚI THÊM: Mở Zalo Tiếp Cận */}
                    {item.status === 'new' && (
                        <button
                            type="button"
                            onClick={() => onOpenZalo(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all active:scale-95"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>Mở Zalo Tiếp Cận</span>
                        </button>
                    )}

                    {/* ĐÃ LIÊN HỆ: Chốt Hợp Tác */}
                    {item.status === 'contacted' && (
                        <button
                            type="button"
                            onClick={() => onOpenDealModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all active:scale-95"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Chốt Hợp Tác</span>
                        </button>
                    )}

                    {/* CHỜ DUYỆT CHI PHÍ: Nút Xác Nhận Đã Duyệt & Đàm Phán Lại */}
                    {item.status === 'waiting_approval' && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => onOpenConfirmApprovalModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all active:scale-95"
                                title="Xác nhận Lãnh đạo đã duyệt chi phí để tiếp tục gửi mẫu"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Xác Nhận Đã Duyệt</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onReopenDeal(item)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                title="Đưa về Đã liên hệ để đàm phán lại nếu Lãnh đạo không đồng ý mức phí"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>Đàm phán lại</span>
                            </button>
                        </div>
                    )}

                    {/* ĐÃ CHỐT HỢP TÁC: Chép Link Portal hoặc Đã Có Địa Chỉ */}
                    {item.status === 'agreed' && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => onCopyPortal(item.portal_token)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                title="Chép link portal gửi cho bạn KOC điền địa chỉ"
                            >
                                <Copy className="h-3 w-3" />
                                <span>Gửi Portal</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onQuickStatusChange(item.id, 'address_confirmed')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 shadow-2xs"
                            >
                                <Check className="h-3 w-3" />
                                <span>Đã Có Đ/C</span>
                            </button>
                        </div>
                    )}

                    {/* ĐÃ CHỐT ĐỊA CHỈ: Mở Modal Xác Nhận Gửi Mẫu */}
                    {item.status === 'address_confirmed' && (
                        <button
                            type="button"
                            onClick={() => onOpenShipmentModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition-all active:scale-95"
                        >
                            <Package className="h-3.5 w-3.5" />
                            <span>Xác Nhận Gửi Mẫu</span>
                        </button>
                    )}

                    {/* ĐÃ GỬI MẪU: Báo Đã Nhận Hàng */}
                    {item.status === 'sample_sent' && (
                        <button
                            type="button"
                            onClick={() => onQuickStatusChange(item.id, 'sample_received')}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-2xs transition-all active:scale-95"
                        >
                            <Truck className="h-3.5 w-3.5" />
                            <span>Đã Nhận Mẫu</span>
                        </button>
                    )}

                    {/* ĐÃ NHẬN MẪU: Điền Link Video */}
                    {item.status === 'sample_received' && (
                        <button
                            type="button"
                            onClick={() => onOpenVideoModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-pink-600 text-white hover:bg-pink-700 shadow-2xs transition-all active:scale-95"
                            title="Điền link video để chuyển sang trạng thái Đã lên video"
                        >
                            <Video className="h-3.5 w-3.5" />
                            <span>Điền Link Video</span>
                        </button>
                    )}

                    {/* ĐÃ LÊN VIDEO: Duyệt Nghiệm Thu */}
                    {item.status === 'posted' && (
                        <button
                            type="button"
                            onClick={() => onQuickStatusChange(item.id, 'completed')}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-all active:scale-95"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Nghiệm Thu</span>
                        </button>
                    )}

                    {/* HOÀN TẤT */}
                    {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Xong</span>
                        </span>
                    )}

                    {/* NGOẠI LỆ: Khôi phục */}
                    {['declined', 'no_show'].includes(item.status) && (
                        <button
                            type="button"
                            onClick={() => onQuickStatusChange(item.id, 'new')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                            <span>Khôi phục</span>
                        </button>
                    )}

                    {/* Nút Nhắc Zalo Thông Minh */}
                    <button
                        type="button"
                        onClick={() => onOpenZalo(item)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 shadow-2xs transition-colors"
                        title="Nhắc việc Zalo 1-chạm thông minh"
                    >
                        <MessageCircle className="h-3.5 w-3.5" />
                    </button>

                    {/* Nút Xóa */}
                    {['new', 'contacted', 'declined'].includes(item.status) && (
                        <button
                            type="button"
                            onClick={() => onRemoveCreator(item.id, creator?.name)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            title="Xóa khỏi chiến dịch"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
});

