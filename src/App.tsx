import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import MyTools from './components/MyTools';
import BuyTool from './components/BuyTool';
import CookieModal from './components/CookieModal';
import Toast from './components/Toast';
import { account } from './lib/appwrite';
import type { Models } from 'appwrite';

export type View = 'my-tools' | 'buy-tool';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('my-tools');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCookieString, setModalCookieString] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkSession();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleGetCookie = async () => {
    // @ts-ignore
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.cookies) {
        try {
            // @ts-ignore
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0 || !tabs[0].url) {
                showToast('Không tìm thấy tab hoạt động.', 'error');
                return;
            }
            const currentTabUrl = tabs[0].url;
            // @ts-ignore
            const cookies = await chrome.cookies.getAll({ url: currentTabUrl });

            if (cookies.length === 0) {
                setModalCookieString('Không tìm thấy cookie nào cho trang này.');
            } else {
                const cookieString = cookies.map((cookie: any) => `${cookie.name}=${cookie.value}`).join('; ');
                setModalCookieString(cookieString);
            }
            setIsModalOpen(true);

        } catch (error: any) {
            console.error("Lỗi khi lấy cookie:", error);
            setModalCookieString(`Đã xảy ra lỗi khi lấy cookie. Vui lòng kiểm tra quyền của tiện ích.\n\n${error.message}`);
            setIsModalOpen(true);
        }
    } else {
        // Fallback for development
        console.warn("Không chạy trong môi trường extension. Hiển thị dữ liệu giả.");
        setModalCookieString("test_cookie_name=test_cookie_value; another_cookie=another_value;");
        setIsModalOpen(true);
    }
  };

  const handleLoginSuccess = (loggedInUser: Models.User<Models.Preferences>) => {
    setUser(loggedInUser);
    setCurrentView('my-tools');
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
      setCurrentView('my-tools');
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  return (
    <div className={`font-sans bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300 h-full w-full`}>
        {isAuthLoading ? (
            <div className="h-full w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
            </div>
        ) : !user ? (
            <main className="h-full flex items-center justify-center p-4">
                <Login onLoginSuccess={handleLoginSuccess} />
            </main>
        ) : (
            <div className="flex h-full">
                <Sidebar user={user} onLogout={handleLogout} currentView={currentView} onNavigate={setCurrentView} onGetCookie={handleGetCookie} />
                <div className="flex-1 flex flex-col min-w-0">
                    <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
                    <main className="flex-1 p-4 sm:p-6 md:p-8 flex items-center justify-center overflow-auto">
                        {(() => {
                            switch (currentView) {
                                case 'my-tools':
                                    return <MyTools user={user} showToast={showToast} />;
                                case 'buy-tool':
                                    return <BuyTool />;
                                default:
                                    return <MyTools user={user} showToast={showToast} />;
                            }
                        })()}
                    </main>
                </div>
            </div>
        )}
        <CookieModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            cookieString={modalCookieString}
            showToast={showToast}
        />
        {toast && (
            <Toast
                key={Date.now()}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
            />
        )}
    </div>
  );
};

export default App;
