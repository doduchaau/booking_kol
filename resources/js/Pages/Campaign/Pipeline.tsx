import React, { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Columns3,
    Clock,
    AlertCircle,
    User,
    ExternalLink,
    Search,
    Filter,
    ArrowLeft,
    Phone,
    Copy,
    CheckCircle2,
} from 'lucide-react';
import PageHeader from '@/Components/Common/PageHeader';
import Button from '@/Components/Common/Button';
import Badge from '@/Components/Common/Badge';

interface CreatorAccount {
    id: number;
    platform: string;
    handle: string;
    followers_count: number;
}

interface Creator {
    id: number;
    name: string;
    phone: string | null;
    niche: string;
    tier: string;
    accounts?: CreatorAccount[];
}

interface DeadlineInfo {
    status: 'safe' | 'warning' | 'overdue';
    days: number;
    text: string;
    date: string;
}

interface PipelineItem {
    id: number;
    campaign_id: number;
    creator_id: number;
    assigned_to: number | null;
    status: string;
    booking_fee: string | number;
    portal_token: string | null;
    notes: string | null;
    creator: Creator;
    assignee?: { id: number; name: string } | null;
    deadline_info?: DeadlineInfo | null;
}

interface KanbanColumn {
    id: string;
    title: string;
    status: string;
    items: PipelineItem[];
    count: number;
    total_booking_fee: number;
}

interface Campaign {
    id: number;
    name: string;
    product_name: string;
}

interface Props {
    campaign: Campaign;
    campaignList?: { id: number; name: string; status: string }[];
    columns: KanbanColumn[];
    filters: {
        assigned_to?: string;
        tier?: string;
        search?: string;
    };
    staffUsers: { id: number; name: string; email: string }[];
}

// Thẻ Card Sortable bên trong cột
function SortableCard({ item }: { item: PipelineItem }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id.toString(),
        data: {
            item,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm active:cursor-grabbing"
        >
            <CardInner item={item} />
        </div>
    );
}

// Nội dung thẻ Card Creator
function CardInner({ item }: { item: PipelineItem }) {
    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(val));
    };

    const mainAccount = item.creator?.accounts && item.creator.accounts.length > 0
        ? item.creator.accounts[0]
        : null;

    return (
        <div className="space-y-2.5">
            {/* Header Thẻ: Tên & Tier */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <span className="font-bold text-slate-900 text-sm block truncate group-hover:text-primary-600 transition-colors">
                        {item.creator?.name}
                    </span>
                    {mainAccount && (
                        <span className="text-[11px] text-slate-500 block truncate">
                            {mainAccount.platform}: @{mainAccount.handle}
                        </span>
                    )}
                </div>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 shrink-0">
                    {item.creator?.tier}
                </span>
            </div>

            {/* Phí Booking & Ngành hàng */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="font-semibold text-primary-700">
                    {formatCurrency(item.booking_fee)}
                </span>
                <span className="text-[11px] text-slate-400 capitalize">
                    {item.creator?.niche}
                </span>
            </div>

            {/* Deadline lên video nếu có */}
            {item.deadline_info && (
                <div
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border ${
                        item.deadline_info.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.deadline_info.status === 'warning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                >
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.deadline_info.text}</span>
                </div>
            )}

            {/* Footer Thẻ: Người phụ trách & SĐT */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{item.creator?.phone || 'Chưa có SĐT'}</span>
                </div>

                <div className="flex items-center gap-1">
                    <div
                        className="h-5 w-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-[9px]"
                        title={item.assignee ? `Phụ trách: ${item.assignee.name}` : 'Chưa phân công'}
                    >
                        {item.assignee ? item.assignee.name.charAt(0).toUpperCase() : '?'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Pipeline({
    campaign,
    campaignList = [],
    columns: initialColumns,
    filters,
    staffUsers,
}: Props) {
    const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
    const [activeItem, setActiveItem] = useState<PipelineItem | null>(null);

    // Filter states
    const [search, setSearch] = useState(filters.search || '');
    const [assignedTo, setAssignedTo] = useState(filters.assigned_to || '');
    const [tier, setTier] = useState(filters.tier || '');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Tránh kích hoạt nhầm khi chỉ click
            },
        }),
        useSensor(KeyboardSensor)
    );

    const triggerFilter = (s: string, a: string, t: string) => {
        router.get(
            route('pipeline.index', campaign.id),
            {
                search: s || undefined,
                assigned_to: a || undefined,
                tier: t || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const item = active.data.current?.item as PipelineItem;
        if (item) {
            setActiveItem(item);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const activeId = parseInt(active.id.toString());
        const overId = over.id.toString();

        // Tìm cột nguồn của thẻ
        const sourceColumn = columns.find((col) =>
            col.items.some((i) => i.id === activeId)
        );

        if (!sourceColumn) return;

        // Tìm cột đích (có thể drop vào chính container của cột hoặc rơi vào một thẻ trong cột)
        let targetColumn = columns.find((col) => col.id === overId);
        if (!targetColumn) {
            targetColumn = columns.find((col) =>
                col.items.some((i) => i.id.toString() === overId)
            );
        }

        if (!targetColumn || sourceColumn.id === targetColumn.id) {
            return;
        }

        const newStatus = targetColumn.status;
        const draggedItem = sourceColumn.items.find((i) => i.id === activeId);
        if (!draggedItem) return;

        // 1. OPTIMISTIC UPDATE: Cập nhật giao diện ngay lập tức
        const previousColumns = [...columns];
        const updatedSourceItems = sourceColumn.items.filter((i) => i.id !== activeId);
        const updatedTargetItems = [
            { ...draggedItem, status: newStatus },
            ...targetColumn.items,
        ];

        setColumns(
            columns.map((col) => {
                if (col.id === sourceColumn.id) {
                    return {
                        ...col,
                        items: updatedSourceItems,
                        count: updatedSourceItems.length,
                    };
                }
                if (col.id === targetColumn.id) {
                    return {
                        ...col,
                        items: updatedTargetItems,
                        count: updatedTargetItems.length,
                    };
                }
                return col;
            })
        );

        // 2. GỌI API CẬP NHẬT DATABASE
        router.patch(
            route('pipeline.status.update', activeId),
            { status: newStatus },
            {
                preserveState: true,
                preserveScroll: true,
                onError: () => {
                    // Nếu vi phạm điều kiện chuyển bước (VD: chưa có địa chỉ), rollback lại
                    setColumns(previousColumns);
                },
            }
        );
    };

    return (
        <AppLayout title={`Bảng Pipeline Kanban - ${campaign.name}`}>
            {/* Header Pipeline */}
            <PageHeader
                title={`Pipeline Kéo Thả: ${campaign.name}`}
                description={`Quản lý luồng tương tác và chuyển trạng thái Creator trong chiến dịch ${campaign.product_name}`}
                backHref={route('campaigns.show', campaign.id)}
                breadcrumbs={[
                    { label: 'Tổng quan', href: route('dashboard') },
                    { label: 'Chiến dịch', href: route('campaigns.index') },
                    { label: campaign.name, href: route('campaigns.show', campaign.id) },
                    { label: 'Pipeline' },
                ]}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Bộ chọn chiến dịch nhanh nếu có nhiều hơn 1 chiến dịch */}
                        {campaignList.length > 1 && (
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                                <span className="text-xs text-slate-500 pl-2 font-medium">Chiến dịch:</span>
                                <select
                                    value={campaign.id}
                                    onChange={(e) => {
                                        const nextId = e.target.value;
                                        if (nextId && Number(nextId) !== campaign.id) {
                                            router.visit(route('pipeline.index', nextId));
                                        }
                                    }}
                                    className="border-0 bg-transparent py-1 pl-1 pr-7 text-xs font-semibold text-slate-800 focus:ring-0 max-w-[180px] sm:max-w-[220px] truncate cursor-pointer"
                                >
                                    {campaignList.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Thanh lọc trên bảng Kanban */}
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    triggerFilter(e.target.value, assignedTo, tier);
                                }}
                                placeholder="Tìm Creator..."
                                className="border-0 bg-transparent py-1 px-2.5 text-xs focus:ring-0 w-32 sm:w-40"
                            />

                            <select
                                value={assignedTo}
                                onChange={(e) => {
                                    setAssignedTo(e.target.value);
                                    triggerFilter(search, e.target.value, tier);
                                }}
                                className="border-0 bg-transparent py-1 pl-2 pr-6 text-xs text-slate-600 focus:ring-0"
                            >
                                <option value="">Nhân viên</option>
                                {staffUsers.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={tier}
                                onChange={(e) => {
                                    setTier(e.target.value);
                                    triggerFilter(search, assignedTo, e.target.value);
                                }}
                                className="border-0 bg-transparent py-1 pl-2 pr-6 text-xs text-slate-600 focus:ring-0"
                            >
                                <option value="">Tier</option>
                                <option value="nano">NANO</option>
                                <option value="micro">MICRO</option>
                                <option value="macro">MACRO</option>
                                <option value="mega">MEGA</option>
                            </select>
                        </div>
                    </div>
                }
            />

            {/* Khung Bảng Kéo Thả Kanban DND-KIT */}
            <div className="h-[calc(100vh-13.5rem)] overflow-x-auto pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 h-full items-start">
                        {columns.map((col) => (
                            <div
                                key={col.id}
                                className="w-80 shrink-0 flex flex-col max-h-full rounded-2xl border border-slate-200/80 bg-slate-100/70 shadow-xs"
                            >
                                {/* Header của Cột */}
                                <div className="flex items-center justify-between p-3.5 border-b border-slate-200/60 bg-white/70 rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                                            {col.title}
                                        </h3>
                                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-200 px-1.5 text-[11px] font-bold text-slate-700">
                                            {col.count}
                                        </span>
                                    </div>

                                    {col.total_booking_fee > 0 && (
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(col.total_booking_fee)} đ
                                        </span>
                                    )}
                                </div>

                                {/* Vùng Chứa Các Thẻ Creator Cột */}
                                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[120px]">
                                    <SortableContext
                                        id={col.id}
                                        items={col.items.map((i) => i.id.toString())}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {col.items.map((item) => (
                                            <SortableCard key={item.id} item={item} />
                                        ))}
                                    </SortableContext>

                                    {col.items.length === 0 && (
                                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-center">
                                            <span className="text-xs text-slate-400 italic">
                                                Kéo thả thẻ vào đây
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Drag Overlay hiển thị thẻ lơ lửng khi kéo */}
                    <DragOverlay>
                        {activeItem ? (
                            <div className="w-72 rounded-xl border border-primary-300 bg-white p-3.5 shadow-2xl scale-105 rotate-1 opacity-95">
                                <CardInner item={activeItem} />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </AppLayout>
    );
}
