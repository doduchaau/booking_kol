import React from 'react';
import {
    X,
    AlertTriangle,
    Clock,
    Check,
    CheckCircle2,
    Package,
    Truck,
    Edit3,
    Copy,
    MapPin,
    Video,
    ExternalLink,
    FileText,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import QuickZaloReminderModal from '@/Components/Outreach/QuickZaloReminderModal';
import PlatformBadge from '@/Components/Common/PlatformBadge';
import PlatformIcon from '@/Components/Common/PlatformIcon';
import { CampaignCreatorPivot, STATUS_DEFINITIONS } from './types';

interface Props {
    // Bulk Status Modal
    isBulkStatusModalOpen: boolean;
    onCloseBulkStatusModal: () => void;
    selectedCount: number;
    bulkSelectedStatus: string;
    onBulkSelectedStatusChange: (status: string) => void;
    bulkMissingAddressCount: number;
    bulkNotSentCount: number;
    bulkProcessing: boolean;
    onExecuteBulkStatus: () => void;

    // Deal Modal
    dealModalItem: CampaignCreatorPivot | null;
    onCloseDealModal: () => void;
    dealFee: string;
    onDealFeeChange: (fee: string) => void;
    dealNotes: string;
    onDealNotesChange: (notes: string) => void;
    onSubmitDeal: (e: React.FormEvent) => void;

    // Confirm Approval Modal
    confirmApprovalItem: CampaignCreatorPivot | null;
    onCloseConfirmApprovalModal: () => void;
    approverName: string;
    onApproverNameChange: (name: string) => void;
    approvalNotes: string;
    onApprovalNotesChange: (notes: string) => void;
    isConfirmingApproval: boolean;
    onConfirmCastApproved: (e: React.FormEvent) => void;

    // Shipment Modal
    shipmentModalItem: CampaignCreatorPivot | null;
    onCloseShipmentModal: () => void;
    shipmentNotes: string;
    onShipmentNotesChange: (notes: string) => void;
    shipmentDate: string;
    onShipmentDateChange: (date: string) => void;
    shipmentSubmitting: boolean;
    copiedAddress: boolean;
    onCopyWarehouseAddress: (item: CampaignCreatorPivot) => void;
    quickAddress: string;
    onQuickAddressChange: (val: string) => void;
    quickCity: string;
    onQuickCityChange: (val: string) => void;
    quickDistrict: string;
    onQuickDistrictChange: (val: string) => void;
    quickWard: string;
    onQuickWardChange: (val: string) => void;
    quickPhone: string;
    onQuickPhoneChange: (val: string) => void;
    isEditingAddress: boolean;
    onToggleEditingAddress: (val: boolean) => void;
    onCopyPortal: (token: string | null) => void;
    copiedToken: string | null;
    onSubmitShipment: (e: React.FormEvent) => void;
    shipmentProducts?: Array<{
        product_id: number;
        name: string;
        sku?: string;
        quantity: number;
        variant: string;
        selected: boolean;
    }>;
    onToggleShipmentProduct?: (productId: number) => void;
    onChangeShipmentProductQty?: (productId: number, delta: number) => void;
    onChangeShipmentProductVariant?: (productId: number, variant: string) => void;

    // Video Modal
    videoModalItem: CampaignCreatorPivot | null;
    onCloseVideoModal: () => void;
    videoPlatform: string;
    onVideoPlatformChange: (p: string) => void;
    videoUrl: string;
    onVideoUrlChange: (url: string) => void;
    videoTitle: string;
    onVideoTitleChange: (title: string) => void;
    videoPostedAt: string;
    onVideoPostedAtChange: (date: string) => void;
    videoSubmitting: boolean;
    onSubmitVideo: (e: React.FormEvent) => void;

    // Note Modal (Popup ghi chú dài)
    noteModalItem?: CampaignCreatorPivot | null;
    onCloseNoteModal?: () => void;
    noteModalContent?: string;
    onNoteModalContentChange?: (val: string) => void;
    onSaveNoteModal?: () => void;
    noteSubmitting?: boolean;

    // Zalo Reminder
    quickZaloPivotId: number | null;
    onCloseQuickZalo: () => void;
    onQuickZaloSuccess: (msg: string) => void;

    formatCurrency: (val: string | number) => string;
    formatDate: (val: string) => string;
}

export default React.memo(function KocMatrixModals({
    isBulkStatusModalOpen,
    onCloseBulkStatusModal,
    selectedCount,
    bulkSelectedStatus,
    onBulkSelectedStatusChange,
    bulkMissingAddressCount,
    bulkNotSentCount,
    bulkProcessing,
    onExecuteBulkStatus,

    dealModalItem,
    onCloseDealModal,
    dealFee,
    onDealFeeChange,
    dealNotes,
    onDealNotesChange,
    onSubmitDeal,

    confirmApprovalItem,
    onCloseConfirmApprovalModal,
    approverName,
    onApproverNameChange,
    approvalNotes,
    onApprovalNotesChange,
    isConfirmingApproval,
    onConfirmCastApproved,

    shipmentModalItem,
    onCloseShipmentModal,
    shipmentNotes,
    onShipmentNotesChange,
    shipmentDate,
    onShipmentDateChange,
    shipmentSubmitting,
    copiedAddress,
    onCopyWarehouseAddress,
    quickAddress,
    onQuickAddressChange,
    quickCity,
    onQuickCityChange,
    quickDistrict,
    onQuickDistrictChange,
    quickWard,
    onQuickWardChange,
    quickPhone,
    onQuickPhoneChange,
    isEditingAddress,
    onToggleEditingAddress,
    onCopyPortal,
    copiedToken,
    onSubmitShipment,
    shipmentProducts = [],
    onToggleShipmentProduct = () => {},
    onChangeShipmentProductQty = () => {},
    onChangeShipmentProductVariant = () => {},

    videoModalItem,
    onCloseVideoModal,
    videoPlatform,
    onVideoPlatformChange,
    videoUrl,
    onVideoUrlChange,
    videoTitle,
    onVideoTitleChange,
    videoPostedAt,
    onVideoPostedAtChange,
    videoSubmitting,
    onSubmitVideo,

    noteModalItem = null,
    onCloseNoteModal = () => {},
    noteModalContent = '',
    onNoteModalContentChange = () => {},
    onSaveNoteModal = () => {},
    noteSubmitting = false,

    quickZaloPivotId,
    onCloseQuickZalo,
    onQuickZaloSuccess,

    formatCurrency,
    formatDate,
}: Props) {
    return (
        <>
            {/* MODAL ĐỔI TRẠNG THÁI HÀNG LOẠT */}
            {isBulkStatusModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseBulkStatusModal} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <h3 className="text-base font-bold text-slate-900 mb-1">Chuyển Trạng Thái Đồng Loạt</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Đang áp dụng cho <span className="font-bold text-primary-600">{selectedCount} KOC</span> đã chọn.
                        </p>

                        <div className="space-y-3">
                            <label className="block text-xs font-semibold text-slate-700">Chọn trạng thái đích:</label>
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                                {Object.entries(STATUS_DEFINITIONS).map(([stKey, stVal]) => (
                                    <button
                                        key={stKey}
                                        type="button"
                                        onClick={() => onBulkSelectedStatusChange(stKey)}
                                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                                            bulkSelectedStatus === stKey
                                                ? 'border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-500/20'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        {stVal.label}
                                    </button>
                                ))}
                            </div>

                            {bulkSelectedStatus === 'sample_sent' && bulkMissingAddressCount > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <strong>Cảnh báo ràng buộc địa chỉ:</strong> Có <strong>{bulkMissingAddressCount}</strong> trong tổng số {selectedCount} KOC chưa có địa chỉ nhận hàng. Hệ thống sẽ tự động bỏ qua các KOC này để tránh gửi hàng sai sót.
                                    </div>
                                </div>
                            )}

                            {['sample_received', 'posted'].includes(bulkSelectedStatus) && bulkNotSentCount > 0 && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div>
                                        <strong>Cảnh báo ràng buộc gửi mẫu:</strong> Có <strong>{bulkNotSentCount}</strong> trong tổng số {selectedCount} KOC chưa được gửi mẫu sản phẩm. Hệ thống sẽ tự động bỏ qua các KOC này vì không thể nhận mẫu hoặc lên video khi chưa gửi mẫu.
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <Button variant="secondary" size="sm" onClick={onCloseBulkStatusModal}>
                                    Hủy
                                </Button>
                                <Button variant="primary" size="sm" loading={bulkProcessing} onClick={onExecuteBulkStatus}>
                                    Xác Nhận Đổi ({selectedCount})
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CHỐT HỢP TÁC VỚI KOC */}
            {dealModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseDealModal} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Chốt Hợp Tác Với KOC</h3>
                                <p className="text-xs text-slate-500">
                                    {dealModalItem.creator.name} ({dealModalItem.creator.phone})
                                </p>
                            </div>
                            <button type="button" onClick={onCloseDealModal} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={onSubmitDeal} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Phí booking thỏa thuận (VND)
                                </label>
                                <input
                                    type="number"
                                    value={dealFee}
                                    onChange={(e) => onDealFeeChange(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Định dạng: {formatCurrency(dealFee)}
                                </span>
                            </div>

                            {parseFloat(dealFee) > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2 animate-in fade-in">
                                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-amber-900">
                                            Phát sinh chi phí cast: {formatCurrency(dealFee)}
                                        </p>
                                        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                                            KOC sẽ chuyển sang trạng thái <strong>[Chờ duyệt chi phí]</strong>. Sau khi xin ý kiến Lãnh đạo ngoài đời thực, bạn chỉ cần bấm nút <em>[Xác nhận đã duyệt]</em> để mở khóa quy trình gửi mẫu.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Ghi chú hợp tác / Cam kết video
                                </label>
                                <textarea
                                    value={dealNotes}
                                    onChange={(e) => onDealNotesChange(e.target.value)}
                                    rows={3}
                                    placeholder="Ví dụ: KOC đồng ý làm 1 video review 60s, gắn link bio..."
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" size="sm" onClick={onCloseDealModal}>
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    className={parseFloat(dealFee) > 0 ? '!bg-amber-600 hover:!bg-amber-700 !text-white' : ''}
                                    iconLeft={parseFloat(dealFee) > 0 ? <Clock className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                >
                                    {parseFloat(dealFee) > 0 ? 'Lưu & Chờ Duyệt Chi Phí' : 'Xác Nhận Chốt Hợp Tác'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL XÁC NHẬN LÃNH ĐẠO ĐÃ DUYỆT CHI PHÍ CAST */}
            {confirmApprovalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseConfirmApprovalModal} />
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Xác Nhận Lãnh Đạo Đã Duyệt
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {confirmApprovalItem.creator.name} ({confirmApprovalItem.creator.phone || 'Chưa có SĐT'})
                                </p>
                            </div>
                            <button type="button" onClick={onCloseConfirmApprovalModal} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={onConfirmCastApproved} className="mt-4 space-y-4">
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                                <p className="text-xs text-emerald-700">Mức chi phí cast cần duyệt:</p>
                                <p className="text-lg font-bold text-emerald-800">
                                    {formatCurrency(confirmApprovalItem.booking_fee)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Tên Lãnh đạo / Người duyệt (tùy chọn)
                                </label>
                                <input
                                    type="text"
                                    value={approverName}
                                    onChange={(e) => onApproverNameChange(e.target.value)}
                                    placeholder="Ví dụ: Anh Hải - Giám đốc, Chị Mai - Leader..."
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Ghi chú phê duyệt / Lưu ý của Lãnh đạo
                                </label>
                                <textarea
                                    value={approvalNotes}
                                    onChange={(e) => onApprovalNotesChange(e.target.value)}
                                    rows={2}
                                    placeholder="Ghi chú thêm nếu sếp có dặn dò về KPI view, thời gian đăng bài..."
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" size="sm" onClick={onCloseConfirmApprovalModal}>
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                                    disabled={isConfirmingApproval}
                                    iconLeft={<CheckCircle2 className="h-3.5 w-3.5" />}
                                >
                                    {isConfirmingApproval ? 'Đang xác nhận...' : 'Xác Nhận & Mở Khóa Đi Tiếp'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL XÁC NHẬN GỬI MẪU CHO KOC */}
            {shipmentModalItem && (() => {
                const effectiveAddress = quickAddress.trim() || shipmentModalItem.creator?.shipping_address?.trim() || '';
                const effectivePhone = quickPhone.trim() || shipmentModalItem.creator?.phone?.trim() || '';
                const effectiveCity = quickCity.trim() || shipmentModalItem.creator?.city_province?.trim() || '';
                const effectiveWard = quickWard.trim() || shipmentModalItem.creator?.ward?.trim() || '';

                const isShippingInfoComplete = Boolean(effectiveAddress && effectivePhone && effectiveCity && effectiveWard);
                const hasCompleteOriginalInfo = Boolean(
                    shipmentModalItem.creator?.shipping_address?.trim() &&
                    shipmentModalItem.creator?.phone?.trim() &&
                    shipmentModalItem.creator?.city_province?.trim() &&
                    shipmentModalItem.creator?.ward?.trim()
                );

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseShipmentModal} />
                        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <Package className="h-5 w-5 text-amber-500" />
                                        Xác Nhận Đã Gửi Mẫu Cho KOC
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {shipmentModalItem.creator?.name} • {effectivePhone || 'Chưa có SĐT'}
                                    </p>
                                </div>
                                <button type="button" onClick={onCloseShipmentModal} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Cảnh báo nếu KOC chưa có đầy đủ thông tin địa chỉ/SĐT/xã/thành phố */}
                            {!isShippingInfoComplete && (
                                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="font-bold">KOC chưa có đủ thông tin nhận hàng bắt buộc!</div>
                                        <div className="mt-0.5 text-rose-700 text-[11px] leading-relaxed">
                                            Hệ thống <strong>bắt buộc phải có: Số nhà/đường, SĐT, Tỉnh/Thành phố, Phường/Xã</strong> để gửi hàng. Vui lòng bổ sung bên dưới hoặc gửi link Portal cho KOC tự điền.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hiển thị địa chỉ hiện tại nếu đã có đầy đủ */}
                            {hasCompleteOriginalInfo && !isEditingAddress && (
                                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <Truck className="h-3.5 w-3.5 text-slate-500" />
                                            Địa chỉ nhận mẫu của KOC:
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => onToggleEditingAddress(true)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs"
                                                title="Sửa hoặc cập nhật địa chỉ mới"
                                            >
                                                <Edit3 className="h-3 w-3 text-slate-500" />
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onCopyWarehouseAddress(shipmentModalItem)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs ${
                                                    copiedAddress
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                                }`}
                                                title="Chép họ tên, SĐT và địa chỉ để gửi cho bộ phận kho"
                                            >
                                                {copiedAddress ? (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        <span>Đã sao chép!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        <span>Sao chép gửi kho</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-slate-700 leading-relaxed font-medium">
                                        {[
                                            shipmentModalItem.creator?.shipping_address,
                                            shipmentModalItem.creator?.ward,
                                            shipmentModalItem.creator?.district,
                                            shipmentModalItem.creator?.city_province,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                    {shipmentModalItem.creator?.phone && (
                                        <div className="text-slate-500 font-mono text-[11px] mt-1">
                                            SĐT: {shipmentModalItem.creator.phone}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Form Nhập Nhanh / Bổ Sung Địa Chỉ */}
                            {(!hasCompleteOriginalInfo || isEditingAddress) && (
                                <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-xs animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-indigo-600" />
                                            Thông tin nhận hàng bắt buộc (Lưu vào hồ sơ KOC):
                                        </span>
                                        {hasCompleteOriginalInfo && (
                                            <button
                                                type="button"
                                                onClick={() => onToggleEditingAddress(false)}
                                                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 underline"
                                            >
                                                Hủy sửa
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2.5">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                Địa chỉ chi tiết (Số nhà, đường, ngõ, tòa nhà...) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={quickAddress}
                                                onChange={(e) => onQuickAddressChange(e.target.value)}
                                                placeholder="Ví dụ: 123 Đường Nguyễn Trãi"
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                    Tỉnh / TP <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quickCity}
                                                    onChange={(e) => onQuickCityChange(e.target.value)}
                                                    placeholder="Hà Nội / TP.HCM"
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Quận / Huyện</label>
                                                <input
                                                    type="text"
                                                    value={quickDistrict}
                                                    onChange={(e) => onQuickDistrictChange(e.target.value)}
                                                    placeholder="Quận Thanh Xuân"
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                    Phường / Xã <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quickWard}
                                                    onChange={(e) => onQuickWardChange(e.target.value)}
                                                    placeholder="Phường Khương Trung"
                                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                                Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={quickPhone}
                                                onChange={(e) => onQuickPhoneChange(e.target.value)}
                                                placeholder="Ví dụ: 0988123456"
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tiện ích Copy Link Portal */}
                            {shipmentModalItem.portal_token && (
                                <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                    <span className="text-slate-600 text-[11px]">Hoặc gửi link cho KOC tự điền:</span>
                                    <button
                                        type="button"
                                        onClick={() => onCopyPortal(shipmentModalItem.portal_token)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shadow-2xs ${
                                            copiedToken === shipmentModalItem.portal_token
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                                        }`}
                                    >
                                        {copiedToken === shipmentModalItem.portal_token ? (
                                            <>
                                                <Check className="h-3 w-3" />
                                                <span>Đã sao chép link Portal!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3" />
                                                <span>Sao chép link Portal</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Trạng thái gửi mẫu hiện tại */}
                            {shipmentModalItem.sample_sent_at && (
                                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                                    <strong>Trạng thái:</strong> Đã gửi mẫu vào ngày {formatDate(shipmentModalItem.sample_sent_at)}.
                                    {shipmentModalItem.notes && <span className="block mt-0.5 text-slate-600">Ghi chú: {shipmentModalItem.notes}</span>}
                                </div>
                            )}

                            {/* Form xác nhận gửi mẫu tinh giản */}
                            <form onSubmit={onSubmitShipment} className="mt-4 space-y-3.5 pt-3 border-t border-slate-100">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                                    💡 <strong>Quy trình tinh gọn:</strong> Nhân viên Booking chỉ cần bấm sao chép thông tin địa chỉ gửi cho kho và xác nhận ngày gửi mẫu. Kho bên ngoài sẽ chịu trách nhiệm đóng gói và vận chuyển.
                                </div>

                                {/* Khối Lựa Chọn Sản Phẩm Mẫu Gửi Cho KOC */}
                                {shipmentProducts && shipmentProducts.length > 0 && (
                                    <div className="space-y-2 p-3 rounded-xl border border-amber-200/80 bg-amber-50/40">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                                <Package className="h-4 w-4 text-amber-600" />
                                                <span>Lựa chọn sản phẩm mẫu gửi cho KOC này</span>
                                            </label>
                                            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                                                Đã chọn: {shipmentProducts.filter((p) => p.selected).reduce((sum, p) => sum + p.quantity, 0)} món
                                            </span>
                                        </div>

                                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                            {shipmentProducts.map((prod) => (
                                                <div
                                                    key={prod.product_id}
                                                    className={`p-2.5 rounded-lg border text-xs transition-colors ${
                                                        prod.selected
                                                            ? 'bg-white border-amber-300 shadow-2xs'
                                                            : 'bg-slate-50/80 border-slate-200 opacity-70'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={prod.selected}
                                                                onChange={() => onToggleShipmentProduct(prod.product_id)}
                                                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                                                            />
                                                            <span className="font-bold text-slate-800 truncate block">
                                                                {prod.name}
                                                            </span>
                                                            {prod.sku && (
                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                    ({prod.sku})
                                                                </span>
                                                            )}
                                                        </label>

                                                        {prod.selected && (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <span className="text-[11px] text-slate-500">SL:</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onChangeShipmentProductQty(prod.product_id, -1)}
                                                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-6 text-center font-bold text-slate-900">
                                                                    {prod.quantity}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onChangeShipmentProductQty(prod.product_id, 1)}
                                                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {prod.selected && (
                                                        <div className="mt-2 pl-6">
                                                            <input
                                                                type="text"
                                                                value={prod.variant || ''}
                                                                onChange={(e) => onChangeShipmentProductVariant(prod.product_id, e.target.value)}
                                                                placeholder="Ghi chú phân loại (Màu sắc, Size, Dung tích...)"
                                                                className="w-full px-2.5 py-1 text-[11px] rounded border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-1 focus:ring-amber-500"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày gửi mẫu</label>
                                        <input
                                            type="date"
                                            value={shipmentDate}
                                            onChange={(e) => onShipmentDateChange(e.target.value)}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú mẫu / sản phẩm gửi</label>
                                        <input
                                            type="text"
                                            value={shipmentNotes}
                                            onChange={(e) => onShipmentNotesChange(e.target.value)}
                                            placeholder="Ví dụ: 1 Hộp kem + Quà tặng kèm"
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <span className="text-xs text-rose-600 font-medium">
                                        {!isShippingInfoComplete && '⚠️ Cần đủ địa chỉ, SĐT, Tỉnh/TP, Phường/Xã để gửi mẫu'}
                                    </span>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <Button type="button" variant="secondary" size="sm" onClick={onCloseShipmentModal}>
                                            Đóng
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="sm"
                                            disabled={!isShippingInfoComplete || shipmentSubmitting}
                                            loading={shipmentSubmitting}
                                            iconLeft={<CheckCircle2 className="h-3.5 w-3.5" />}
                                            title={!isShippingInfoComplete ? 'Vui lòng điền đủ thông tin nhận hàng trước khi xác nhận' : undefined}
                                        >
                                            Xác Nhận Đã Gửi Mẫu
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL QUẢN LÝ & THÊM VIDEO CHO KOC */}
            {videoModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseVideoModal} />
                    <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Video className="h-5 w-5 text-purple-600" />
                                    Video Bài Đăng Của KOC
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {videoModalItem.creator.name} • {videoModalItem.creator.phone || 'Chưa có SĐT'}
                                </p>
                            </div>
                            <button type="button" onClick={onCloseVideoModal} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Danh sách video đã đăng */}
                        {(() => {
                            const posts = videoModalItem.content_posts || videoModalItem.contentPosts || [];
                            if (posts.length === 0) return null;

                            return (
                                <div className="mt-4">
                                    <h4 className="text-xs font-bold text-slate-700 mb-2">Video đã nộp ({posts.length} video):</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {posts.map((post, idx) => (
                                            <div
                                                key={post.id || idx}
                                                className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between shadow-2xs"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                        <PlatformBadge platform={post.platform} size="xs" />
                                                        <span className="truncate max-w-[200px] text-slate-700">
                                                            {post.video_title || 'Bài đăng video'}
                                                        </span>
                                                    </div>
                                                    {post.posted_at && (
                                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                                            Đăng ngày: {post.posted_at}
                                                        </span>
                                                    )}
                                                </div>
                                                <a
                                                    href={post.post_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100"
                                                >
                                                    <span>Xem</span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Form thêm video mới */}
                        <form onSubmit={onSubmitVideo} className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-900">+ Thêm Video Mới:</h4>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Nền tảng <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center">
                                            <PlatformIcon platform={videoPlatform} className="h-4 w-4" />
                                        </div>
                                        <select
                                            value={videoPlatform}
                                            onChange={(e) => onVideoPlatformChange(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="tiktok">TikTok</option>
                                            <option value="facebook">Facebook</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="youtube">YouTube</option>
                                            <option value="shopee">Shopee</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Link bài đăng / video <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        value={videoUrl}
                                        onChange={(e) => onVideoUrlChange(e.target.value)}
                                        placeholder="https://www.tiktok.com/@.../video/..."
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề video</label>
                                    <input
                                        type="text"
                                        value={videoTitle}
                                        onChange={(e) => onVideoTitleChange(e.target.value)}
                                        placeholder="Ví dụ: Review son dưỡng màu cam đào"
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày đăng</label>
                                    <input
                                        type="date"
                                        value={videoPostedAt}
                                        onChange={(e) => onVideoPostedAtChange(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" size="sm" onClick={onCloseVideoModal}>
                                    Đóng
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    loading={videoSubmitting}
                                    iconLeft={<Video className="h-3.5 w-3.5" />}
                                >
                                    Lưu Link & Đánh Dấu Đã Lên Video
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Nhắc Zalo Thông Minh 1-Chạm */}
            <QuickZaloReminderModal
                isOpen={quickZaloPivotId !== null}
                campaignCreatorId={quickZaloPivotId}
                onClose={onCloseQuickZalo}
                onSuccess={onQuickZaloSuccess}
            />

            {/* MODAL GHI CHÚ KOC (POPUP CHI TIẾT) */}
            {noteModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCloseNoteModal} />
                    <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary-600" />
                                    Ghi Chú KOC: {noteModalItem.creator.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {noteModalItem.creator.phone || 'Chưa có SĐT'} • {noteModalItem.creator.tier?.toUpperCase()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onCloseNoteModal}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                onSaveNoteModal();
                            }}
                            className="mt-4 space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Nội dung ghi chú riêng của nhân viên cho KOC này:
                                </label>
                                <textarea
                                    value={noteModalContent}
                                    onChange={(e) => onNoteModalContentChange(e.target.value)}
                                    rows={5}
                                    placeholder="Ví dụ: KOC hẹn tối thứ 7 chốt kịch bản, thích gửi tông màu tự nhiên, chỉ nhận hàng vào giờ hành chính..."
                                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-slate-50/50 focus:bg-white transition-all resize-y"
                                    autoFocus
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    💡 Ghi chú nội bộ giúp cả team nắm được tiến độ trao đổi và yêu cầu riêng của KOC.
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" size="sm" onClick={onCloseNoteModal}>
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="sm"
                                    loading={noteSubmitting}
                                    iconLeft={<Check className="h-4 w-4" />}
                                >
                                    Lưu Ghi Chú
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
});

