import React, { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean | string;
}

export default forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
    { error = false, rows = 3, className = '', ...props },
    ref,
) {
    const borderClasses = error
        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 text-rose-900 placeholder-rose-300'
        : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-slate-900 placeholder-slate-400';

    return (
        <textarea
            {...props}
            ref={ref}
            rows={rows}
            className={`block w-full rounded-lg border bg-white p-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${borderClasses} ${className}`}
        />
    );
});
