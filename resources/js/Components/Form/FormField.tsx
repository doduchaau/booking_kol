import React, { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
    id?: string;
    label?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: ReactNode;
    className?: string;
}

export default function FormField({
    id,
    label,
    required = false,
    error,
    hint,
    children,
    className = '',
}: FormFieldProps) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={id}
                    className="block text-sm font-medium text-slate-700"
                >
                    {label}
                    {required && <span className="ml-1 text-rose-500 font-bold">*</span>}
                </label>
            )}

            <div>{children}</div>

            {hint && !error && (
                <p className="text-xs text-slate-500 leading-normal">{hint}</p>
            )}

            {error && (
                <p className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
}
