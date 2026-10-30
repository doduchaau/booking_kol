import React, { ReactNode, useEffect, useState } from 'react';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import Button from '../Common/Button';

export interface FilterBarProps {
    searchValue?: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filtersSlot?: ReactNode;
    actionsSlot?: ReactNode;
    onResetFilters?: () => void;
    activeFiltersCount?: number;
    className?: string;
}

export default function FilterBar({
    searchValue = '',
    onSearchChange,
    searchPlaceholder = 'Tìm kiếm...',
    filtersSlot,
    actionsSlot,
    onResetFilters,
    activeFiltersCount = 0,
    className = '',
}: FilterBarProps) {
    const [localSearch, setLocalSearch] = useState(searchValue);

    useEffect(() => {
        setLocalSearch(searchValue);
    }, [searchValue]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearch !== searchValue) {
                onSearchChange(localSearch);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [localSearch, searchValue, onSearchChange]);

    return (
        <div
            className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4 ${className}`}
        >
            <div className="flex flex-1 flex-wrap items-center gap-3">
                {/* Search Input Debounced */}
                <div className="relative min-w-[240px] max-w-sm flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="h-4 w-4" />
                    </div>
                    <input
                        type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm placeholder-slate-400 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                    {localSearch && (
                        <button
                            type="button"
                            onClick={() => {
                                setLocalSearch('');
                                onSearchChange('');
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Filter Dropdowns */}
                {filtersSlot && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        {filtersSlot}
                    </div>
                )}

                {/* Reset Filters Button */}
                {activeFiltersCount > 0 && onResetFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onResetFilters}
                        iconLeft={<RotateCcw className="h-3.5 w-3.5 text-slate-500" />}
                        className="text-slate-500 hover:text-slate-800"
                    >
                        Đặt lại ({activeFiltersCount})
                    </Button>
                )}
            </div>

            {actionsSlot && (
                <div className="flex items-center gap-2.5 shrink-0">
                    {actionsSlot}
                </div>
            )}
        </div>
    );
}
