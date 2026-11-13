import React from 'react';
import { TrendingUp, Copy, X } from 'lucide-react';

interface Props {
    selectedIds: number[];
    onOpenBulkStatusModal: () => void;
    staffUsers: { id: number; name: string; email: string }[];
    onExecuteBulkAssign: (staffId: string) => void;
    onCopyPhones: () => void;
    onClearSelection: () => void;
}

export default React.memo(function KocMatrixBulkActions({
    selectedIds,
    onOpenBulkStatusModal,
    staffUsers,
    onExecuteBulkAssign,
    onCopyPhones,
    onClearSelection,
}: Props) {
    if (selectedIds.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-slate-900/95 backdrop-blur-md px-5 py-3 text-white shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                    {selectedIds.length}
                </span>
                <span className="text-xs font-semibold">Đã chọn</span>
            </div>

            {/* Nút Chuyển Trạng Thái Đồng Loạt */}
            <button
                type="button"
                onClick={onOpenBulkStatusModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-500 transition-colors shadow-2xs"
            >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Đổi Trạng Thái ({selectedIds.length})</span>
            </button>

            {/* Dropdown Phân Bổ Nhân Viên Hàng Loạt */}
            <select
                onChange={(e) => {
                    if (e.target.value) onExecuteBulkAssign(e.target.value);
                }}
                defaultValue=""
                className="rounded-xl border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 py-1.5 px-2.5 focus:ring-primary-500 cursor-pointer"
            >
                <option value="" disabled>
                    Gán Nhân Viên Phụ Trách...
                </option>
                {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                        Gán cho {u.name}
                    </option>
                ))}
            </select>

            {/* Copy Phone Numbers */}
            <button
                type="button"
                onClick={onCopyPhones}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                title="Sao chép danh sách SĐT"
            >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy SĐT</span>
            </button>

            {/* Bỏ chọn */}
            <button
                type="button"
                onClick={onClearSelection}
                className="ml-2 text-slate-400 hover:text-white transition-colors"
                title="Bỏ chọn tất cả"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
});

