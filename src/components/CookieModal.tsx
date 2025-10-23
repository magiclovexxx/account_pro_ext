import React from 'react';
import { ClipboardIcon } from './icons';

interface CookieModalProps {
    isOpen: boolean;
    onClose: () => void;
    cookieString: string;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const CookieModal: React.FC<CookieModalProps> = ({ isOpen, onClose, cookieString, showToast }) => {
    if (!isOpen) {
        return null;
    }

    const handleCopy = async () => {
        if (!cookieString || cookieString.startsWith('Không') || cookieString.startsWith('Đã')) return;
        try {
            await navigator.clipboard.writeText(cookieString);
            showToast('Đã sao chép cookie!', 'success');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showToast('Lỗi khi sao chép.', 'error');
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-lg w-full transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cookies cho trang hiện tại</h3>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-1">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <textarea
                    readOnly
                    className="w-full h-40 p-3 text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={cookieString}
                />

                <div className="mt-6 flex justify-end space-x-4">
                    <button
                        onClick={handleCopy}
                        disabled={!cookieString || cookieString.startsWith('Không') || cookieString.startsWith('Đã')}
                        className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-sky-300 dark:disabled:bg-sky-800 disabled:cursor-not-allowed"
                    >
                        <ClipboardIcon className="w-4 h-4 mr-2" />
                        Sao chép
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 focus:outline-none transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieModal;
