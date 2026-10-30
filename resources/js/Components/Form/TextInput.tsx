import React, {
    forwardRef,
    InputHTMLAttributes,
    ReactNode,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isFocused?: boolean;
    error?: boolean | string;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
}

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        error = false,
        iconLeft,
        iconRight,
        ...props
    }: TextInputProps,
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    const borderClasses = error
        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 text-rose-900 placeholder-rose-300'
        : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500 text-slate-900 placeholder-slate-400';

    return (
        <div className="relative rounded-lg shadow-sm">
            {iconLeft && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    {iconLeft}
                </div>
            )}

            <input
                {...props}
                type={type}
                ref={localRef}
                className={`block w-full rounded-lg border bg-white text-sm transition-colors py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
                    iconLeft ? 'pl-9' : 'pl-3.5'
                } ${iconRight ? 'pr-9' : 'pr-3.5'} ${borderClasses} ${className}`}
            />

            {iconRight && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    {iconRight}
                </div>
            )}
        </div>
    );
});
