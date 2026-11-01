<?php

namespace Modules\Portal\Http\Controllers;

use App\Http\Controllers\Controller;
use Exception;
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
            $campaignCreator->load(['campaign']);

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
                    'dos_and_donts' => $campaignCreator->campaign->dos_and_donts,
                    'discount_code' => $campaignCreator->campaign->discount_code,
                    'affiliate_link' => $campaignCreator->campaign->affiliate_link,
                    'content_guidelines_file_url' => $campaignCreator->campaign->content_guidelines_file_url,
                    'content_guidelines_file_name' => $campaignCreator->campaign->content_guidelines_file_name,
                    'sample_requirement_file_url' => $campaignCreator->campaign->sample_requirement_file_url,
                    'sample_requirement_file_name' => $campaignCreator->campaign->sample_requirement_file_name,
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
                ],
                'pipeline' => [
                    'status' => $campaignCreator->status->value,
                    'status_label' => $campaignCreator->status->label(),
                    'sample_sent_at' => $campaignCreator->sample_sent_at?->format('d/m/Y'),
                    'sample_received_at' => $campaignCreator->sample_received_at?->format('d/m/Y'),
                    'posted_at' => $campaignCreator->posted_at?->format('d/m/Y H:i'),
                ],
            ]);
        } catch (Exception $e) {
            return Inertia::render('Portal/Expired', [
                'errorMessage' => $e->getMessage(),
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
            'phone' => ['nullable', 'string', 'max:20'],
            'shipping_address' => ['required', 'string', 'max:255'],
            'city_province' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'max:100'],
        ], [
            'shipping_address.required' => 'Vui lòng điền địa chỉ giao nhận hàng cụ thể (số nhà, tên đường).',
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
