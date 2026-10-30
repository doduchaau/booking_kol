<?php

namespace Modules\Campaign\Services;

use Exception;
use Modules\Campaign\Enums\PipelineStatusEnum;
use Modules\Campaign\Models\CampaignCreator;

class PipelineService
{
    /**
     * Cập nhật trạng thái Pipeline của Creator trong chiến dịch kèm kiểm tra ràng buộc nghiệp vụ
     *
     * @throws Exception
     */
    public function updateCreatorStatus(
        CampaignCreator $campaignCreator,
        PipelineStatusEnum $newStatus,
        ?string $notes = null
    ): CampaignCreator {
        $campaignCreator->loadMissing(['creator']);
        $creator = $campaignCreator->creator;

        // RÀNG BUỘC 1: Không thể chuyển sang "sample_sent" (Đã gửi mẫu) nếu chưa có địa chỉ nhận hàng
        if ($newStatus === PipelineStatusEnum::SAMPLE_SENT) {
            if (empty($creator->shipping_address)) {
                throw new Exception("Không thể chuyển sang bước [Đã gửi mẫu] vì Creator {$creator->name} chưa có địa chỉ nhận hàng trong hồ sơ.");
            }
        }

        // RÀNG BUỘC 2: Khi bị đánh dấu "no_show" (Bom hàng / Mất tích)
        // Tự động trừ 30 điểm uy tín. Nếu điểm < 40, tự động đưa vào Blacklist
        if ($newStatus === PipelineStatusEnum::NO_SHOW && $campaignCreator->status !== PipelineStatusEnum::NO_SHOW) {
            $newScore = max(0, $creator->trust_score - 30);
            $updateData = ['trust_score' => $newScore];

            if ($newScore < 40) {
                $updateData['blacklist_status'] = true;
                $updateData['blacklist_reason'] = "Tự động đưa vào Blacklist do bom hàng trong chiến dịch ID #{$campaignCreator->campaign_id}";
            }

            $creator->update($updateData);
        }

        // Cập nhật timestamp tương ứng với trạng thái
        $timestampCol = $newStatus->timestampColumn();
        $updates = [
            'status' => $newStatus,
        ];

        if ($timestampCol && is_null($campaignCreator->{$timestampCol})) {
            $updates[$timestampCol] = now();
        }

        if ($notes) {
            $updates['notes'] = $notes;
        }

        $campaignCreator->update($updates);

        return $campaignCreator;
    }

    /**
     * Gán nhân viên phụ trách Creator trong chiến dịch
     */
    public function assignStaff(CampaignCreator $campaignCreator, ?int $userId): CampaignCreator
    {
        $campaignCreator->update(['assigned_to' => $userId]);
        return $campaignCreator;
    }

    /**
     * Cập nhật trạng thái hàng loạt cho nhiều Creator trong chiến dịch
     *
     * @param int[] $ids Danh sách ID campaign_creators
     * @param PipelineStatusEnum $newStatus Trạng thái mới
     * @param string|null $notes Ghi chú bổ sung
     * @return array{updated: int, errors: string[]}
     */
    public function bulkUpdateStatus(array $ids, PipelineStatusEnum $newStatus, ?string $notes = null): array
    {
        $updated = 0;
        $errors = [];

        $items = CampaignCreator::query()
            ->whereIn('id', $ids)
            ->with(['creator'])
            ->get();

        foreach ($items as $item) {
            try {
                $this->updateCreatorStatus(
                    campaignCreator: $item,
                    newStatus: $newStatus,
                    notes: $notes
                );
                $updated++;
            } catch (Exception $e) {
                $errors[] = "{$item->creator->name}: {$e->getMessage()}";
            }
        }

        return [
            'updated' => $updated,
            'errors' => $errors,
        ];
    }

    /**
     * Phân bổ nhân sự phụ trách hàng loạt cho nhiều Creator
     *
     * @param int[] $ids
     * @param int|null $userId
     * @return int Số bản ghi đã cập nhật
     */
    public function bulkAssignStaff(array $ids, ?int $userId): int
    {
        return CampaignCreator::query()
            ->whereIn('id', $ids)
            ->update(['assigned_to' => $userId]);
    }

    /**
     * Cập nhật nhanh thông tin dòng (Inline Edit)
     */
    public function quickUpdate(CampaignCreator $campaignCreator, array $data): CampaignCreator
    {
        $fillableData = [];

        if (array_key_exists('booking_fee', $data)) {
            $fillableData['booking_fee'] = (float) $data['booking_fee'];
        }

        if (array_key_exists('notes', $data)) {
            $fillableData['notes'] = $data['notes'];
        }

        if (array_key_exists('assigned_to', $data)) {
            $fillableData['assigned_to'] = $data['assigned_to'] ? (int) $data['assigned_to'] : null;
        }

        if (!empty($fillableData)) {
            $campaignCreator->update($fillableData);
        }

        // Nếu có cập nhật trạng thái
        if (!empty($data['status'])) {
            $newStatus = $data['status'] instanceof PipelineStatusEnum
                ? $data['status']
                : PipelineStatusEnum::from((string) $data['status']);

            $this->updateCreatorStatus($campaignCreator, $newStatus, $data['notes'] ?? null);
        }

        return $campaignCreator->fresh(['creator', 'assignee']);
    }

    /**
     * Tính toán deadline nộp video: theo cấu hình của chiến dịch (mặc định 7 ngày kể từ khi nhận mẫu)
     */
    public function calculateDeadline(CampaignCreator $item): ?array
    {
        if (!$item->sample_received_at || in_array($item->status, [PipelineStatusEnum::POSTED, PipelineStatusEnum::COMPLETED])) {
            return null;
        }

        $item->loadMissing(['campaign']);
        $deadlineDays = (int) ($item->campaign?->video_deadline_days ?: 7);

        $receivedDate = $item->sample_received_at->copy()->startOfDay();
        $deadline = $receivedDate->copy()->addDays($deadlineDays);
        $today = now()->startOfDay();

        $diffDays = (int) $today->diffInDays($deadline, false);

        if ($diffDays < 0) {
            return [
                'status' => 'overdue',
                'days' => abs($diffDays),
                'text' => 'Quá hạn ' . abs($diffDays) . ' ngày',
                'date' => $deadline->format('d/m/Y'),
            ];
        } elseif ($diffDays <= 2) {
            return [
                'status' => 'warning',
                'days' => $diffDays,
                'text' => 'Còn ' . $diffDays . ' ngày',
                'date' => $deadline->format('d/m/Y'),
            ];
        }

        return [
            'status' => 'safe',
            'days' => $diffDays,
            'text' => 'Hạn: ' . $deadline->format('d/m/Y'),
            'date' => $deadline->format('d/m/Y'),
        ];
    }
}
