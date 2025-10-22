
import React from 'react';
import { LogoIcon, MenuIcon, HeadsetIcon, SunIcon } from './icons';

interface HeaderProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const ThemeToggle: React.FC<{ isDarkMode: boolean; toggleTheme: () => void; }> = ({ isDarkMode, toggleTheme }) => {
    return (
        <button onClick={toggleTheme} className="relative w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-300">
            <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}>
                {isDarkMode ? 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg> 
                    : <SunIcon className="h-5 w-5 text-yellow-500 p-0.5" />}
            </span>
        </button>
    );
};

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
    return (
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <LogoIcon className="h-8 w-auto" />
                        <div className="ml-2">
                             <h1 className="text-xl font-bold text-gray-800 dark:text-white">Account Pro</h1>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 flex justify-center px-4">
                    {/* Placeholder for potential search bar or other central element */}
                </div>
                
                <div className="flex items-center space-x-4">
                     <button className="hidden sm:flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-full hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-colors">
                        <HeadsetIcon className="w-4 h-4 mr-2"/>
                        Liên hệ hỗ trợ
                    </button>
                    <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
                     <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
