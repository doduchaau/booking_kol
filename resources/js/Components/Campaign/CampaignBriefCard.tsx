import React, { useState } from 'react';
import {
    FileText,
    Copy,
    Check,
    Hash,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Tag,
    ExternalLink,
    Download,
    Share2,
} from 'lucide-react';
import Button from '@/Components/Common/Button';

export interface CampaignBriefData {
    id: number;
    name: string;
    product_name: string;
    product_sku?: string | null;
    content_guidelines?: string | null;
    content_guidelines_file_url?: string | null;
    sample_requirement?: string | null;
    sample_requirement_file_url?: string | null;
    key_messages?: string | null;
    hashtags?: string | null;
    dos_and_donts?: string | null;
    discount_code?: string | null;
    affiliate_link?: string | null;
}

interface Props {
    campaign: CampaignBriefData;
    onCopyBriefSuccess?: () => void;
}

export default function CampaignBriefCard({ campaign, onCopyBriefSuccess }: Props) {
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedHashtags, setCopiedHashtags] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    // Sinh bản text rút gọn để gửi qua Zalo / Chat
    const generateZaloBriefText = () => {
        let text = `📋 BRIEF HỢP TÁC CHIẾN DỊCH: ${campaign.name.toUpperCase()}\n`;
        text += `🎯 Sản phẩm: ${campaign.product_name}${campaign.product_sku ? ` (SKU: ${campaign.product_sku})` : ''}\n\n`;

        if (campaign.key_messages) {
            text += `✨ THÔNG ĐIỆP CHÍNH / ĐIỂM NỔI BẬT (USP):\n${campaign.key_messages}\n\n`;
        }

        if (campaign.hashtags) {
            text += `🏷️ HASHTAG BẮT BUỘC:\n${campaign.hashtags}\n\n`;
        }

        if (campaign.discount_code) {
            text += `🎁 MÃ GIẢM GIÁ ĐỘC QUYỀN CHO FOLLOWER: ${campaign.discount_code}\n\n`;
        }

        if (campaign.affiliate_link) {
            text += `🛒 LINK SẢN PHẨM / GIỎ HÀNG GẮN KÈM:\n${campaign.affiliate_link}\n\n`;
        }

        if (campaign.dos_and_donts) {
            text += `📌 LƯU Ý KHI QUAY VIDEO (DO'S & DON'TS):\n${campaign.dos_and_donts}\n\n`;
        }

        if (campaign.content_guidelines) {
            text += `📝 YÊU CẦU NỘI DUNG CHI TIẾT:\n${campaign.content_guidelines}\n\n`;
        }

        text += `👉 Anh/Chị lưu ý kiểm tra kịch bản & nộp link bài đăng theo đúng thỏa thuận nhé ạ. Cảm ơn Anh/Chị!`;
        return text;
    };

    const handleCopyAllBrief = async () => {
        const text = generateZaloBriefText();
        await navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2500);
        if (onCopyBriefSuccess) {
            onCopyBriefSuccess();
        }
    };

    const handleCopyHashtags = async () => {
        if (!campaign.hashtags) return;
        await navigator.clipboard.writeText(campaign.hashtags);
        setCopiedHashtags(true);
        setTimeout(() => setCopiedHashtags(false), 2500);
    };

    const handleCopyDiscountCode = async () => {
        if (!campaign.discount_code) return;
        await navigator.clipboard.writeText(campaign.discount_code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 shadow-xs">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">
                            Brief Chiến Dịch & Yêu Cầu Kịch Bản
                        </h3>
                        <p className="text-xs text-slate-500">
                            Bộ hướng dẫn nội dung, thông điệp cốt lõi và quy định dành cho Creator
                        </p>
                    </div>
                </div>

                <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyAllBrief}
                    iconLeft={copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                >
                    {copiedAll ? 'Đã chép Brief' : 'Sao chép Brief gửi Zalo'}
                </Button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cột trái: Thông điệp cốt lõi & Quy định Do's & Don'ts */}
                <div className="space-y-4">
                    {/* Key messages */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span>Thông Điệp Cốt Lõi / Điểm Nhấn (USP)</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {campaign.key_messages || 'Chưa thiết lập thông điệp cốt lõi cho chiến dịch này.'}
                        </p>
                    </div>

                    {/* Do's & Don'ts */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            <span>Lưu Ý Khi Quay Video (Do's & Don'ts)</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {campaign.dos_and_donts || 'Chưa thiết lập lưu ý Do\'s & Don\'ts.'}
                        </p>
                    </div>
                </div>

                {/* Cột phải: Hashtags, Mã giảm giá, Link giỏ hàng, File đính kèm */}
                <div className="space-y-4">
                    {/* Hashtags */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                <Hash className="h-4 w-4 text-primary-600" />
                                <span>Hashtags Bắt Buộc</span>
                            </div>
                            {campaign.hashtags && (
                                <button
                                    type="button"
                                    onClick={handleCopyHashtags}
                                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                >
                                    {copiedHashtags ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                    <span>{copiedHashtags ? 'Đã chép' : 'Sao chép'}</span>
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {campaign.hashtags ? (
                                campaign.hashtags.split(/[\s,]+/).filter(Boolean).map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono font-medium text-primary-700 shadow-2xs"
                                    >
                                        {tag.startsWith('#') ? tag : `#${tag}`}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 italic">Chưa có hashtag bắt buộc</span>
                            )}
                        </div>
                    </div>

                    {/* Mã giảm giá & Affiliate Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Discount Code */}
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Mã Giảm Giá KOC:</span>
                            {campaign.discount_code ? (
                                <div className="flex items-center justify-between">
                                    <code className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">
                                        {campaign.discount_code}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={handleCopyDiscountCode}
                                        className="p-1 text-slate-400 hover:text-primary-600"
                                        title="Sao chép mã"
                                    >
                                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 italic">Không có mã</span>
                            )}
                        </div>

                        {/* Link Giỏ hàng */}
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Link Giỏ Hàng:</span>
                            {campaign.affiliate_link ? (
                                <a
                                    href={campaign.affiliate_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 truncate"
                                >
                                    <span className="truncate">Xem link giỏ hàng</span>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                </a>
                            ) : (
                                <span className="text-xs text-slate-400 italic">Chưa gắn link</span>
                            )}
                        </div>
                    </div>

                    {/* File hướng dẫn đính kèm */}
                    {(campaign.content_guidelines_file_url || campaign.sample_requirement_file_url) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            {campaign.content_guidelines_file_url && (
                                <a
                                    href={campaign.content_guidelines_file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
                                >
                                    <Download className="h-3.5 w-3.5 text-primary-600" />
                                    Tải file Guideline kịch bản
                                </a>
                            )}
                            {campaign.sample_requirement_file_url && (
                                <a
                                    href={campaign.sample_requirement_file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
                                >
                                    <Download className="h-3.5 w-3.5 text-blue-600" />
                                    Tải file Quy định mẫu
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

