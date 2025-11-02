import React, { useState, useEffect } from 'react';
import { databases, appwriteDatabaseId, ordersCollectionId, listToolCollectionId } from '../lib/appwrite';
import type { Models } from 'appwrite';
import { Query, AppwriteException } from 'appwrite';

interface MyToolsProps {
    user: Models.User<Models.Preferences>;
    showToast: (message: string, type: 'success' | 'error') => void;
}

// Order from 'orders' collection
export type UserTool = Models.Document & {
    userId: string;
    toolId: string; // This should be the document ID in 'listTool' collection
    price: number;
    expriration_date: string;
    status: boolean;
    toolName: string; 
    max_device: number;
    devices?: string[];
};

// Tool details from 'listTool' collection
export type ToolDetails = Models.Document & {
    name: string;
    url: string;
    cookie: string;
    package?: string; // Optional package details as a JSON string
    max_device?: number;
};

type EnrichedUserTool = UserTool & {
    canonicalName: string;
};


const MyTools: React.FC<MyToolsProps> = ({ user, showToast }) => {
    const [tools, setTools] = useState<EnrichedUserTool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessingToolId, setAccessingToolId] = useState<string | null>(null);

    const clearCookiesForUrl = async (url: string) => {
        // @ts-ignore
        if (typeof chrome === 'undefined' || !chrome.cookies) {
            console.warn("Không thể xóa cookie: không chạy trong môi trường extension.");
            return;
        }
        try {
            // @ts-ignore
            const cookies = await chrome.cookies.getAll({ url });
            if (cookies.length > 0) {
                 console.log(`Đang xóa ${cookies.length} cookie cho ${url}`);
                await Promise.all(
                    // @ts-ignore
                    cookies.map(cookie => chrome.cookies.remove({ url, name: cookie.name }))
                );
            }
        } catch (error) {
            console.error(`Lỗi khi xóa cookie cho ${url}:`, error);
        }
    };


    useEffect(() => {
        const fetchTools = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const orderResponse = await databases.listDocuments<UserTool>(
                    appwriteDatabaseId,
                    ordersCollectionId,
                    [
                        Query.equal('userId', user.$id),
                        Query.equal('status', true),
                        Query.limit(100)
                    ]
                );
                
                const userOrders = orderResponse.documents;

                if (userOrders.length === 0) {
                    setTools([]);
                    return;
                }

                const toolIds = [...new Set(userOrders.map(order => order.toolId))];

                const toolDetailsResponse = await databases.listDocuments<ToolDetails>(
                    appwriteDatabaseId,
                    listToolCollectionId,
                    [
                        Query.equal('$id', toolIds),
                        Query.limit(100)
                    ]
                );

                const toolDetailsMap = new Map(toolDetailsResponse.documents.map(doc => [doc.$id, doc]));

                const enrichedTools = userOrders.map(order => ({
                    ...order,
                    // FIX: Add type assertion to resolve 'Property 'name' does not exist on type 'unknown''.
                    canonicalName: (toolDetailsMap.get(order.toolId) as ToolDetails | undefined)?.name || order.toolName,
                })).sort((a, b) => new Date(b.expriration_date).getTime() - new Date(a.expriration_date).getTime());
                
                
                // Check for expired tools and clear cookies
                const expiredTools = enrichedTools.filter(tool => new Date(tool.expriration_date) < new Date());
                if (expiredTools.length > 0) {
                     const cookieClearingPromises = expiredTools
                        // FIX: Add type assertion to resolve 'Property 'url' does not exist on type 'unknown''.
                        .map(tool => (toolDetailsMap.get(tool.toolId) as ToolDetails | undefined)?.url)
                        .filter((url): url is string => !!url)
                        .map(url => clearCookiesForUrl(url));
                    
                    await Promise.all(cookieClearingPromises);
                }

                setTools(enrichedTools);

            } catch (e) {
                console.error("Failed to fetch tools:", e);
                setError("Không thể tải danh sách công cụ. Vui lòng thử lại sau.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTools();
    }, [user.$id]);

    const getDeviceId = async (): Promise<string | null> => {
        // @ts-ignore
        if (typeof chrome === 'undefined' || !chrome.storage) return null;
        try {
            // @ts-ignore
            const result = await chrome.storage.local.get(['deviceId']);
            return result.deviceId || null;
        } catch (e) {
            console.error("Lỗi khi lấy deviceId từ bộ nhớ:", e);
            return null;
        }
    };

    const setDeviceId = async (deviceId: string): Promise<void> => {
        // @ts-ignore
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        try {
            // @ts-ignore
            await chrome.storage.local.set({ deviceId });
        } catch (e) {
            console.error("Lỗi khi lưu deviceId vào bộ nhớ:", e);
        }
    };

    const handleAccessTool = async (tool: EnrichedUserTool) => {
        setAccessingToolId(tool.$id);
        
        try {
            // @ts-ignore
            if (typeof chrome === 'undefined' || !chrome.cookies || !chrome.tabs || !chrome.storage) {
                showToast('Chức năng này chỉ hoạt động trong tiện ích.', 'error');
                return;
            }
            
            // 1. Fetch current order data for accurate device list
            const currentOrder = await databases.getDocument<UserTool>(
                appwriteDatabaseId,
                ordersCollectionId,
                tool.$id
            );
            const devices = currentOrder.devices || [];
            const max_device = currentOrder.max_device || 1;

            // 2. Get local device ID from browser storage
            let localDeviceId = await getDeviceId();

            // 3. Check if this device is already registered for this tool
            const isDeviceRegistered = localDeviceId ? devices.includes(localDeviceId) : false;

            if (!isDeviceRegistered) {
                 // 4. If not registered, check if the device limit has been reached
                if (devices.length >= max_device) {
                    showToast('Đạt giới hạn số lượng thiết bị. Cần liên hệ admin để reset thiết bị.', 'error');
                    return;
                }

                // 5. Create and save a new device ID if one doesn't exist locally
                if (!localDeviceId) {
                    localDeviceId = crypto.randomUUID();
                    await setDeviceId(localDeviceId);
                }

                // 6. Update the order document with the new device ID
                await databases.updateDocument(
                    appwriteDatabaseId,
                    ordersCollectionId,
                    tool.$id,
                    { devices: [...devices, localDeviceId] }
                );
                showToast('Thiết bị đã được đăng ký thành công.', 'success');
                 // Refresh local tool state after updating devices
                setTools(prevTools => prevTools.map(t => 
                    t.$id === tool.$id ? { ...t, devices: [...devices, localDeviceId!] } : t
                ));
            }

            // 7. Proceed with login logic
            showToast('Đang lấy thông tin công cụ...', 'success');
            
            const toolDetails = await databases.getDocument<ToolDetails>(
                appwriteDatabaseId,
                listToolCollectionId,
                tool.toolId
            );

            const { url, cookie: cookieString } = toolDetails;

            if (!url || !cookieString) {
                showToast('Thông tin công cụ không hợp lệ (thiếu URL hoặc cookie).', 'error');
                return;
            }
            
            await clearCookiesForUrl(url);
            showToast('Đang đăng nhập...', 'success');
            
            try {
                const cookiesFromDb = JSON.parse(cookieString);
                if (!Array.isArray(cookiesFromDb)) {
                    throw new Error("Dữ liệu cookie không phải là một mảng JSON hợp lệ.");
                }

                const setCookiePromises = cookiesFromDb.map((cookieData: any) => {
                    if (!cookieData || !cookieData.name) {
                        console.warn('Bỏ qua cookie không có tên:', cookieData);
                        return Promise.resolve();
                    }

                    // Fix for: Cannot find namespace 'chrome'.
                    const cookieToSet = {
                        url: url,
                        name: cookieData.name,
                        value: cookieData.value,
                        domain: cookieData.domain,
                        path: cookieData.path,
                        secure: cookieData.secure,
                        httpOnly: cookieData.httpOnly,
                        expirationDate: cookieData.expirationDate,
                        storeId: cookieData.storeId,
                        sameSite: cookieData.sameSite,
                    };
                    
                    // @ts-ignore
                    return chrome.cookies.set(cookieToSet).catch(err => {
                        console.error(`Không thể thiết lập cookie "${cookieToSet.name}":`, err.message, cookieToSet);
                    });
                });

                await Promise.all(setCookiePromises);
                
                // @ts-ignore
                await chrome.tabs.create({ url, active: true });

            } catch (jsonError: any) {
                console.error("Lỗi khi phân tích hoặc thiết lập cookie:", jsonError);
                showToast('Định dạng cookie không hợp lệ. Vui lòng liên hệ hỗ trợ.', 'error');
            }

        } catch (error: any) {
            console.error("Lỗi khi truy cập công cụ:", error);
            let errorMessage = "Đã xảy ra lỗi khi truy cập công cụ.";
            if (error instanceof AppwriteException) {
                errorMessage = `Lỗi: ${error.message}`;
            } else if (error.message) {
                 errorMessage = `Lỗi: ${error.message}`;
            }
            showToast(errorMessage, 'error');
        } finally {
            setAccessingToolId(null);
        }
    };

    const handleRenewClick = () => {
        window.open('https://account.pro.vn/store', '_blank', 'noopener,noreferrer');
    };

    if (isLoading) {
        return <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>;
    }

    if (error) {
        return <div className="text-center bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-lg p-4">{error}</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto h-full flex flex-col">
             <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center flex-shrink-0">Công cụ của tôi</h2>
             {tools.length > 0 ? (
                <div className="flex-grow overflow-y-auto pr-2">
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Giá</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ngày hết hạn</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thiết bị</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tùy chọn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {tools.map(tool => {
                                    const expirationDate = new Date(tool.expriration_date);
                                    const isExpired = expirationDate < new Date();
                                    const formattedDate = expirationDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                    const deviceCount = tool.devices?.length || 0;

                                    return (
                                        <tr key={tool.$id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{tool.canonicalName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Intl.NumberFormat('vi-VN').format(tool.price)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`font-medium ${isExpired ? 'text-red-500' : 'text-green-500'}`}>{formattedDate}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{deviceCount} / {tool.max_device}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    {!isExpired && (
                                                        <button 
                                                            onClick={() => handleAccessTool(tool)}
                                                            disabled={accessingToolId === tool.$id}
                                                            className="px-4 py-1 text-xs font-semibold text-white bg-green-500 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                        >
                                                            {accessingToolId === tool.$id ? '...' : 'Truy cập'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={handleRenewClick}
                                                        className="px-4 py-1 text-xs font-semibold text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                                    >
                                                        Gia hạn
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
             ) : (
                <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                     <p className="text-gray-600 dark:text-gray-400">Bạn chưa đăng ký công cụ nào.</p>
                </div>
             )}
        </div>
    );
};

export default MyTools;