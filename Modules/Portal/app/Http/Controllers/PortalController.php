<?php

namespace Modules\Portal\Http\Controllers;

use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Portal\Services\PortalService;

class PortalController extends Controller
{
    /**
     * Màn hình chính Cổng Portal dành cho Creator (Mobile-first)
     */
    public function show(string $token, PortalService $portalService): Response
    {
        try {
            $campaignCreator = $portalService->getValidCampaignCreator($token);

            // Nạp thông tin bài đăng nếu đã nộp
            $campaignCreator->load(['campaign.products', 'creatorProducts.campaignProduct']);

            return Inertia::render('Portal/Index', [
                'token' => $token,
                'campaign' => [
                    'id' => $campaignCreator->campaign->id,
                    'name' => $campaignCreator->campaign->name,
                    'product_name' => $campaignCreator->campaign->product_name,
                    'product_sku' => $campaignCreator->campaign->product_sku,
                    'sample_requirement' => $campaignCreator->campaign->sample_requirement,
                    'content_guidelines' => $campaignCreator->campaign->content_guidelines,
                    'key_messages' => $campaignCreator->campaign->key_messages,
                    'hashtags' => $campaignCreator->campaign->hashtags,
                    'brand_tag' => $campaignCreator->campaign->brand_tag,
                    'target_platforms' => $campaignCreator->campaign->target_platforms ?? [],
                    'dos_and_donts' => $campaignCreator->campaign->dos_and_donts,
                    'discount_code' => $campaignCreator->campaign->discount_code,
                    'affiliate_link' => $campaignCreator->campaign->affiliate_link,
                    'commission_rate' => $campaignCreator->commission_rate !== null ? (float) $campaignCreator->commission_rate : (float) ($campaignCreator->campaign->commission_rate ?? 0),
                    'ads_commission_rate' => $campaignCreator->ads_commission_rate !== null ? (float) $campaignCreator->ads_commission_rate : (float) ($campaignCreator->campaign->ads_commission_rate ?? 0),
                    'content_guidelines_file_url' => $campaignCreator->campaign->content_guidelines_file_url,
                    'content_guidelines_file_name' => $campaignCreator->campaign->content_guidelines_file_name,
                    'sample_requirement_file_url' => $campaignCreator->campaign->sample_requirement_file_url,
                    'sample_requirement_file_name' => $campaignCreator->campaign->sample_requirement_file_name,
                    'products' => $campaignCreator->campaign->products->map(fn($p) => [
                        'id' => $p->id,
                        'product_name' => $p->product_name,
                        'product_sku' => $p->product_sku,
                        'thumbnail_url' => $p->thumbnail_url,
                        'image_urls' => $p->image_urls,
                        'product_url' => $p->product_url,
                        'retail_price' => (float) ($p->retail_price ?? 0),
                        'brief_content' => $p->brief_content,
                        'brief_file_url' => $p->brief_file_url,
                        'brief_file_name' => $p->brief_file_name,
                        'brief_file_items' => $p->brief_file_items,
                        'hashtags' => $p->hashtags,
                        'sample_requirement' => $p->sample_requirement,
                    ])->values()->all(),
                    'files' => array_values(array_filter([
                        $campaignCreator->campaign->content_guidelines_file_url ? [
                            'type' => 'guideline',
                            'title' => 'Tài liệu Kịch bản & Hướng dẫn Nội dung',
                            'file_name' => $campaignCreator->campaign->content_guidelines_file_name ?: 'Tai_lieu_kich_ban',
                            'url' => $campaignCreator->campaign->content_guidelines_file_url,
                        ] : null,
                        $campaignCreator->campaign->sample_requirement_file_url ? [
                            'type' => 'sample',
                            'title' => 'Tài liệu Quy định & Danh mục Sản phẩm Mẫu',
                            'file_name' => $campaignCreator->campaign->sample_requirement_file_name ?: 'Quy_dinh_mau_san_pham',
                            'url' => $campaignCreator->campaign->sample_requirement_file_url,
                        ] : null,
                    ])),
                ],
                'creator' => [
                    'id' => $campaignCreator->creator->id,
                    'name' => $campaignCreator->creator->name,
                    'phone' => $campaignCreator->creator->phone,
                    'shipping_address' => $campaignCreator->creator->shipping_address,
                    'city_province' => $campaignCreator->creator->city_province,
                    'district' => $campaignCreator->creator->district,
                    'ward' => $campaignCreator->creator->ward,
                ],
                'pipeline' => [
                    'status' => $campaignCreator->status->value,
                    'status_label' => $campaignCreator->status->label(),
                    'collaboration_type' => $campaignCreator->collaboration_type?->value ?? 'video',
                    'collaboration_type_label' => $campaignCreator->collaboration_type?->label() ?? 'Lên Video',
                    'booking_platforms' => $campaignCreator->booking_platforms,
                    'platform_deliverables' => $campaignCreator->platform_deliverables,
                    'total_samples_assigned' => (int) $campaignCreator->total_samples_assigned,
                    'total_samples_sent' => (int) $campaignCreator->total_samples_sent,
                    'sample_sent_at' => $campaignCreator->sample_sent_at?->format('d/m/Y'),
                    'sample_received_at' => $campaignCreator->sample_received_at?->format('d/m/Y'),
                    'posted_at' => $campaignCreator->posted_at?->format('d/m/Y H:i'),
                    'creator_products' => $campaignCreator->creatorProducts->map(fn($cp) => [
                        'id' => $cp->id,
                        'campaign_product_id' => $cp->campaign_product_id,
                        'product_name' => $cp->campaignProduct?->product_name ?? 'Sản phẩm mẫu',
                        'product_sku' => $cp->campaignProduct?->product_sku,
                        'thumbnail_url' => $cp->campaignProduct?->thumbnail_url,
                        'image_urls' => $cp->campaignProduct?->image_urls ?? [],
                        'product_url' => $cp->campaignProduct?->product_url,
                        'retail_price' => (float) ($cp->campaignProduct?->retail_price ?? 0),
                        'brief_content' => $cp->campaignProduct?->brief_content,
                        'brief_file_url' => $cp->campaignProduct?->brief_file_url,
                        'brief_file_name' => $cp->campaignProduct?->brief_file_name,
                        'brief_file_items' => $cp->campaignProduct?->brief_file_items ?? [],
                        'hashtags' => $cp->campaignProduct?->hashtags,
                        'sample_requirement' => $cp->campaignProduct?->sample_requirement,
                        'sample_variant' => $cp->sample_variant,
                        'quantity_assigned' => (int) $cp->quantity_assigned,
                        'quantity_sent' => (int) $cp->quantity_sent,
                        'sample_status' => $cp->sample_status?->value ?? 'assigned',
                        'sample_status_label' => $cp->sample_status?->label() ?? 'Dự kiến',
                    ])->values()->all(),
                ],
                'portal_settings' => [
                    'support_contact' => class_exists(\Modules\Settings\Models\Setting::class)
                        ? \Modules\Settings\Models\Setting::get('portal_support_contact', '')
                        : '',
                    'allow_edit_address' => class_exists(\Modules\Settings\Models\Setting::class)
                        ? (bool) \Modules\Settings\Models\Setting::get('portal_allow_edit_address_after_confirm', true)
                        : true,
                    'allow_multiple_videos' => class_exists(\Modules\Settings\Models\Setting::class)
                        ? (bool) \Modules\Settings\Models\Setting::get('portal_allow_multiple_videos', true)
                        : true,
                ],
            ]);
        } catch (Exception $e) {
            $supportContact = class_exists(\Modules\Settings\Models\Setting::class)
                ? \Modules\Settings\Models\Setting::get('portal_support_contact', '')
                : '';

            return Inertia::render('Portal/Expired', [
                'errorMessage' => $e->getMessage(),
                'supportContact' => $supportContact,
            ]);
        }
    }

    /**
     * Bước 1: Xác nhận / Điền địa chỉ nhận mẫu
     */
    public function updateAddress(Request $request, string $token, PortalService $portalService): RedirectResponse
    {
        $campaignCreator = $portalService->getValidCampaignCreator($token);

        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'shipping_address' => ['required', 'string', 'max:255'],
            'city_province' => ['required', 'string', 'max:100'],
            'ward' => ['required', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
        ], [
            'phone.required' => 'Vui lòng cung cấp số điện thoại nhận hàng.',
            'shipping_address.required' => 'Vui lòng điền địa chỉ giao nhận hàng cụ thể (số nhà, tên đường).',
            'city_province.required' => 'Vui lòng điền Tỉnh / Thành phố nhận hàng.',
            'ward.required' => 'Vui lòng điền Phường / Xã nhận hàng.',
        ]);

        $portalService->updateShippingAddress($campaignCreator, $validated);

        return back()->with('success', 'Đã lưu thông tin nhận hàng thành công! Đội ngũ vận hành sẽ gửi mẫu sản phẩm tới bạn trong thời gian sớm nhất.');
    }

    /**
     * Bước 2: Bấm 1-chạm xác nhận đã nhận hàng
     */
    public function confirmReceived(string $token, PortalService $portalService): RedirectResponse
    {
        $campaignCreator = $portalService->getValidCampaignCreator($token);
        $portalService->confirmReceipt($campaignCreator);

        return back()->with('success', 'Cảm ơn bạn! Hệ thống đã ghi nhận bạn đã nhận được gói hàng trải nghiệm. Vui lòng chuẩn bị kịch bản và đăng video trong 7 ngày tới.');
    }

    /**
     * Pre-check kiểm tra video trước khi nộp
     */
    public function precheckVideo(Request $request, string $token, PortalService $portalService): JsonResponse
    {
        $campaignCreator = $portalService->getValidCampaignCreator($token);

        $validated = $request->validate([
            'post_url' => ['required', 'url', 'max:500'],
            'platform' => ['required', 'in:tiktok,facebook,youtube,shopee,instagram'],
        ]);

        $result = $portalService->precheckVideo($campaignCreator, $validated);

        return response()->json($result);
    }

    /**
     * Bước 3: Nộp link video bài đăng
     */
    public function submitVideo(Request $request, string $token, PortalService $portalService): RedirectResponse
    {
        $campaignCreator = $portalService->getValidCampaignCreator($token);

        $validated = $request->validate([
            'post_url' => ['required', 'url', 'max:500'],
            'platform' => ['required', 'in:tiktok,facebook,youtube,shopee,instagram'],
            'video_title' => ['nullable', 'string', 'max:255'],
        ], [
            'post_url.required' => 'Vui lòng dán đường link video bài đăng.',
            'post_url.url' => 'Đường link video không đúng định dạng URL hợp lệ.',
        ]);

        $portalService->submitVideo($campaignCreator, $validated);

        return back()->with('success', 'Nộp link video thành công! Đội ngũ booking sẽ kiểm duyệt và đối soát nghiệm thu sớm nhất.');
    }
}
