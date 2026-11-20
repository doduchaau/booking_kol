import React from 'react';
import { Head } from '@inertiajs/react';
import { AlertTriangle, Phone, MessageSquare } from 'lucide-react';

interface Props {
    errorMessage?: string;
    supportContact?: string;
}

export default function Expired({ errorMessage, supportContact }: Props) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Head title="Đường link không hợp lệ hoặc đã hết hạn" />

            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-7 w-7" />
                </div>

                <h1 className="text-lg font-bold text-slate-900">
                    Đường Link Đã Hết Hạn
                </h1>

                <p className="text-sm text-slate-600 leading-relaxed">
                    {errorMessage ||
                        'Đường dẫn truy cập này không tồn tại hoặc đã hết hạn sử dụng vì lý do bảo mật.'}
                </p>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-2 text-left">
                    <p className="font-semibold text-slate-800">Bạn cần hỗ trợ?</p>
                    <p>
                        Vui lòng nhắn tin lại cho nhân viên booking phụ trách chiến dịch hoặc liên hệ để được cấp lại đường dẫn mới.
                    </p>
                    {supportContact && (
                        <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-primary-700 font-semibold">
                            <Phone className="h-3.5 w-3.5 text-primary-600" />
                            <span>Hotline / Zalo: {supportContact}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
