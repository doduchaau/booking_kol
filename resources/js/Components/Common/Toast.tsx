import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    type?: ToastType;
    message: string;
    description?: string;
    duration?: number;
    onClose?: () => void;
}

export default function Toast({
    type = 'success',
    message,
    description,
    duration = 4000,
    onClose,
}: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (duration <= 0) return;

        const timer = setTimeout(() => {
            setVisible(false);
            if (onClose) onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!visible) return null;

    const styles = {
        success: {
            container: 'bg-white border-emerald-200 text-slate-800 shadow-lg shadow-emerald-500/10',
            iconBg: 'bg-emerald-50 text-emerald-600',
            icon: CheckCircle2,
            badge: 'Thành công',
        },
        error: {
            container: 'bg-white border-rose-200 text-slate-800 shadow-lg shadow-rose-500/10',
            iconBg: 'bg-rose-50 text-rose-600',
            icon: AlertCircle,
            badge: 'Lỗi',
        },
        warning: {
            container: 'bg-white border-amber-200 text-slate-800 shadow-lg shadow-amber-500/10',
            iconBg: 'bg-amber-50 text-amber-600',
            icon: AlertTriangle,
            badge: 'Cảnh báo',
        },
        info: {
            container: 'bg-white border-blue-200 text-slate-800 shadow-lg shadow-blue-500/10',
            iconBg: 'bg-blue-50 text-blue-600',
            icon: Info,
            badge: 'Thông tin',
        },
    };

    const current = styles[type];
    const IconComponent = current.icon;

    return (
        <div
            role="alert"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 transition-all duration-200 animate-in fade-in slide-in-from-top-4 ${current.container}`}
        >
            <div className={`rounded-lg p-2 ${current.iconBg} shrink-0`}>
                <IconComponent className="h-5 w-5" />
            </div>

            <div className="flex-1 pt-0.5">
                <p className="text-sm font-semibold text-slate-900">{message}</p>
                {description && (
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{description}</p>
                )}
            </div>

            <button
                type="button"
                onClick={() => {
                    setVisible(false);
                    if (onClose) onClose();
                }}
                className="rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Đóng thông báo"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
