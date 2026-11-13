import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Button from '@/Components/Common/Button';
import { Package, X, MapPin, AlertCircle, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { WorkspaceKocItem } from '@/Pages/Campaign/Workspace';

interface WorkspaceShipmentModalProps {
    item: WorkspaceKocItem | null;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export default function WorkspaceShipmentModal({
    item,
    onClose,
    onSuccess,
}: WorkspaceShipmentModalProps) {
    if (!item) return null;

    const [notes, setNotes] = useState('');
    const [shippedAt, setShippedAt] = useState(new Date().toISOString().split('T')[0]);
    const [shippingAddress, setShippingAddress] = useState(item.creator?.shipping_address || '');
    const [cityProvince, setCityProvince] = useState(item.creator?.city_province || '');
    const [district, setDistrict] = useState(item.creator?.district || '');
    const [ward, setWard] = useState(item.creator?.ward || '');
    const [phone, setPhone] = useState(item.creator?.phone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasCompleteExistingInfo = Boolean(
        item.creator?.shipping_address?.trim() &&
        item.creator?.phone?.trim() &&
        item.creator?.city_province?.trim() &&
        item.creator?.ward?.trim()
    );
    const [isEditing, setIsEditing] = useState(!hasCompleteExistingInfo);

    useEffect(() => {
        setShippingAddress(item.creator?.shipping_address || '');
        setCityProvince(item.creator?.city_province || '');
        setDistrict(item.creator?.district || '');
        setWard(item.creator?.ward || '');
        setPhone(item.creator?.phone || '');
        setNotes('');
        setError(null);
        setIsEditing(!Boolean(
            item.creator?.shipping_address?.trim() &&
            item.creator?.phone?.trim() &&
            item.creator?.city_province?.trim() &&
            item.creator?.ward?.trim()
        ));
    }, [item]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const effectiveAddress = (shippingAddress.trim() || item.creator?.shipping_address?.trim() || '');
        const effectivePhone = (phone.trim() || item.creator?.phone?.trim() || '');
        const effectiveCity = (cityProvince.trim() || item.creator?.city_province?.trim() || '');
        const effectiveWard = (ward.trim() || item.creator?.ward?.trim() || '');

        if (!effectiveAddress || !effectivePhone || !effectiveCity || !effectiveWard) {
            setError('Vui lòng nhập đầy đủ các thông tin bắt buộc: Địa chỉ chi tiết, Tỉnh/Thành phố, Phường/Xã và Số điện thoại nhận hàng.');
            return;
        }

        setIsSubmitting(true);

        // @ts-ignore
        const url = typeof route === 'function'
            ? route('campaigns.creators.shipments.store', { id: item.campaign_id, pivotId: item.id })
            : `/campaigns/${item.campaign_id}/creators/${item.id}/shipments`;

        router.post(
            url,
            {
                notes,
                shipped_at: shippedAt,
                shipping_address: shippingAddress.trim() || undefined,
                city_province: cityProvince.trim() || undefined,
                district: district.trim() || undefined,
                ward: ward.trim() || undefined,
                phone: phone.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onSuccess(`Đã xác nhận gửi mẫu cho KOC ${item.creator?.name || ''} thành công!`);
                    onClose();
                },
                onError: (errs) => {
                    const firstErr = Object.values(errs)[0];
                    setError(typeof firstErr === 'string' ? firstErr : 'Không thể gửi mẫu. Vui lòng thử lại.');
                },
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                Xác Nhận Gửi Mẫu Thử
                            </h3>
                            <p className="text-xs text-slate-500">
                                KOC: <strong className="text-slate-800">{item.creator?.name}</strong> • Chiến dịch: <strong className="text-slate-800">{item.campaign?.name}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Địa chỉ giao hàng */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-primary-600" />
                                <span>Địa chỉ giao hàng cho KOC</span>
                            </label>
                            {hasCompleteExistingInfo && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 underline"
                                >
                                    {isEditing ? 'Hủy sửa' : 'Sửa địa chỉ'}
                                </button>
                            )}
                        </div>

                        {hasCompleteExistingInfo && !isEditing ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                                <div className="font-semibold">{item.creator?.shipping_address}</div>
                                {(item.creator?.ward || item.creator?.district || item.creator?.city_province) && (
                                    <div className="text-slate-500 mt-0.5">
                                        {[item.creator?.ward, item.creator?.district, item.creator?.city_province].filter(Boolean).join(', ')}
                                    </div>
                                )}
                                {item.creator?.phone && (
                                    <div className="text-slate-600 font-mono mt-1">SĐT: {item.creator.phone}</div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                                <div className="text-[11px] font-medium text-amber-800">
                                    Thông tin nhận hàng bắt buộc (Số nhà/đường, SĐT, Tỉnh/TP, Phường/Xã):
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                        Địa chỉ chi tiết (Số nhà, đường...) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        placeholder="Số nhà, tên đường chi tiết..."
                                        className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                            Tỉnh / TP <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={cityProvince}
                                            onChange={(e) => setCityProvince(e.target.value)}
                                            placeholder="Tỉnh / Thành phố"
                                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Quận / Huyện</label>
                                        <input
                                            type="text"
                                            value={district}
                                            onChange={(e) => setDistrict(e.target.value)}
                                            placeholder="Quận / Huyện"
                                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                            Phường / Xã <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={ward}
                                            onChange={(e) => setWard(e.target.value)}
                                            placeholder="Phường / Xã"
                                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                        Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Ví dụ: 0988123456"
                                        className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ngày xuất gửi */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span>Ngày xuất gửi</span>
                        </label>
                        <input
                            type="date"
                            value={shippedAt}
                            onChange={(e) => setShippedAt(e.target.value)}
                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                        />
                    </div>

                    {/* Ghi chú mẫu thử */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span>Ghi chú nội bộ (Sản phẩm mẫu, phân loại tone, mã theo dõi nếu có)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ví dụ: Đã đóng gói 01 Serum Tone Sáng, gửi qua ViettelPost..."
                            rows={3}
                            className="w-full text-xs rounded-lg border-slate-300 focus:border-primary-500 focus:ring-primary-500"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            iconLeft={<CheckCircle2 className="h-4 w-4" />}
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Xác Nhận Đã Gửi Mẫu'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

