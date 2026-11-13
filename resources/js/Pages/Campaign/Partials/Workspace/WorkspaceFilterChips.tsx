import React from 'react';
import { ShieldAlert, Clock, Package, Video, CheckCircle2, ListFilter } from 'lucide-react';

interface WorkspaceFilterChipsProps {
    currentUrgency: string;
    onUrgencyChange: (urgency: string) => void;
    stats: {
        overdue_count: number;
        warning_count: number;
        ready_to_ship_count: number;
        pending_approval_count: number;
        total_my_kocs: number;
    };
}

export default function WorkspaceFilterChips({
    currentUrgency,
    onUrgencyChange,
    stats,
}: WorkspaceFilterChipsProps) {
    const chips = [
        {
            key: 'all',
            label: 'Tất cả công việc',
            count: stats.total_my_kocs,
            icon: ListFilter,
            badgeClass: 'bg-slate-100 text-slate-700',
            activeClass: 'bg-slate-900 text-white shadow-xs',
            inactiveClass: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
        },
        {
            key: 'overdue',
            label: '🚨 Video quá hạn',
            count: stats.overdue_count,
            icon: ShieldAlert,
            badgeClass: 'bg-rose-100 text-rose-700',
            activeClass: 'bg-rose-600 text-white shadow-xs',
            inactiveClass: 'bg-white text-rose-700 hover:bg-rose-50 border-rose-200',
        },
        {
            key: 'warning',
            label: '⚠️ Sắp đến hạn',
            count: stats.warning_count,
            icon: Clock,
            badgeClass: 'bg-amber-100 text-amber-800',
            activeClass: 'bg-amber-600 text-white shadow-xs',
            inactiveClass: 'bg-white text-amber-800 hover:bg-amber-50 border-amber-200',
        },
        {
            key: 'ready_to_ship',
            label: '📦 Cần báo kho gửi mẫu',
            count: stats.ready_to_ship_count,
            icon: Package,
            badgeClass: 'bg-blue-100 text-blue-700',
            activeClass: 'bg-blue-600 text-white shadow-xs',
            inactiveClass: 'bg-white text-blue-700 hover:bg-blue-50 border-blue-200',
        },
        {
            key: 'pending_approval',
            label: '🎬 Video chờ duyệt',
            count: stats.pending_approval_count,
            icon: Video,
            badgeClass: 'bg-emerald-100 text-emerald-800',
            activeClass: 'bg-emerald-600 text-white shadow-xs',
            inactiveClass: 'bg-white text-emerald-800 hover:bg-emerald-50 border-emerald-200',
        },
    ];

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary-600" />
                Việc gấp:
            </span>
            {chips.map((chip) => {
                const isActive = currentUrgency === chip.key;
                return (
                    <button
                        key={chip.key}
                        type="button"
                        onClick={() => onUrgencyChange(chip.key)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            isActive ? chip.activeClass : chip.inactiveClass
                        }`}
                    >
                        <span>{chip.label}</span>
                        <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                isActive ? 'bg-white/20 text-white' : chip.badgeClass
                            }`}
                        >
                            {chip.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

