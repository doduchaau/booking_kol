import React, { useState, useMemo, useRef, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Users,
    CheckCircle2,
    AlertTriangle,
    Database,
    Plus,
    Sparkles,
    X,
} from 'lucide-react';
import Button from '@/Components/Common/Button';
import ConfirmDialog from '@/Components/Common/ConfirmDialog';

// Sub-components
import KocMatrixFilterBar from './KocMatrix/KocMatrixFilterBar';
import KocMatrixRow from './KocMatrix/KocMatrixRow';
import KocMatrixBulkActions from './KocMatrix/KocMatrixBulkActions';
import KocMatrixModals from './KocMatrix/KocMatrixModals';
import ChatEvidenceModal from './KocMatrix/ChatEvidenceModal';

// Types & Definitions
import {
    Campaign,
    CampaignCreatorPivot,
    StageType,
    RiskFilterType,
    STATUS_DEFINITIONS,
    Creator,
    CreatorAccount,
    DeadlineInfo,
    ContentPostItem,
    SampleLogItem,
} from './KocMatrix/types';

// Re-export types for backward compatibility
export type {
    Campaign,
    CampaignCreatorPivot,
    Creator,
    CreatorAccount,
    DeadlineInfo,
    ContentPostItem,
    StageType,
    RiskFilterType,
};
export { STATUS_DEFINITIONS };

interface Props {
    campaign: Campaign;
    items: CampaignCreatorPivot[];
    staffUsers: { id: number; name: string; email: string }[];
    onOpenAddModal: (selectAllInDb?: boolean) => void;
    totalAvailableCount?: number;
}

export default function KocMatrixTable({
    campaign,
    items,
    staffUsers,
    onOpenAddModal,
    totalAvailableCount = 0,
}: Props) {
    const [currentStage, setCurrentStage] = useState<StageType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
    const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
    const [riskFilter, setRiskFilter] = useState<RiskFilterType>('all');

    const pageUrl = usePage().url;

    // Lọc theo thông báo (focus_koc)
    const [focusKocId, setFocusKocId] = useState<number | null>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('focus_koc');
            return id ? parseInt(id, 10) : null;
        }
        return null;
    });

    // Lắng nghe thay đổi URL khi người dùng bấm thông báo
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('focus_koc');
            setFocusKocId(id ? parseInt(id, 10) : null);
            const stage = params.get('stage') as StageType | null;
            if (stage && ['all', 'outreach', 'waiting_approval', 'shipping', 'production', 'completion'].includes(stage)) {
                setCurrentStage(stage);
            }
        }
    }, [pageUrl]);

    const focusedItem = useMemo(() => {
        if (!focusKocId) return null;
        return items.find((item) => item.id === focusKocId) || null;
    }, [focusKocId, items]);

    const handleClearFocusKoc = () => {
        setFocusKocId(null);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('focus_koc');
            url.searchParams.delete('stage');
            window.history.replaceState({}, '', url.toString());
        }
    };

    // Quản lý chọn hàng loạt
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
    const [bulkSelectedStatus, setBulkSelectedStatus] = useState<string>('contacted');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [singleDeleteTarget, setSingleDeleteTarget] = useState<{ pivotId: number; name: string } | null>(null);
    const [isSingleDeleting, setIsSingleDeleting] = useState(false);

    // Chốt hợp tác modal
    const [dealModalItem, setDealModalItem] = useState<CampaignCreatorPivot | null>(null);
    const [dealFee, setDealFee] = useState<string>('0');
    const [quickZaloPivotId, setQuickZaloPivotId] = useState<number | null>(null);
    const [dealNotes, setDealNotes] = useState<string>('');

    // Modal xác nhận Lãnh đạo đã duyệt chi phí cast
    const [confirmApprovalItem, setConfirmApprovalItem] = useState<CampaignCreatorPivot | null>(null);
    const [approverName, setApproverName] = useState<string>('');
    const [approvalNotes, setApprovalNotes] = useState<string>('');
    const [isConfirmingApproval, setIsConfirmingApproval] = useState<boolean>(false);

    // Inline edit fee
    const [editingFeeId, setEditingFeeId] = useState<number | null>(null);
    const [tempFeeValue, setTempFeeValue] = useState<string>('');

    // Modal Xác Nhận Gửi Mẫu (Tinh giản cho booking: không cần carrier, tracking, fee)
    const [shipmentModalItem, setShipmentModalItem] = useState<CampaignCreatorPivot | null>(null);
    const [shipmentNotes, setShipmentNotes] = useState<string>('');
    const [shipmentDate, setShipmentDate] = useState<string>('');
    const [shipmentTrackingCode, setShipmentTrackingCode] = useState<string>('');
    const [editingLogId, setEditingLogId] = useState<number | null>(null);
    const [shipmentSubmitting, setShipmentSubmitting] = useState<boolean>(false);
    const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
    const [shipmentProducts, setShipmentProducts] = useState<Array<{
        product_id: number;
        name: string;
        sku?: string;
        quantity: number;
        variant: string;
        selected: boolean;
    }>>([]);

    // Form Nhập Nhanh Địa Chỉ nhận hàng ngay tại Modal Gửi Mẫu
    const [quickAddress, setQuickAddress] = useState<string>('');
    const [quickCity, setQuickCity] = useState<string>('');
    const [quickDistrict, setQuickDistrict] = useState<string>('');
    const [quickWard, setQuickWard] = useState<string>('');
    const [quickPhone, setQuickPhone] = useState<string>('');
    const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);

    // Modal Thêm Video (1 KOC nhiều video)
    const [videoModalItem, setVideoModalItem] = useState<CampaignCreatorPivot | null>(null);
    const [videoPlatform, setVideoPlatform] = useState<string>('tiktok');
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [videoTitle, setVideoTitle] = useState<string>('');
    const [videoPostedAt, setVideoPostedAt] = useState<string>('');
    const [videoSubmitting, setVideoSubmitting] = useState<boolean>(false);

    // Modal Ghi chú chi tiết cho KOC (Popup)
    const [noteModalItem, setNoteModalItem] = useState<CampaignCreatorPivot | null>(null);
    const [noteModalContent, setNoteModalContent] = useState<string>('');
    const [noteSubmitting, setNoteSubmitting] = useState<boolean>(false);

    // Modal Bằng chứng nhắn tin đối soát KOC (Popup)
    const [evidenceModalItem, setEvidenceModalItem] = useState<CampaignCreatorPivot | null>(null);
    const activeEvidenceItem = useMemo(() => {
        if (!evidenceModalItem) return null;
        return items.find((i) => i.id === evidenceModalItem.id) || evidenceModalItem;
    }, [evidenceModalItem, items]);

    // Feedback copy link portal
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Toast notification mini
    const [feedback, setFeedback] = useState<{ message: string; type?: 'success' | 'warning' | 'error' } | null>(null);

    const showFeedback = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
        setFeedback({ message: msg, type });
        setTimeout(() => setFeedback(null), 3500);
    };

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(Number(val) || 0);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    // Phân loại số lượng theo từng chặng
    const stageCounts = useMemo(() => {
        const counts = {
            all: items.length,
            waiting_approval: 0,
            outreach: 0,
            shipping: 0,
            production: 0,
            completion: 0,
        };

        items.forEach((item) => {
            if (item.status === 'waiting_approval') {
                counts.waiting_approval += 1;
            }
            const stage = STATUS_DEFINITIONS[item.status]?.stage;
            if (stage && stage in counts) {
                counts[stage] += 1;
            }
        });

        return counts;
    }, [items]);

    // Lọc danh sách KOC theo đa tiêu chí
    const filteredItems = useMemo(() => {
        // Ưu tiên bộ lọc từ thông báo (focus_koc): Chỉ hiển thị đúng KOC cần xử lý
        if (focusKocId) {
            const focused = items.filter((item) => item.id === focusKocId);
            if (focused.length > 0) {
                return focused;
            }
        }

        return items.filter((item) => {
            // Lọc theo Stage tab
            if (currentStage === 'waiting_approval') {
                if (item.status !== 'waiting_approval') return false;
            } else if (currentStage !== 'all') {
                const stage = STATUS_DEFINITIONS[item.status]?.stage;
                if (stage !== currentStage) return false;
            }

            // Lọc theo Nhân viên phụ trách
            if (selectedStaffFilter === 'unassigned') {
                if (item.assigned_to !== null) return false;
            } else if (selectedStaffFilter !== 'all') {
                if (item.assigned_to !== parseInt(selectedStaffFilter, 10)) return false;
            }

            // Lọc theo Nền tảng được giao trong chiến dịch
            if (selectedPlatformFilter !== 'all') {
                const booked = (item.booking_platforms || ['tiktok']).map((p) => p.toLowerCase());
                if (!booked.includes(selectedPlatformFilter.toLowerCase())) return false;
            }

            // Lọc theo Rủi ro
            if (riskFilter === 'overdue') {
                if (item.deadline_info?.status !== 'overdue') return false;
            } else if (riskFilter === 'warning') {
                if (item.deadline_info?.status !== 'warning') return false;
            } else if (riskFilter === 'missing_address') {
                if (Boolean(item.creator?.shipping_address?.trim())) return false;
            } else if (riskFilter === 'no_phone') {
                if (Boolean(item.creator?.phone?.trim())) return false;
            }

            // Lọc theo Từ khóa tìm kiếm (Tên, SĐT, Niche, Tier, hoặc bất kỳ Handle nào của KOC)
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase().trim();
                const name = item.creator?.name?.toLowerCase() || '';
                const phone = item.creator?.phone?.toLowerCase() || '';
                const niche = item.creator?.niche?.toLowerCase() || '';
                const tier = item.creator?.tier?.toLowerCase() || '';
                const allHandles = (item.creator?.accounts || []).map((a) => a.handle.toLowerCase()).join(' ');

                if (
                    !name.includes(q) &&
                    !phone.includes(q) &&
                    !niche.includes(q) &&
                    !tier.includes(q) &&
                    !allHandles.includes(q)
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [items, currentStage, selectedStaffFilter, selectedPlatformFilter, riskFilter, searchQuery]);

    // Virtual Scrolling
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const ROW_HEIGHT = 72;
    const OVERSCAN = 8;
    const isVirtualEnabled = filteredItems.length > 30;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
            setScrollTop(0);
        }
    }, [currentStage, searchQuery, selectedStaffFilter, riskFilter]);

    const { topPadding, bottomPadding, visibleItems } = useMemo(() => {
        if (!isVirtualEnabled) {
            return {
                topPadding: 0,
                bottomPadding: 0,
                visibleItems: filteredItems,
            };
        }

        const viewportHeight = 650;
        const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
        const end = Math.min(filteredItems.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);

        return {
            topPadding: start * ROW_HEIGHT,
            bottomPadding: Math.max(0, (filteredItems.length - end) * ROW_HEIGHT),
            visibleItems: filteredItems.slice(start, end),
        };
    }, [filteredItems, scrollTop, isVirtualEnabled]);

    // Chọn / Bỏ chọn dòng
    const handleToggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map((item) => item.id));
        }
    };

    // Copy link portal
    const handleCopyPortal = (token: string | null) => {
        if (!token) return;
        const link = `${window.location.origin}/portal/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedToken(token);
        showFeedback('Đã sao chép link Portal vào clipboard!');
        setTimeout(() => setCopiedToken(null), 2500);
    };

    // Gia hạn link portal
    const handleExtendPortal = (item: CampaignCreatorPivot) => {
        router.post(
            route('campaigns.creators.portal.extend', { id: campaign.id, pivotId: item.id }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback(`Đã gia hạn link Portal cho KOC [${item.creator.name}] thành công!`);
                },
                onError: (err) => {
                    alert(err.error || 'Có lỗi xảy ra khi gia hạn link Portal.');
                },
            }
        );
    };

    // Quản lý thông báo KOC thiếu SĐT khi tiếp cận Zalo
    const [missingPhoneItem, setMissingPhoneItem] = useState<CampaignCreatorPivot | null>(null);
    const [quickPhoneInput, setQuickPhoneInput] = useState<string>('');
    const [isSavingPhone, setIsSavingPhone] = useState<boolean>(false);

    // Mở Zalo thông minh theo ngữ cảnh
    const handleOpenZalo = (item: CampaignCreatorPivot) => {
        const phone = item.creator?.phone?.trim();
        if (!phone) {
            setMissingPhoneItem(item);
            setQuickPhoneInput('');
            showFeedback(`KOC [${item.creator?.name || 'này'}] chưa có số điện thoại để tiếp cận Zalo!`, 'warning');
            return;
        }
        setQuickZaloPivotId(item.id);
    };

    const handleSavePhoneAndOpenZalo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!missingPhoneItem) return;
        const phoneToSave = quickPhoneInput.trim();
        if (!phoneToSave) {
            alert('Vui lòng nhập số điện thoại hợp lệ!');
            return;
        }

        setIsSavingPhone(true);
        router.patch(
            route('campaigns.creators.quick-update', [campaign.id, missingPhoneItem.id]),
            { phone: phoneToSave },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setIsSavingPhone(false);
                    const savedItemId = missingPhoneItem.id;
                    const savedCreatorName = missingPhoneItem.creator?.name || 'KOC';
                    setMissingPhoneItem(null);
                    showFeedback(`Đã cập nhật SĐT cho KOC [${savedCreatorName}]!`);
                    setQuickZaloPivotId(savedItemId);
                },
                onError: (err: any) => {
                    setIsSavingPhone(false);
                    alert(err?.phone || err?.error || 'Không thể lưu số điện thoại.');
                },
            }
        );
    };

    // Chuyển trạng thái nhanh 1 dòng
    const handleQuickStatusChange = (itemOrId: CampaignCreatorPivot | number, newStatus: string, notes?: string) => {
        const item = typeof itemOrId === 'number'
            ? items.find((c) => c.id === itemOrId)
            : itemOrId;
        const pivotId = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;

        // Ràng buộc chi phí cast
        const hasCastFee = parseFloat(String(item?.booking_fee || 0)) > 0;
        const isCastApproved = Boolean(item?.approved_cost_at);
        if (hasCastFee && !isCastApproved) {
            if (['address_confirmed', 'sample_sent', 'sample_received', 'posted', 'completed'].includes(newStatus)) {
                alert(`KOC ${item ? `[${item.creator.name}] ` : ''}có phát sinh chi phí cast (${formatCurrency(item?.booking_fee || 0)}) chưa được duyệt. Vui lòng bấm [Xác nhận Lãnh đạo đã duyệt] trước khi tiếp tục.`);
                return;
            }
        }

        // Ràng buộc địa chỉ khi chuyển sample_sent
        if (newStatus === 'sample_sent') {
            const hasAddress = Boolean(item?.creator?.shipping_address?.trim());
            if (!hasAddress) {
                if (item) handleOpenShipmentModal(item);
                showFeedback(`KOC ${item ? `[${item.creator.name}] ` : ''}chưa có địa chỉ nhận hàng. Vui lòng nhập địa chỉ trước khi xác nhận gửi mẫu.`);
                return;
            }
        }

        // Ràng buộc gửi mẫu khi chuyển sample_received / posted
        if (['sample_received', 'posted'].includes(newStatus)) {
            const isSent = Boolean(item?.sample_sent_at) || ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item?.status || '');
            if (!isSent) {
                alert(`Không thể chuyển sang [${STATUS_DEFINITIONS[newStatus]?.label || newStatus}] vì KOC ${item ? `[${item.creator.name}] ` : ''}chưa được gửi mẫu sản phẩm.`);
                return;
            }
        }

        // Ràng buộc video khi chuyển posted
        if (newStatus === 'posted') {
            const hasVideo = Boolean((item?.content_posts && item.content_posts.length > 0) || (item?.contentPosts && item.contentPosts.length > 0));
            if (!hasVideo) {
                if (item) handleOpenVideoModal(item);
                showFeedback(`KOC ${item ? `[${item.creator.name}] ` : ''}chưa có link video. Vui lòng nhập link video để chuyển sang trạng thái Đã lên video.`);
                return;
            }
        }

        router.patch(
            route('pipeline.status.update', pivotId),
            { status: newStatus, notes },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback(`Đã chuyển trạng thái sang [${STATUS_DEFINITIONS[newStatus]?.label || newStatus}]`);
                },
                onError: (errors) => {
                    alert(errors.status || errors.error || (typeof errors === 'object' ? Object.values(errors)[0] : '') || 'Có lỗi xảy ra khi cập nhật trạng thái.');
                },
            }
        );
    };

    // Lưu inline edit phí booking
    const handleSaveInlineFee = (pivotId: number) => {
        const fee = parseFloat(tempFeeValue);
        if (isNaN(fee) || fee < 0) {
            setEditingFeeId(null);
            return;
        }

        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId }),
            { booking_fee: fee },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingFeeId(null);
                    showFeedback('Đã cập nhật phí booking thành công!');
                },
            }
        );
    };

    // Gán nhân viên phụ trách trực tiếp
    const handleInlineAssign = (pivotId: number, staffId: string) => {
        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId }),
            { assigned_to: staffId ? parseInt(staffId, 10) : null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback('Đã phân công nhân viên phụ trách!');
                },
            }
        );
    };

    // Cập nhật nhanh hình thức hợp tác (Video / Live / Both)
    const handleInlineCollaborationTypeChange = (pivotId: number, type: string) => {
        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId }),
            { collaboration_type: type },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback('Đã cập nhật hình thức hợp tác!');
                },
            }
        );
    };

    // Cập nhật nhanh danh sách nền tảng KOC cam kết làm (TikTok, Shopee, FB...)
    const handleInlinePlatformsChange = (pivotId: number, platforms: string[]) => {
        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId }),
            { booking_platforms: platforms },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback('Đã cập nhật nền tảng booking!');
                },
            }
        );
    };

    // Cập nhật nhanh ghi chú nội bộ cho KOC
    const handleInlineNoteChange = (pivotId: number, note: string) => {
        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId }),
            { notes: note },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback('Đã lưu ghi chú KOC!');
                },
            }
        );
    };

    // Mở popup modal ghi chú chi tiết
    const handleOpenNoteModal = (item: CampaignCreatorPivot) => {
        setNoteModalItem(item);
        setNoteModalContent(item.notes || '');
    };

    // Mở popup modal bằng chứng tin nhắn đối soát
    const handleOpenEvidenceModal = (item: CampaignCreatorPivot) => {
        setEvidenceModalItem(item);
    };

    // Lưu ghi chú từ popup modal
    const handleSaveNoteModal = () => {
        if (!noteModalItem) return;
        setNoteSubmitting(true);
        router.patch(
            route('campaigns.creators.quick-update', { id: campaign.id, pivotId: noteModalItem.id }),
            { notes: noteModalContent },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNoteModalItem(null);
                    setNoteSubmitting(false);
                    showFeedback('Đã cập nhật ghi chú KOC thành công!');
                },
                onError: () => setNoteSubmitting(false),
            }
        );
    };

    // Mở hộp thoại xác nhận xóa 1 KOC khỏi chiến dịch
    const handleRemoveCreator = (pivotId: number, name: string) => {
        setSingleDeleteTarget({ pivotId, name });
    };

    // Thực hiện xóa 1 KOC
    const handleExecuteSingleRemove = () => {
        if (!singleDeleteTarget) return;

        setIsSingleDeleting(true);
        router.delete(
            route('campaigns.creators.remove', { id: campaign.id, pivotId: singleDeleteTarget.pivotId }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    const name = singleDeleteTarget.name;
                    setSingleDeleteTarget(null);
                    setIsSingleDeleting(false);
                    showFeedback(`Đã xóa KOC [${name}] khỏi chiến dịch.`);
                },
                onError: (err: any) => {
                    setIsSingleDeleting(false);
                    alert(err?.error || 'Không thể xóa KOC này.');
                },
            }
        );
    };

    // Thực hiện xóa hàng loạt KOC đã chọn khỏi chiến dịch
    const handleExecuteBulkRemove = () => {
        if (selectedIds.length === 0) return;

        setIsBulkDeleting(true);
        router.post(
            route('campaigns.creators.bulk-remove', campaign.id),
            { ids: selectedIds },
            {
                preserveScroll: true,
                onSuccess: () => {
                    const count = selectedIds.length;
                    setIsBulkDeleteModalOpen(false);
                    setSelectedIds([]);
                    setIsBulkDeleting(false);
                    showFeedback(`Đã xóa ${count} KOC khỏi chiến dịch.`);
                },
                onError: (err: any) => {
                    setIsBulkDeleting(false);
                    alert(err?.error || 'Có lỗi xảy ra khi xóa KOC.');
                },
            }
        );
    };

    // Xử lý cập nhật hàng loạt trạng thái
    const handleExecuteBulkStatus = () => {
        if (selectedIds.length === 0) return;

        setBulkProcessing(true);
        router.post(
            route('campaigns.creators.bulk-status', campaign.id),
            {
                ids: selectedIds,
                status: bulkSelectedStatus,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsBulkStatusModalOpen(false);
                    setSelectedIds([]);
                    setBulkProcessing(false);
                    showFeedback(`Đã cập nhật hàng loạt trạng thái sang [${STATUS_DEFINITIONS[bulkSelectedStatus]?.label}]!`);
                },
                onFinish: () => setBulkProcessing(false),
            }
        );
    };

    // Xử lý phân bổ nhân viên hàng loạt
    const handleExecuteBulkAssign = (staffId: string) => {
        if (selectedIds.length === 0) return;

        router.post(
            route('campaigns.creators.bulk-assign', campaign.id),
            {
                ids: selectedIds,
                assigned_to: staffId ? parseInt(staffId, 10) : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedIds([]);
                    showFeedback('Đã phân bổ nhân sự hàng loạt thành công!');
                },
            }
        );
    };

    // Sao chép danh sách SĐT KOC đã chọn
    const handleCopyPhones = () => {
        const phones = items
            .filter((item) => selectedIds.includes(item.id))
            .map((item) => item.creator.phone)
            .filter(Boolean)
            .join(', ');

        if (!phones) {
            alert('Các KOC đã chọn đều chưa có số điện thoại!');
            return;
        }

        navigator.clipboard.writeText(phones);
        showFeedback(`Đã sao chép ${selectedIds.length} số điện thoại!`);
    };

    // Chốt hợp tác với KOC (gửi form deal)
    const handleSubmitDeal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!dealModalItem) return;

        const fee = parseFloat(dealFee) || 0;
        const targetStatus = fee > 0 ? 'waiting_approval' : 'agreed';

        router.patch(
            route('pipeline.status.update', dealModalItem.id),
            {
                status: targetStatus,
                booking_fee: fee,
                notes: dealNotes,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDealModalItem(null);
                    showFeedback(
                        fee > 0
                            ? 'Đã lưu thỏa thuận & chuyển sang [Chờ duyệt chi phí]!'
                            : 'Đã chốt hợp tác thành công!'
                    );
                },
                onError: (err) => {
                    alert(err.status || err.error || 'Không thể cập nhật hợp tác.');
                },
            }
        );
    };

    // Xác nhận Lãnh đạo đã duyệt chi phí cast
    const handleConfirmCastApproved = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmApprovalItem) return;

        setIsConfirmingApproval(true);
        router.patch(
            route('pipeline.cast.confirm', confirmApprovalItem.id),
            {
                approver_name: approverName.trim() || undefined,
                approval_notes: approvalNotes.trim() || undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmApprovalItem(null);
                    setIsConfirmingApproval(false);
                    showFeedback('Đã xác nhận phê duyệt chi phí cast! KOC đã chuyển sang [Đã chốt hợp tác].');
                },
                onError: (err) => {
                    setIsConfirmingApproval(false);
                    alert(err.error || 'Có lỗi xảy ra khi xác nhận phê duyệt.');
                },
            }
        );
    };

    // Đàm phán lại mức phí
    const handleReopenDeal = (item: CampaignCreatorPivot) => {
        if (!window.confirm(`Đưa KOC [${item.creator.name}] về trạng thái [Đã liên hệ] để nhân viên thương thảo lại mức giá?`)) {
            return;
        }

        router.patch(
            route('pipeline.cast.reopen', item.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    showFeedback('Đã đưa KOC về trạng thái [Đã liên hệ] để đàm phán lại.');
                },
                onError: (err) => {
                    alert(err.error || 'Có lỗi xảy ra.');
                },
            }
        );
    };

    // Mở modal xác nhận gửi mẫu
    const handleOpenShipmentModal = (item: CampaignCreatorPivot) => {
        setShipmentModalItem(item);
        setEditingLogId(null);
        setShipmentNotes('');
        setShipmentTrackingCode('');
        setShipmentDate(new Date().toISOString().split('T')[0]);
        setCopiedAddress(false);

        // Chuẩn bị danh sách sản phẩm mẫu để nhân viên tích chọn
        const existingCreatorProds = item.creatorProducts || item.creator_products || [];
        const campaignProds = campaign.products || [];

        const mapped = campaignProds.map((cp) => {
            const existing = existingCreatorProds.find((p) => p.campaign_product_id === cp.id);
            return {
                product_id: cp.id,
                name: cp.name || cp.product_name || 'Sản phẩm',
                sku: cp.sku || cp.product_sku || '',
                quantity: existing ? (existing.quantity_sent || existing.quantity_assigned || 1) : 1,
                variant: existing?.sample_variant || '',
                selected: existing ? true : campaignProds.length === 1 ? true : false,
            };
        });
        setShipmentProducts(mapped);

        setQuickAddress(item.creator?.shipping_address || '');
        setQuickCity(item.creator?.city_province || '');
        setQuickDistrict(item.creator?.district || '');
        setQuickWard(item.creator?.ward || '');
        setQuickPhone(item.creator?.phone || '');

        const hasAllAddressFields = Boolean(
            item.creator?.shipping_address?.trim() &&
            item.creator?.phone?.trim() &&
            item.creator?.city_province?.trim() &&
            item.creator?.ward?.trim()
        );
        setIsEditingAddress(!hasAllAddressFields);
    };

    // Bắt đầu chỉnh sửa một đợt gửi mẫu cụ thể
    const handleStartEditShipmentLog = (log: SampleLogItem) => {
        setEditingLogId(log.id);
        setShipmentDate(log.shipped_at || new Date().toISOString().split('T')[0]);
        setShipmentNotes(log.notes || '');
        setShipmentTrackingCode(log.tracking_code || '');

        const campaignProds = campaign.products || [];
        const logItems = log.items || [];

        const mapped = campaignProds.map((cp) => {
            const found = logItems.find((it) => it.product_id === cp.id);
            return {
                product_id: cp.id,
                name: cp.name || cp.product_name || 'Sản phẩm',
                sku: cp.sku || cp.product_sku || '',
                quantity: found ? found.quantity : 1,
                variant: found?.variant || '',
                selected: Boolean(found),
            };
        });
        setShipmentProducts(mapped);
    };

    // Hủy chế độ sửa đợt gửi mẫu, quay lại tạo đợt mới
    const handleCancelEditShipmentLog = () => {
        setEditingLogId(null);
        setShipmentNotes('');
        setShipmentTrackingCode('');
        setShipmentDate(new Date().toISOString().split('T')[0]);
        if (shipmentModalItem) {
            const existingCreatorProds = shipmentModalItem.creatorProducts || shipmentModalItem.creator_products || [];
            const campaignProds = campaign.products || [];
            const mapped = campaignProds.map((cp) => {
                const existing = existingCreatorProds.find((p) => p.campaign_product_id === cp.id);
                return {
                    product_id: cp.id,
                    name: cp.name || cp.product_name || 'Sản phẩm',
                    sku: cp.sku || cp.product_sku || '',
                    quantity: existing ? (existing.quantity_sent || existing.quantity_assigned || 1) : 1,
                    variant: existing?.sample_variant || '',
                    selected: existing ? true : campaignProds.length === 1 ? true : false,
                };
            });
            setShipmentProducts(mapped);
        }
    };

    // Xóa một đợt gửi mẫu khỏi lịch sử evidence
    const handleDeleteShipmentLog = (logId: number) => {
        if (!shipmentModalItem) return;
        if (!confirm('Bạn có chắc chắn muốn xóa đợt gửi mẫu này khỏi lịch sử evidence?')) return;

        router.delete(
            route('campaigns.creators.shipments.destroy', {
                id: campaign.id,
                pivotId: shipmentModalItem.id,
                logId: logId,
            }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (editingLogId === logId) {
                        setEditingLogId(null);
                    }
                    showFeedback('Đã xóa đợt gửi mẫu khỏi lịch sử thành công!');
                },
                onError: (err) => {
                    alert(err.error || Object.values(err)[0] || 'Không thể xóa đợt gửi mẫu.');
                },
            }
        );
    };

    const handleToggleShipmentProduct = (productId: number) => {
        setShipmentProducts((prev) =>
            prev.map((p) => (p.product_id === productId ? { ...p, selected: !p.selected } : p))
        );
    };

    const handleChangeShipmentProductQty = (productId: number, delta: number) => {
        setShipmentProducts((prev) =>
            prev.map((p) => {
                if (p.product_id === productId) {
                    return { ...p, quantity: Math.max(1, p.quantity + delta) };
                }
                return p;
            })
        );
    };

    const handleChangeShipmentProductVariant = (productId: number, variant: string) => {
        setShipmentProducts((prev) =>
            prev.map((p) => (p.product_id === productId ? { ...p, variant } : p))
        );
    };

    // Sao chép thông tin nhận mẫu gửi kho
    const handleCopyWarehouseAddress = (item: CampaignCreatorPivot) => {
        const fullAddress = [
            item.creator.shipping_address,
            item.creator.ward,
            item.creator.district,
            item.creator.city_province,
        ]
            .filter(Boolean)
            .join(', ');

        const text = `TÊN KOC: ${item.creator.name}\nSĐT: ${item.creator.phone || 'Chưa có'}\nĐỊA CHỈ: ${fullAddress || 'Chưa cập nhật'}\nCHIẾN DỊCH: ${campaign.name} (${campaign.product_name})`;

        navigator.clipboard.writeText(text);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
    };

    // Xác nhận gửi mẫu cho KOC
    const handleSubmitShipment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shipmentModalItem) return;

        const effectiveAddress = (quickAddress.trim() || shipmentModalItem.creator?.shipping_address?.trim() || '');
        const effectivePhone = (quickPhone.trim() || shipmentModalItem.creator?.phone?.trim() || '');
        const effectiveCity = (quickCity.trim() || shipmentModalItem.creator?.city_province?.trim() || '');
        const effectiveWard = (quickWard.trim() || shipmentModalItem.creator?.ward?.trim() || '');

        if (!effectiveAddress || !effectivePhone || !effectiveCity || !effectiveWard) {
            alert('Vui lòng nhập đầy đủ các thông tin bắt buộc: Số nhà/đường, Số điện thoại, Tỉnh/Thành phố và Phường/Xã trước khi xác nhận gửi mẫu.');
            return;
        }

        const selectedProductsToSend = shipmentProducts
            .filter((p) => p.selected)
            .map((p) => ({
                product_id: p.product_id,
                quantity: p.quantity,
                variant: p.variant.trim() || undefined,
            }));

        if (shipmentProducts.length > 0 && selectedProductsToSend.length === 0) {
            alert('Vui lòng tích chọn ít nhất 1 sản phẩm mẫu để gửi cho KOC!');
            return;
        }

        setShipmentSubmitting(true);
        const shipmentPayload = {
            notes: shipmentNotes,
            shipped_at: shipmentDate || undefined,
            tracking_code: shipmentTrackingCode.trim() || undefined,
            shipping_address: quickAddress.trim() || undefined,
            city_province: quickCity.trim() || undefined,
            district: quickDistrict.trim() || undefined,
            ward: quickWard.trim() || undefined,
            phone: quickPhone.trim() || undefined,
            products: selectedProductsToSend,
        };

        if (editingLogId !== null) {
            router.put(
                route('campaigns.creators.shipments.update', {
                    id: campaign.id,
                    pivotId: shipmentModalItem.id,
                    logId: editingLogId,
                }),
                shipmentPayload,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setEditingLogId(null);
                        setShipmentSubmitting(false);
                        showFeedback('Đã cập nhật đợt gửi mẫu thành công!');
                    },
                    onError: (err) => {
                        setShipmentSubmitting(false);
                        alert(err.error || Object.values(err)[0] || 'Không thể cập nhật đợt gửi mẫu.');
                    },
                }
            );
            return;
        }

        router.post(
            route('campaigns.creators.shipments.store', { id: campaign.id, pivotId: shipmentModalItem.id }),
            shipmentPayload,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShipmentModalItem(null);
                    setShipmentSubmitting(false);
                    showFeedback('Đã xác nhận gửi mẫu thành công!');
                },
                onError: (err) => {
                    setShipmentSubmitting(false);
                    alert(err.error || Object.values(err)[0] || 'Không thể xác nhận gửi mẫu.');
                },
            }
        );
    };

    // Mở modal thêm video
    const handleOpenVideoModal = (item: CampaignCreatorPivot) => {
        const isSent = Boolean(item.sample_sent_at) || ['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status);
        if (!isSent) {
            alert(`Không thể thêm video cho KOC [${item.creator.name}] vì chưa gửi mẫu sản phẩm.`);
            return;
        }

        setVideoModalItem(item);
        setVideoPlatform('tiktok');
        setVideoUrl('');
        setVideoTitle('');
        setVideoPostedAt(new Date().toISOString().split('T')[0]);
    };

    // Thêm video mới cho KOC
    const handleSubmitVideo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoModalItem) return;

        if (!videoUrl.trim()) {
            alert('Vui lòng nhập đường link bài đăng / video!');
            return;
        }

        setVideoSubmitting(true);
        router.post(
            route('campaigns.creators.videos.store', { id: campaign.id, pivotId: videoModalItem.id }),
            {
                platform: videoPlatform,
                post_url: videoUrl.trim(),
                video_title: videoTitle.trim() || null,
                posted_at: videoPostedAt || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVideoModalItem(null);
                    setVideoSubmitting(false);
                    showFeedback('Đã thêm video thành công!');
                },
                onError: (err) => {
                    setVideoSubmitting(false);
                    alert(Object.values(err)[0] || 'Không thể thêm video.');
                },
            }
        );
    };

    // Tính toán số KOC thiếu điều kiện khi bulk update
    const bulkMissingAddressCount = useMemo(() => {
        return items
            .filter((item) => selectedIds.includes(item.id))
            .filter((item) => !item.creator?.shipping_address?.trim()).length;
    }, [items, selectedIds]);

    const bulkNotSentCount = useMemo(() => {
        return items
            .filter((item) => selectedIds.includes(item.id))
            .filter((item) => !item.sample_sent_at && !['sample_sent', 'sample_received', 'posted', 'completed'].includes(item.status)).length;
    }, [items, selectedIds]);

    return (
        <div className="space-y-4 relative">
            {/* Toast Mini Feedback */}
            {feedback && (
                <div
                    className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xl animate-in fade-in slide-from-top-4 ${
                        feedback.type === 'warning'
                            ? 'bg-amber-600 text-white'
                            : feedback.type === 'error'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-900 text-white'
                    }`}
                >
                    {feedback.type === 'warning' || feedback.type === 'error' ? (
                        <AlertTriangle className="h-4 w-4 text-amber-200 shrink-0" />
                    ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Banner Lọc Theo Thông Báo (Focus Notification KOC) */}
            {focusedItem && focusKocId && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 via-indigo-50/50 to-white p-4 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-xs">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">Đang lọc theo thông báo:</span>
                                <span className="inline-flex items-center rounded-lg bg-primary-600 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-2xs">
                                    {focusedItem.creator?.name}
                                </span>
                                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                                    {STATUS_DEFINITIONS[focusedItem.status]?.label || focusedItem.status}
                                </span>
                            </div>
                            <p className="text-[12px] text-slate-500 mt-0.5">
                                Hệ thống chỉ hiển thị đúng KOC trong thông báo để bạn thao tác nhanh mà không cần tìm kiếm lại.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClearFocusKoc}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                        <span>Xem toàn bộ ({items.length} KOC)</span>
                    </button>
                </div>
            )}

            {/* BỘ LỌC TÌM KIẾM, PHÂN ĐOÀN VÀ RỦI RO */}
            <KocMatrixFilterBar
                currentStage={currentStage}
                onStageChange={(st) => {
                    if (focusKocId) handleClearFocusKoc();
                    setCurrentStage(st);
                }}
                stageCounts={stageCounts}
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                    if (focusKocId) handleClearFocusKoc();
                    setSearchQuery(q);
                }}
                riskFilter={riskFilter}
                onRiskFilterChange={(rf) => {
                    if (focusKocId) handleClearFocusKoc();
                    setRiskFilter(rf);
                }}
                selectedStaffFilter={selectedStaffFilter}
                onStaffFilterChange={(sf) => {
                    if (focusKocId) handleClearFocusKoc();
                    setSelectedStaffFilter(sf);
                }}
                selectedPlatformFilter={selectedPlatformFilter}
                onPlatformFilterChange={(pf) => {
                    if (focusKocId) handleClearFocusKoc();
                    setSelectedPlatformFilter(pf);
                }}
                targetPlatforms={campaign.target_platforms}
                staffUsers={staffUsers}
                videoDeadlineDays={campaign.video_deadline_days}
                isVirtualEnabled={isVirtualEnabled}
                visibleCount={visibleItems.length}
                filteredCount={filteredItems.length}
            />

            {/* BẢNG DỮ LIỆU TIẾN ĐỘ MA TRẬN KOC */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="overflow-x-auto overflow-y-auto max-h-[680px] min-h-[300px]"
                >
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-[11px] font-bold uppercase tracking-wider text-slate-500 shadow-xs">
                            <tr>
                                <th className="w-9 px-2.5 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={
                                            filteredItems.length > 0 &&
                                            selectedIds.length === filteredItems.length
                                        }
                                        onChange={handleSelectAll}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-3 py-3 min-w-[180px]">Creator / Kênh</th>
                                <th className="px-3 py-3 min-w-[130px]">Nền tảng Book</th>
                                <th className="px-3 py-3 min-w-[130px]">Trạng thái & Hạn</th>
                                <th className="px-3 py-3 min-w-[140px]">Mẫu & Video</th>
                                <th className="px-3 py-3 min-w-[130px]">Phí & Phụ trách</th>
                                <th className="px-3 py-3 min-w-[140px]">Ghi chú</th>
                                <th className="px-3 py-3 min-w-[210px] text-right">Kết nối & Thao tác</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {topPadding > 0 && (
                                <tr style={{ height: `${topPadding}px` }} aria-hidden="true">
                                    <td colSpan={8} className="p-0 border-0" />
                                </tr>
                            )}
                            {filteredItems.length > 0 ? (
                                visibleItems.map((item) => (
                                    <KocMatrixRow
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedIds.includes(item.id)}
                                        isFocused={focusKocId === item.id}
                                        onToggleSelect={handleToggleSelect}
                                        staffUsers={staffUsers}
                                        campaignTargetPlatforms={campaign.target_platforms}
                                        onInlineAssign={handleInlineAssign}
                                        onInlineCollaborationTypeChange={handleInlineCollaborationTypeChange}
                                        onInlinePlatformsChange={handleInlinePlatformsChange}
                                        onInlineNoteChange={handleInlineNoteChange}
                                        editingFeeId={editingFeeId}
                                        tempFeeValue={tempFeeValue}
                                        onStartEditFee={(id, currentFee) => {
                                            setEditingFeeId(id);
                                            setTempFeeValue(String(currentFee || 0));
                                        }}
                                        onTempFeeChange={setTempFeeValue}
                                        onSaveInlineFee={handleSaveInlineFee}
                                        onCancelEditFee={() => setEditingFeeId(null)}
                                        onOpenDealModal={(it) => {
                                            setDealModalItem(it);
                                            setDealFee(String(it.booking_fee || 0));
                                            setDealNotes(it.notes || '');
                                        }}
                                        onOpenConfirmApprovalModal={(it) => {
                                            setConfirmApprovalItem(it);
                                            setApproverName(it.approver_name || '');
                                            setApprovalNotes(it.approval_notes || '');
                                        }}
                                        onReopenDeal={handleReopenDeal}
                                        onCopyPortal={handleCopyPortal}
                                        onExtendPortal={handleExtendPortal}
                                        copiedToken={copiedToken}
                                        onQuickStatusChange={handleQuickStatusChange}
                                        onOpenShipmentModal={handleOpenShipmentModal}
                                        onOpenVideoModal={handleOpenVideoModal}
                                        onOpenNoteModal={handleOpenNoteModal}
                                        onOpenEvidenceModal={handleOpenEvidenceModal}
                                        onOpenZalo={handleOpenZalo}
                                        onRemoveCreator={handleRemoveCreator}
                                        formatCurrency={formatCurrency}
                                        formatDate={formatDate}
                                    />
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-14 text-center">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-primary-600 mb-3 shadow-inner">
                                            <Users className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800">
                                            Chiến dịch này chưa có KOC nào
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                                            Hãy bắt đầu quy trình bằng cách chọn các KOC mục tiêu từ kho dữ liệu CRM hoặc gán toàn bộ KOC khả dụng vào chiến dịch.
                                        </p>
                                        <div className="flex items-center justify-center gap-3">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => onOpenAddModal(false)}
                                                iconLeft={<Plus className="h-4 w-4" />}
                                            >
                                                Chọn KOC từ kho CRM
                                            </Button>
                                            {totalAvailableCount > 0 && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => onOpenAddModal(true)}
                                                    iconLeft={<Database className="h-4 w-4" />}
                                                >
                                                    Gán Toàn Bộ Kho ({totalAvailableCount} KOC)
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                        <p className="font-semibold text-slate-700">
                                            Không tìm thấy KOC nào phù hợp bộ lọc
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Hãy thử đổi tab chặng hoặc tìm kiếm với từ khóa khác.
                                        </p>
                                    </td>
                                </tr>
                            )}
                            {bottomPadding > 0 && (
                                <tr style={{ height: `${bottomPadding}px` }} aria-hidden="true">
                                    <td colSpan={8} className="p-0 border-0" />
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Bảng */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        {isVirtualEnabled && (
                            <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                ⚡ DOM ảo: {visibleItems.length}/{filteredItems.length} hàng
                            </span>
                        )}
                        <span>
                            Tổng: <span className="font-bold text-slate-800">{filteredItems.length}</span> / {items.length} KOC
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenAddModal(false)}
                            iconLeft={<Users className="h-3.5 w-3.5" />}
                        >
                            Gán Thêm KOC
                        </Button>
                        {totalAvailableCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenAddModal(true)}
                                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 font-semibold"
                                iconLeft={<Database className="h-3.5 w-3.5" />}
                            >
                                Gán Toàn Bộ Kho ({totalAvailableCount})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* THANH TÁC VỤ HÀNG LOẠT NỔI */}
            <KocMatrixBulkActions
                selectedIds={selectedIds}
                onOpenBulkStatusModal={() => setIsBulkStatusModalOpen(true)}
                staffUsers={staffUsers}
                onExecuteBulkAssign={handleExecuteBulkAssign}
                onOpenBulkDeleteConfirm={() => setIsBulkDeleteModalOpen(true)}
                onCopyPhones={handleCopyPhones}
                onClearSelection={() => setSelectedIds([])}
            />

            {/* MODALS NGHIỆP VỤ */}
            <KocMatrixModals
                isBulkStatusModalOpen={isBulkStatusModalOpen}
                onCloseBulkStatusModal={() => setIsBulkStatusModalOpen(false)}
                selectedCount={selectedIds.length}
                bulkSelectedStatus={bulkSelectedStatus}
                onBulkSelectedStatusChange={setBulkSelectedStatus}
                bulkMissingAddressCount={bulkMissingAddressCount}
                bulkNotSentCount={bulkNotSentCount}
                bulkProcessing={bulkProcessing}
                onExecuteBulkStatus={handleExecuteBulkStatus}

                dealModalItem={dealModalItem}
                onCloseDealModal={() => setDealModalItem(null)}
                dealFee={dealFee}
                onDealFeeChange={setDealFee}
                dealNotes={dealNotes}
                onDealNotesChange={setDealNotes}
                onSubmitDeal={handleSubmitDeal}

                confirmApprovalItem={confirmApprovalItem}
                onCloseConfirmApprovalModal={() => setConfirmApprovalItem(null)}
                approverName={approverName}
                onApproverNameChange={setApproverName}
                approvalNotes={approvalNotes}
                onApprovalNotesChange={setApprovalNotes}
                isConfirmingApproval={isConfirmingApproval}
                onConfirmCastApproved={handleConfirmCastApproved}

                shipmentModalItem={shipmentModalItem}
                onCloseShipmentModal={() => setShipmentModalItem(null)}
                shipmentNotes={shipmentNotes}
                onShipmentNotesChange={setShipmentNotes}
                shipmentDate={shipmentDate}
                onShipmentDateChange={setShipmentDate}
                shipmentTrackingCode={shipmentTrackingCode}
                onShipmentTrackingCodeChange={setShipmentTrackingCode}
                shipmentSubmitting={shipmentSubmitting}
                copiedAddress={copiedAddress}
                onCopyWarehouseAddress={handleCopyWarehouseAddress}
                quickAddress={quickAddress}
                onQuickAddressChange={setQuickAddress}
                quickCity={quickCity}
                onQuickCityChange={setQuickCity}
                quickDistrict={quickDistrict}
                onQuickDistrictChange={setQuickDistrict}
                quickWard={quickWard}
                onQuickWardChange={setQuickWard}
                quickPhone={quickPhone}
                onQuickPhoneChange={setQuickPhone}
                isEditingAddress={isEditingAddress}
                onToggleEditingAddress={setIsEditingAddress}
                onCopyPortal={handleCopyPortal}
                copiedToken={copiedToken}
                onSubmitShipment={handleSubmitShipment}
                shipmentProducts={shipmentProducts}
                onToggleShipmentProduct={handleToggleShipmentProduct}
                onChangeShipmentProductQty={handleChangeShipmentProductQty}
                onChangeShipmentProductVariant={handleChangeShipmentProductVariant}
                editingLogId={editingLogId}
                onStartEditShipmentLog={handleStartEditShipmentLog}
                onCancelEditShipmentLog={handleCancelEditShipmentLog}
                onDeleteShipmentLog={handleDeleteShipmentLog}

                videoModalItem={videoModalItem}
                onCloseVideoModal={() => setVideoModalItem(null)}
                videoPlatform={videoPlatform}
                onVideoPlatformChange={setVideoPlatform}
                videoUrl={videoUrl}
                onVideoUrlChange={setVideoUrl}
                videoTitle={videoTitle}
                onVideoTitleChange={setVideoTitle}
                videoPostedAt={videoPostedAt}
                onVideoPostedAtChange={setVideoPostedAt}
                videoSubmitting={videoSubmitting}
                onSubmitVideo={handleSubmitVideo}

                noteModalItem={noteModalItem}
                onCloseNoteModal={() => setNoteModalItem(null)}
                noteModalContent={noteModalContent}
                onNoteModalContentChange={setNoteModalContent}
                onSaveNoteModal={handleSaveNoteModal}
                noteSubmitting={noteSubmitting}

                quickZaloPivotId={quickZaloPivotId}
                onCloseQuickZalo={() => setQuickZaloPivotId(null)}
                onQuickZaloSuccess={showFeedback}

                missingPhoneItem={missingPhoneItem}
                onCloseMissingPhoneModal={() => setMissingPhoneItem(null)}
                quickPhoneInput={quickPhoneInput}
                onQuickPhoneInputChange={setQuickPhoneInput}
                onSavePhoneAndOpenZalo={handleSavePhoneAndOpenZalo}
                isSavingPhone={isSavingPhone}

                formatCurrency={formatCurrency}
                formatDate={formatDate}
            />

            {/* Modal Quản Lý Bằng Chứng Nhắn Tin & Đối Soát KOC */}
            <ChatEvidenceModal
                isOpen={Boolean(evidenceModalItem)}
                onClose={() => setEvidenceModalItem(null)}
                item={activeEvidenceItem}
                campaignId={campaign.id}
                campaignName={campaign.name}
                currentUserId={(usePage().props as any).auth?.user?.id}
                isAdminOrLeader={['admin', 'leader'].includes((usePage().props as any).auth?.user?.role || '')}
            />

            {/* Hộp Thoại Xác Nhận Xóa 1 KOC */}
            <ConfirmDialog
                isOpen={Boolean(singleDeleteTarget)}
                onClose={() => setSingleDeleteTarget(null)}
                onConfirm={handleExecuteSingleRemove}
                title="Xóa KOC khỏi chiến dịch?"
                message={`Bạn có chắc chắn muốn xóa KOC [${singleDeleteTarget?.name}] khỏi chiến dịch này không?`}
                confirmText="Xác nhận xóa"
                cancelText="Hủy"
                variant="danger"
                loading={isSingleDeleting}
            />

            {/* Hộp Thoại Xác Nhận Xóa Hàng Loạt KOC */}
            <ConfirmDialog
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleExecuteBulkRemove}
                title={`Xóa ${selectedIds.length} KOC khỏi chiến dịch?`}
                message={`Bạn có chắc chắn muốn xóa đồng loạt ${selectedIds.length} KOC đã chọn khỏi chiến dịch này không? Thao tác này sẽ hủy phân công của các KOC này.`}
                confirmText="Xác nhận xóa tất cả"
                cancelText="Hủy"
                variant="danger"
                loading={isBulkDeleting}
            />
        </div>
    );
}
