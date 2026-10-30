import React, { ReactNode } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import Button from './Button';

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message?: string;
    children?: ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    loading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    children,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy bỏ',
    variant = 'danger',
    loading = false,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconBg: 'bg-rose-50 text-rose-600',
            icon: AlertCircle,
            buttonVariant: 'danger' as const,
        },
        warning: {
            iconBg: 'bg-amber-50 text-amber-600',
            icon: AlertTriangle,
            buttonVariant: 'primary' as const,
        },
        primary: {
            iconBg: 'bg-primary-50 text-primary-600',
            icon: Info,
            buttonVariant: 'primary' as const,
        },
    };

    const current = variantStyles[variant];
    const IconComponent = current.icon;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={loading ? undefined : onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100 animate-in zoom-in-95">
                    <button
                        type="button"
                        onClick={loading ? undefined : onClose}
                        className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className={`rounded-xl p-3 ${current.iconBg} shrink-0`}>
                            <IconComponent className="h-6 w-6" />
                        </div>

                        <div className="flex-1 pt-0.5">
                            <h3 className="text-lg font-bold text-slate-900">
                                {title}
                            </h3>
                            {message && (
                                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                                    {message}
                                </p>
                            )}
                            {children && <div className="mt-3">{children}</div>}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            type="button"
                            variant={current.buttonVariant}
                            loading={loading}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
