import React from 'react';
import { MonitorIcon, LogoutIcon, StoreIcon, LogoIcon } from './icons';
import type { Models } from 'appwrite';
import type { View } from '../App';

interface SidebarProps {
    user: Models.User<Models.Preferences> | null;
    onLogout: () => void;
    currentView: View;
    onNavigate: (view: View) => void;
    onGetCookie: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, currentView, onNavigate, onGetCookie }) => {
    
    const navItemClasses = (view: View) => 
      `flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
        currentView === view 
        ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300' 
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`;

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 flex-shrink-0 flex flex-col transition-colors duration-300">
            <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200 dark:border-gray-700">
                <LogoIcon className="h-10 w-auto" />
            </div>

            <div className="flex flex-col flex-grow p-4 overflow-y-auto">
                {/* Main navigation area */}
                <nav className="flex-1 space-y-2">
                    {user ? (
                        <>
                            <button onClick={() => onNavigate('my-tools')} className={navItemClasses('my-tools')}>
                                <MonitorIcon className="h-5 w-5 mr-3" />
                                Công cụ của tôi
                            </button>
                            <button onClick={() => onNavigate('buy-tool')} className={navItemClasses('buy-tool')}>
                                <StoreIcon className="h-5 w-5 mr-3" />
                                Mua Tool
                            </button>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400">Vui lòng đăng nhập để xem công cụ.</p>
                        </div>
                    )}
                </nav>

                {/* Bottom section, pushed to the bottom by flex-1 on nav */}
                <div className="mt-auto space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={onGetCookie} className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-colors">
                        Lấy Cookie
                    </button>
               
                    {user && (
                        <div>
                            <div className="text-center mb-3">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate" title={user.name}>
                                    {user.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={user.email}>
                                    {user.email}
                                </p>
                            </div>
                            <button onClick={onLogout} className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors">
                                <LogoutIcon className="h-5 w-5 mr-2" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    ©Version 1.0.3 <a href="#" className="font-medium text-sky-500 hover:underline">Account Pro</a>
                </p>
            </div>
        </aside>
    );
};

export default Sidebar;