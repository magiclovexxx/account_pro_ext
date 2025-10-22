import React, { useState, useEffect } from 'react';
import { databases, appwriteDatabaseId, ordersCollectionId, toolsCollectionId } from '../lib/appwrite';
import type { Models } from 'appwrite';
import { Query } from 'appwrite';

interface MyToolsProps {
    user: Models.User<Models.Preferences>;
}

interface Order extends Models.Document {
    userId: string;
    toolId: string;
    price: number;
    expriration_date: string;
    status: boolean;
}

interface Tool extends Models.Document {
    name: string;
    max_device: number;
}

interface UserTool extends Order {
    toolName: string;
    max_device: number;
}

const ToolCard: React.FC<{ tool: UserTool }> = ({ tool }) => {
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
            </div>
            <div className="mt-6">
                <button className="w-full py-2 px-4 text-sm font-semibold text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-colors">
                    Gia hạn
                </button>
            </div>
        </div>
    );
};

const MyTools: React.FC<MyToolsProps> = ({ user }) => {
    const [tools, setTools] = useState<UserTool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTools = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const orderResponse = await databases.listDocuments<Order>(
                    appwriteDatabaseId,
                    ordersCollectionId,
                    [
                        Query.equal('userId', user.$id),
                        Query.equal('status', true),
                        Query.limit(100)
                    ]
                );
                const orders = orderResponse.documents;
                if (orders.length === 0) {
                    setTools([]);
                    return;
                }
                const toolIds = [...new Set(orders.map(o => o.toolId))];
                if (toolIds.length === 0) {
                     setTools([]);
                    return;
                }
                const toolResponse = await databases.listDocuments<Tool>(
                    appwriteDatabaseId,
                    toolsCollectionId,
                    [ Query.equal('$id', toolIds) ]
                );
                
                const toolMap = new Map<string, Tool>();
                toolResponse.documents.forEach(t => toolMap.set(t.$id, t));

                const userTools: UserTool[] = orders.map(order => {
                    const toolDetails = toolMap.get(order.toolId);
                    return {
                        ...order,
                        toolName: toolDetails?.name || `Tool ID: ${order.toolId}`,
                        max_device: toolDetails?.max_device || 1,
                    };
                }).sort((a, b) => new Date(b.expriration_date).getTime() - new Date(a.expriration_date).getTime());

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tools.map(tool => <ToolCard key={tool.$id} tool={tool} />)}
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
