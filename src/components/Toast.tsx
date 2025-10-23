import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => {
            setVisible(false);
            // Wait for fade-out animation to complete before calling onClose
            setTimeout(onClose, 300); 
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50';
    const borderColor = isSuccess ? 'border-green-500' : 'border-red-500';
    const textColor = isSuccess ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200';
    const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;

    return (
        <div className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <div className={`flex items-center p-4 rounded-lg shadow-lg border ${bgColor} ${borderColor} ${textColor}`}>
                <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
                <span className="text-sm font-medium">{message}</span>
            </div>
        </div>
    );
};

export default Toast;
