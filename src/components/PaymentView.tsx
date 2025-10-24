import React from 'react';

interface PaymentViewProps {
  amount: number;
  content: string;
  qrCodeUrl: string;
  bankInfo: {
    accountNo: string;
    accountName: string;
    bankName: string;
  };
  onBack: () => void;
  onCancel: () => void;
}

const PaymentView: React.FC<PaymentViewProps> = ({ amount, content, qrCodeUrl, bankInfo, onBack, onCancel }) => {
    
    const handleDownloadQR = async () => {
        try {
            const response = await fetch(qrCodeUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `payment-qr-${content}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Lỗi khi tải mã QR:', error);
            alert('Không thể tải mã QR. Vui lòng thử lại.');
        }
    };

    const InfoRow: React.FC<{ label: string; value: string; valueClass?: string }> = ({ label, value, valueClass = '' }) => (
        <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-400">{label}</span>
            <span className={`text-sm font-semibold text-white ${valueClass}`}>{value}</span>
        </div>
    );

    return (
        <div className="bg-slate-800 text-white p-2 rounded-lg max-w-lg w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side: QR Code */}
                <div className="flex flex-col items-center justify-center space-y-4">
                    <h3 className="font-semibold text-center">Quét mã QR</h3>
                    <div className="p-2 bg-white rounded-lg">
                        <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                    </div>
                    <button 
                        onClick={handleDownloadQR}
                        className="w-full py-2 px-4 text-sm font-semibold text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-slate-800 transition-colors"
                    >
                        Tải ảnh QR
                    </button>
                </div>

                {/* Right side: Manual Transfer Info */}
                <div className="flex flex-col">
                    <h3 className="font-semibold mb-2">Chuyển khoản thủ công</h3>
                    <div className="space-y-1">
                        <InfoRow label="Số tiền:" value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)} />
                        <InfoRow label="Ngân hàng:" value={bankInfo.bankName} />
                        <InfoRow label="Chủ tài khoản:" value={bankInfo.accountName} />
                        <InfoRow label="Số tài khoản:" value={bankInfo.accountNo} />
                        <InfoRow label="Nội dung:" value={content} valueClass="text-red-500 font-bold" />
                    </div>
                    <div className="mt-3 bg-yellow-900/50 border border-yellow-600/50 text-yellow-300 text-xs rounded-md p-2 flex items-start">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.636-1.026 2.85-1.026 3.486 0l5.58 8.998c.636 1.026-.477 2.403-1.743 2.403H4.42c-1.266 0-2.379-1.377-1.743-2.403l5.58-8.998zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                        <span>Vui lòng giữ nguyên <span className="font-bold">nội dung chuyển khoản</span> để hệ thống tự động xác nhận.</span>
                    </div>
                     <div className="flex justify-between items-center mt-3 pt-2">
                        <span className="text-sm text-gray-400">Trạng thái:</span>
                        <span className="flex items-center text-sm font-semibold text-cyan-400">
                           Chờ thanh toán
                           <span className="ml-2 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                <button 
                    onClick={onBack}
                    className="py-2 px-5 text-sm font-medium text-gray-300 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
                >
                    Quay lại
                </button>
                <button
                    onClick={onCancel}
                    className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
                >
                    Hủy
                </button>
            </div>
        </div>
    );
};

export default PaymentView;