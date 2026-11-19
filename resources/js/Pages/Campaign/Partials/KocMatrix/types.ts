import { BadgeVariant } from '@/Components/Common/Badge';

export interface CreatorAccount {
    id: number;
    platform: string;
    handle: string;
    followers_count: number;
    url?: string | null;
}

export interface Creator {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    shipping_address: string | null;
    city_province: string | null;
    district: string | null;
    ward: string | null;
    niche: string;
    tier: string;
    trust_score?: number;
    blacklist_status?: boolean;
    accounts: CreatorAccount[];
}

export interface DeadlineInfo {
    status: 'safe' | 'warning' | 'overdue';
    days: number;
    text: string;
    date: string;
}

export interface ContentPostItem {
    id: number;
    platform: string;
    post_url: string;
    video_title?: string | null;
    posted_at?: string | null;
    status: string;
    views_count?: number;
    likes_count?: number;
    comments_count?: number;
    compliance_status?: string | null;
    compliance_score?: number | null;
    compliance_checklist?: any[] | null;
    benchmark?: {
        average_channel_views: number;
        current_views: number;
        ratio: number;
        status: string;
        label: string;
    };
}

export interface CampaignProduct {
    id: number;
    campaign_id?: number;
    name?: string;
    product_name?: string;
    sku?: string | null;
    product_sku?: string | null;
    product_url?: string | null;
    thumbnail_url?: string | null;
    retail_price?: number | string;
    brief_content?: string | null;
    brief_file_url?: string | null;
    brief_file_name?: string | null;
    hashtags?: string | null;
    sample_requirement?: string | null;
}

export interface CampaignCreatorProductItem {
    id: number;
    campaign_creator_id: number;
    campaign_product_id: number;
    quantity_assigned: number;
    quantity_sent: number;
    sample_variant?: string | null;
    sample_status: 'assigned' | 'sent' | 'received';
    sent_at?: string | null;
    received_at?: string | null;
    campaign_product?: CampaignProduct;
    campaignProduct?: CampaignProduct;
}

export interface CampaignCreatorPivot {
    id: number;
    campaign_id: number;
    creator_id: number;
    assigned_to: number | null;
    status: string;
    collaboration_type?: 'video' | 'livestream' | 'both';
    booking_platforms?: string[];
    platform_deliverables?: {
        total_platforms: number;
        completed_platforms: number;
        is_all_completed: boolean;
        items: Array<{
            platform: string;
            has_post: boolean;
            is_completed: boolean;
            posts_count: number;
            latest_post?: any;
        }>;
    };
    total_samples_assigned?: number;
    total_samples_sent?: number;
    booking_fee: string | number;
    commission_rate?: string | number;
    portal_token: string | null;
    portal_token_expires_at?: string | null;
    notes: string | null;
    waiting_approval_at?: string | null;
    approved_cost_at?: string | null;
    approver_name?: string | null;
    approval_notes?: string | null;
    sample_received_at?: string | null;
    sample_sent_at?: string | null;
    posted_at?: string | null;
    creator: Creator;
    assignee?: { id: number; name: string; email: string } | null;
    deadline_info?: DeadlineInfo | null;
    content_posts?: ContentPostItem[];
    contentPosts?: ContentPostItem[];
    creator_products?: CampaignCreatorProductItem[];
    creatorProducts?: CampaignCreatorProductItem[];
}

export interface Campaign {
    id: number;
    name: string;
    product_name: string;
    target_platforms?: string[];
    budget: string | number;
    target_creators_count: number;
    video_deadline_days?: number;
    status: string;
    products?: CampaignProduct[];
}

export type StageType = 'all' | 'waiting_approval' | 'outreach' | 'shipping' | 'production' | 'completion';
export type RiskFilterType = 'all' | 'overdue' | 'warning' | 'missing_address' | 'no_phone';

export const STATUS_DEFINITIONS: Record<
    string,
    { label: string; stage: 'outreach' | 'shipping' | 'production' | 'completion'; badge: BadgeVariant }
> = {
    new: { label: 'Mới thêm', stage: 'outreach', badge: 'default' },
    contacted: { label: 'Đã liên hệ', stage: 'outreach', badge: 'primary' },
    waiting_approval: { label: 'Chờ duyệt chi phí', stage: 'outreach', badge: 'warning' },
    agreed: { label: 'Đã chốt hợp tác', stage: 'outreach', badge: 'primary' },
    address_confirmed: { label: 'Đã chốt địa chỉ', stage: 'shipping', badge: 'primary' },
    sample_sent: { label: 'Đã gửi mẫu', stage: 'shipping', badge: 'warning' },
    sample_received: { label: 'Đã nhận mẫu (Đang làm video)', stage: 'shipping', badge: 'warning' },
    posted: { label: 'Đã lên video', stage: 'production', badge: 'success' },
    completed: { label: 'Nghiệm thu hoàn tất', stage: 'completion', badge: 'success' },
    declined: { label: 'Từ chối', stage: 'completion', badge: 'danger' },
    no_show: { label: 'Bom hàng / Mất tích', stage: 'completion', badge: 'danger' },
};

