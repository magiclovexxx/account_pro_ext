
import React, { useState, useEffect } from 'react';
import { databases, appwriteDatabaseId, ordersCollectionId, listToolCollectionId } from '../lib/appwrite';
import type { Models } from 'appwrite';
import { Query, AppwriteException } from 'appwrite';
import RenewalModal from './RenewalModal';

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
};

// Tool details from 'listTool' collection
export type ToolDetails = Models.Document & {
    url: string;
    cookie: string;
    package?: string; // Optional package details as a JSON string
    max_device?: number;
};

interface ToolCardProps {
    tool: UserTool;
    onAccess: (tool: UserTool) => void;
    onRenew: (tool: UserTool) => void;
    isAccessing: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onAccess, onRenew, isAccessing }) => {
    const expirationDate = new Date(tool.expriration_date);
    const isExpired = expirationDate < new Date();
    const formattedDate = expirationDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="flex-grow">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white pr-2">{tool.toolName}</h3>
                    <span className="flex-shrink-0 text-lg font-semibold text-sky-500">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tool.price)}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p><strong>Thiết bị sử dụng:</strong> 1 / {tool.max_device}</p>
                    <p>
                        <strong>Ngày hết hạn:</strong>
                        <span className={`ml-2 font-medium ${isExpired ? 'text-red-500' : 'text-green-500'}`}>{formattedDate}</span>
                    </p>
                </div>
                 {isExpired && (
                    <p className="text-xs text-red-500 font-semibold mt-2 animate-pulse">
                        Hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.
                    </p>
                )}
            </div>
            <div className="mt-6 flex items-center space-x-3">
                 {!isExpired ? (
                    <button 
                        onClick={() => onAccess(tool)}
                        disabled={isAccessing}
                        className="w-full py-2 px-4 text-sm font-semibold text-white bg-green-500 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isAccessing ? 'Đang xử lý...' : 'Truy cập'}
                    </button>
                 ) : (
                    <div className="w-full"></div> // Placeholder to keep alignment
                 )}
                <button 
                    onClick={() => onRenew(tool)}
                    className="w-full py-2 px-4 text-sm font-semibold text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-colors">
                    Gia hạn
                </button>
            </div>
        </div>
    );
};

const MyTools: React.FC<MyToolsProps> = ({ user, showToast }) => {
    const [tools, setTools] = useState<UserTool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessingToolId, setAccessingToolId] = useState<string | null>(null);
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
    const [selectedToolForRenewal, setSelectedToolForRenewal] = useState<UserTool | null>(null);

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
                
                const userTools = orderResponse.documents
                    .sort((a, b) => new Date(b.expriration_date).getTime() - new Date(a.expriration_date).getTime());
                
                // Check for expired tools and clear cookies
                const expiredTools = userTools.filter(tool => new Date(tool.expriration_date) < new Date());
                if (expiredTools.length > 0) {
                    const toolDetailsPromises = expiredTools.map(tool => 
                        databases.getDocument<ToolDetails>(appwriteDatabaseId, listToolCollectionId, tool.toolId)
                    );
                    const toolDetails = await Promise.all(toolDetailsPromises);
                    const cookieClearingPromises = toolDetails
                        .filter(detail => detail.url)
                        .map(detail => clearCookiesForUrl(detail.url));
                    
                    await Promise.all(cookieClearingPromises);
                }

                setTools(userTools);

            } catch (e) {
                console.error("Failed to fetch tools:", e);
                setError("Không thể tải danh sách công cụ. Vui lòng thử lại sau.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTools();
    }, [user.$id]);

    const handleAccessTool = async (tool: UserTool) => {
        setAccessingToolId(tool.$id);
        
        try {
            // @ts-ignore
            if (typeof chrome === 'undefined' || !chrome.cookies || !chrome.tabs) {
                showToast('Chức năng này chỉ hoạt động trong tiện ích.', 'error');
                return;
            }

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

            showToast('Đang đăng nhập...', 'success');

            const domain = new URL(url).hostname;

            const cookiePromises = cookieString.split(';').map(cookiePair => {
                const trimmedPair = cookiePair.trim();
                const firstEqual = trimmedPair.indexOf('=');
                if (firstEqual === -1) return Promise.resolve();

                const name = trimmedPair.substring(0, firstEqual);
                const value = trimmedPair.substring(firstEqual + 1);

                if (!name) return Promise.resolve();
                // @ts-ignore
                return chrome.cookies.set({ url, name, value, domain, path: '/' });
            });

            await Promise.all(cookiePromises);
            // @ts-ignore
            await chrome.tabs.create({ url, active: true });

        } catch (error: any) {
            console.error("Lỗi khi truy cập công cụ:", error);
            let errorMessage = "Đã xảy ra lỗi khi truy cập công cụ.";
            if (error instanceof AppwriteException && error.code === 404) {
                errorMessage = "Không tìm thấy thông tin chi tiết cho công cụ này.";
            } else if (error.message) {
                 errorMessage = error.message;
            }
            showToast(errorMessage, 'error');
        } finally {
            setAccessingToolId(null);
        }
    };

    const handleRenewClick = (tool: UserTool) => {
        setSelectedToolForRenewal(tool);
        setIsRenewalModalOpen(true);
    };

    if (isLoading) {
        return <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>;
    }

    if (error) {
        return <div className="text-center bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-lg p-4">{error}</div>;
    }

    return (
        <>
            <div className="w-full max-w-6xl mx-auto h-full flex flex-col">
                 <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center flex-shrink-0">Công cụ của tôi</h2>
                 {tools.length > 0 ? (
                    <div className="flex-grow overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tools.map(tool => 
                                <ToolCard 
                                    key={tool.$id} 
                                    tool={tool} 
                                    onAccess={handleAccessTool}
                                    onRenew={handleRenewClick}
                                    isAccessing={accessingToolId === tool.$id}
                                />
                            )}
                        </div>
                    </div>
                 ) : (
                    <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                         <p className="text-gray-600 dark:text-gray-400">Bạn chưa đăng ký công cụ nào.</p>
                    </div>
                 )}
            </div>
            {isRenewalModalOpen && selectedToolForRenewal && (
                <RenewalModal
                    tool={selectedToolForRenewal}
                    onClose={() => setIsRenewalModalOpen(false)}
                    showToast={showToast}
                />
            )}
        </>
    );
};

export default MyTools;
