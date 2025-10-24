import React, { useState, useEffect } from 'react';
import { databases, appwriteDatabaseId, listToolCollectionId } from '../lib/appwrite';
import type { Models } from 'appwrite';
import { Query } from 'appwrite';
import { ShoppingBagIcon } from './icons';

// FIX: Changed interface to type to fix issue with property '$id' not being inherited.
type ToolForSale = Models.Document & {
    name: string;
    price: number;
    type: string;
    desc: string;
};

const BuyTool: React.FC = () => {
    const [tools, setTools] = useState<ToolForSale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchToolsForSale = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await databases.listDocuments<ToolForSale>(
                    appwriteDatabaseId,
                    listToolCollectionId,
                    [
                        Query.equal('status', true),
                        Query.select(['name', 'price', 'type']),
                        Query.limit(100)
                    ]
                );
                setTools(response.documents);
            } catch (e) {
                console.error("Failed to fetch tools for sale:", e);
                setError("Không thể tải danh sách công cụ. Vui lòng thử lại sau.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchToolsForSale();
    }, []);

    if (isLoading) {
        return <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>;
    }

    if (error) {
        return <div className="text-center bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-lg p-4">{error}</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto h-full flex flex-col">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center flex-shrink-0">Mua công cụ mới</h2>
            {tools.length > 0 ? (
                 <div className="flex-grow overflow-y-auto pr-2">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Giá</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Loại</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tùy chọn</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {tools.map(tool => (
                                        <tr key={tool.$id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <a href="#" className="text-sky-600 dark:text-sky-400 hover:underline">{tool.name}</a>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                {new Intl.NumberFormat('vi-VN').format(tool.price)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{tool.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <button 
                                                    onClick={() => window.open('https://account.pro.vn/store', '_blank', 'noopener,noreferrer')}
                                                    className="p-2 text-sky-500 hover:text-sky-700 dark:hover:text-sky-300 rounded-full hover:bg-sky-100 dark:hover:bg-sky-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-all"
                                                >
                                                    <ShoppingBagIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                     <p className="text-gray-600 dark:text-gray-400">Hiện tại chưa có công cụ nào được mở bán.</p>
                </div>
            )}
        </div>
    );
};

export default BuyTool;