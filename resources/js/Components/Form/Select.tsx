import React, { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectOption {
    value: string | number;
    label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options?: SelectOption[];
    error?: boolean | string;
    placeholder?: string;
}

export default forwardRef<HTMLSelectElement, SelectProps>(function Select(
    { options = [], error = false, placeholder, className = '', children, ...props },
    ref,
) {
    const borderClasses = error
        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 text-rose-900'
        : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-slate-900';

    return (
        <select
            {...props}
            ref={ref}
            className={`block w-full rounded-lg border bg-white py-2 pl-3.5 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${borderClasses} ${className}`}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {children}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
});
