import React, { useState, useEffect, useMemo } from 'react';
import { databases, appwriteDatabaseId, listToolCollectionId, couponsCollectionId } from '../lib/appwrite';
import { AppwriteException, Query } from 'appwrite';
import type { Models } from 'appwrite';
import type { UserTool, ToolDetails } from './MyTools';
import PaymentView from './PaymentView';

type PackageOption = {
    title?: string;
    days: number;
    price: number;
};

type Coupon = Models.Document & {
    code: string;
    percent: number;
    status: boolean;
};

// Use a more flexible type for the initial fetch to handle pre-parsed JSON from Appwrite
// This definition is more explicit to avoid TypeScript compilation errors.
type FetchedToolDetails = Models.Document & {
    url: string;
    cookie: string;
    package?: string | (string | PackageOption)[];
    max_device?: number;
};

type ToolDetailsWithPackages = ToolDetails & {
    parsedPackages: PackageOption[];
};

interface RenewalModalProps {
    tool: UserTool;
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const BANK_INFO = {
  accountNo: '0849331080',
  accountName: 'NGUYEN GIA TRUNG',
  bankName: 'VPBank',
  bankShortName: 'VPB',
  template: 'compact2'
};

const RenewalModal: React.FC<RenewalModalProps> = ({ tool, onClose, showToast }) => {
    const [toolDetails, setToolDetails] = useState<ToolDetailsWithPackages | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
    const [deviceCount, setDeviceCount] = useState(1);
    const [discountCode, setDiscountCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
    
    const [view, setView] = useState<'selection' | 'payment'>('selection');
    const [paymentDetails, setPaymentDetails] = useState<{
        amount: number;
        content: string;
        qrCodeUrl: string;
    } | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);


    useEffect(() => {
        const fetchToolDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const details = await databases.getDocument<FetchedToolDetails>(
                    appwriteDatabaseId,
                    listToolCollectionId,
                    tool.toolId
                );

                let packages: PackageOption[] = [];
                const packageData = details.package;
                let parsingError: string | null = null;

                if (packageData) {
                    let rawPackages: any[] = [];
                    // Handle case where packageData is a single JSON string representing an array
                    if (typeof packageData === 'string') {
                        const trimmedData = packageData.trim();
                        if (trimmedData.length > 0 && trimmedData !== '[]') {
                            try {
                                const parsed = JSON.parse(trimmedData);
                                if (Array.isArray(parsed)) {
                                    rawPackages = parsed;
                                } else {
                                    parsingError = "Dữ liệu gói gia hạn phải là một mảng (array).";
                                    console.error("Parsed package data is not an array:", parsed);
                                }
                            } catch (e) {
                                parsingError = "Dữ liệu gói gia hạn bị lỗi định dạng (JSON không hợp lệ).";
                                console.error("Failed to parse package JSON:", e);
                            }
                        }
                    } else if (Array.isArray(packageData)) {
                        // Handle case where packageData is already an array (of objects or strings)
                        rawPackages = packageData;
                    }

                    // Normalize rawPackages (which could be string[] or object[]) into object[]
                    if (!parsingError && rawPackages.length > 0) {
                        try {
                            packages = rawPackages.map(p => {
                                if (typeof p === 'string') {
                                    return JSON.parse(p);
                                }
                                if (typeof p === 'object' && p !== null) {
                                    return p;
                                }
                                throw new Error('Invalid package item format');
                            });
                        } catch (e) {
                            parsingError = "Một hoặc nhiều gói trong danh sách gia hạn có định dạng không hợp lệ.";
                            console.error("Failed to parse an item in the package array:", e, rawPackages);
                        }
                    }
                }

                if (parsingError) {
                    setError(parsingError);
                } else {
                    const validPackages = packages.filter(
                        p => typeof p === 'object' && p !== null && typeof p.days === 'number' && typeof p.price === 'number'
                    );

                    if (packages.length > 0 && validPackages.length !== packages.length) {
                        setError("Cấu trúc dữ liệu của các gói gia hạn không hợp lệ. Mỗi gói phải có 'days' và 'price' là số.");
                        console.error("Invalid package structure in data:", packages);
                    } else if (validPackages.length === 0 && packages.length > 0) {
                         setError("Cấu trúc dữ liệu của các gói gia hạn không hợp lệ.");
                    } else if (validPackages.length === 0) {
                        setError("Không có gói gia hạn hợp lệ nào được tìm thấy cho công cụ này.");
                    }
                    
                    setToolDetails({
                        ...details,
                        package: JSON.stringify(validPackages),
                        parsedPackages: validPackages,
                    });
                }

            } catch (err) {
                console.error("Lỗi khi lấy chi tiết công cụ:", err);
                let errorMessage = "Không thể tải thông tin gia hạn.";
                 if (err instanceof AppwriteException) {
                    errorMessage = `Lỗi Appwrite: ${err.message}`;
                }
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchToolDetails();
    }, [tool.toolId]);

    const originalPrice = useMemo(() => {
        if (!toolDetails?.parsedPackages || toolDetails.parsedPackages.length === 0) {
            return 0;
        }
        const currentPackage = toolDetails.parsedPackages[selectedPackageIndex];
        if (!currentPackage) return 0;

        return currentPackage.price * deviceCount;
    }, [toolDetails, selectedPackageIndex, deviceCount]);
    
    const finalPrice = useMemo(() => {
        if (!appliedCoupon) {
            return originalPrice;
        }
        const discountAmount = originalPrice * (appliedCoupon.percent / 100);
        return Math.max(0, originalPrice - discountAmount);
    }, [originalPrice, appliedCoupon]);


    const handleVerifyCoupon = async () => {
        if (!discountCode.trim()) {
            setCouponError("Vui lòng nhập mã giảm giá.");
            return;
        }
        setIsVerifyingCoupon(true);
        setCouponError(null);
        setAppliedCoupon(null);
        try {
            const response = await databases.listDocuments<Coupon>(
                appwriteDatabaseId,
                couponsCollectionId,
                [
                    Query.equal('code', discountCode.trim()),
                    Query.equal('status', true),
                    Query.limit(1)
                ]
            );

            if (response.documents.length > 0) {
                const coupon = response.documents[0];
                setAppliedCoupon(coupon);
                showToast(`Áp dụng mã ${coupon.code} thành công (-${coupon.percent}%)!`, 'success');
            } else {
                setCouponError("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
            }
        } catch (error) {
            console.error("Lỗi khi xác thực mã giảm giá:", error);
            setCouponError("Đã xảy ra lỗi khi kiểm tra mã. Vui lòng thử lại.");
        } finally {
            setIsVerifyingCoupon(false);
        }
    };
    
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setDiscountCode('');
        setCouponError(null);
    };


    const handlePayment = async () => {
        if (!toolDetails || isProcessingPayment) return;
        setIsProcessingPayment(true);

        const transactionId = `PRO${Math.floor(Math.random() * 900000) + 100000}`;
        const selectedPackage = toolDetails.parsedPackages[selectedPackageIndex];
        const discountAmount = originalPrice - finalPrice;

        const payload = {
            userId: tool.userId,
            toolId: tool.toolId,
            package: {
                title: selectedPackage.title || `${selectedPackage.days} ngày`,
                days: selectedPackage.days,
                price: selectedPackage.price
            },
            deviceCount: deviceCount,
            originalPrice: originalPrice,
            amount: finalPrice,
            discount: discountAmount,
            couponCode: appliedCoupon?.code || "",
            contentPayment: transactionId,
            method: "transfer",
            isPurchased: "false"
        };
        
        console.log("Sending payment request with payload:", payload);
        // Here you would typically send the request to your backend API
        // e.g., await fetch('https://your-api.com/create-transaction', { method: 'POST', body: JSON.stringify(payload) });

        try {
            const params = new URLSearchParams({
              acc: BANK_INFO.accountNo,
              bank: BANK_INFO.bankShortName,
              amount: String(finalPrice),
              des: transactionId,
              template: BANK_INFO.template,
            });
            const qrCodeUrl = `https://qr.sepay.vn/img?${params.toString()}`;

            setPaymentDetails({
                amount: finalPrice,
                content: transactionId,
                qrCodeUrl: qrCodeUrl,
            });
            setView('payment');

        } catch (error) {
            console.error("Lỗi khi chuẩn bị thanh toán:", error);
            showToast("Không thể khởi tạo thanh toán. Vui lòng thử lại.", 'error');
        } finally {
            setIsProcessingPayment(false);
        }
    };
    
    const renderSelectionView = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
                </div>
            );
        }

        if (error) {
             return <p className="text-center text-red-500 p-4">{error}</p>
        }

        if (!toolDetails || !toolDetails.parsedPackages || toolDetails.parsedPackages.length === 0) {
            return <p className="text-center text-gray-500 p-4">Không có thông tin gói gia hạn cho công cụ này.</p>
        }

        return (
            <>
                <div className="space-y-4 px-2">
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chọn thời gian*</label>
                        <select
                            id="duration"
                            value={selectedPackageIndex}
                            onChange={(e) => setSelectedPackageIndex(parseInt(e.target.value, 10))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                           {toolDetails.parsedPackages.map((pkg, index) => (
                               <option key={index} value={index}>
                                   {pkg.title || `${pkg.days} ngày`} - {new Intl.NumberFormat('vi-VN').format(pkg.price)} VNĐ
                               </option>
                           ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="devices" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chọn số lượng thiết bị</label>
                         <select
                            id="devices"
                            value={deviceCount}
                            onChange={(e) => setDeviceCount(parseInt(e.target.value, 10))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                           {Array.from({ length: toolDetails.max_device || 1 }, (_, i) => i + 1).map(num => (
                               <option key={num} value={num}>{num}</option>
                           ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="discount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã giảm giá (Nếu có)</label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                id="discount"
                                value={discountCode}
                                onChange={(e) => setDiscountCode(e.target.value)}
                                placeholder="Nhập mã giảm giá"
                                className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600"
                                disabled={!!appliedCoupon || isVerifyingCoupon}
                            />
                            {!appliedCoupon ? (
                                <button onClick={handleVerifyCoupon} disabled={isVerifyingCoupon} className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-md hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 disabled:bg-sky-300 dark:disabled:bg-sky-800">
                                    {isVerifyingCoupon ? '...' : 'Áp dụng'}
                                </button>
                            ) : (
                                <button onClick={handleRemoveCoupon} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800">
                                    Xóa
                                </button>
                            )}
                        </div>
                         {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center px-2">
                    <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Tổng tiền:</span>
                    <div className="text-right">
                         {appliedCoupon && (
                            <span className="block text-sm text-red-500 line-through">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalPrice)}
                            </span>
                        )}
                        <span className="text-2xl font-bold text-sky-500">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalPrice)}
                        </span>
                         {appliedCoupon && (
                             <span className="block text-xs font-semibold text-green-500">
                                Đã giảm {appliedCoupon.percent}%
                            </span>
                        )}
                    </div>
                </div>
                 <div className="mt-8 flex justify-end space-x-3">
                    <button
                        onClick={handlePayment}
                        disabled={isProcessingPayment}
                        className="px-6 py-2 text-sm font-semibold text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50"
                    >
                        {isProcessingPayment ? 'Đang xử lý...' : 'Thanh toán'}
                    </button>
                    <button
                        onClick={onClose}
                        type="button"
                        className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-colors"
                    >
                        Hủy
                    </button>
                </div>
            </>
        )
    }

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300"
            onClick={view === 'selection' ? onClose : undefined}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 m-4 max-w-lg w-full transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {view === 'payment' && paymentDetails ? (
                    <PaymentView
                        amount={paymentDetails.amount}
                        content={paymentDetails.content}
                        qrCodeUrl={paymentDetails.qrCodeUrl}
                        bankInfo={BANK_INFO}
                        onBack={() => setView('selection')}
                        onCancel={onClose}
                    />
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Chọn gói sử dụng</h2>
                        {renderSelectionView()}
                    </>
                )}
            </div>
        </div>
    );
};

export default RenewalModal;