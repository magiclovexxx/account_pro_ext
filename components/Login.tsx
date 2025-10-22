
import React, { useState } from 'react';
import { LogoIcon } from './icons';
import { account } from '../lib/appwrite';
import { AppwriteException } from 'appwrite';
import type { Models } from 'appwrite';

interface LoginProps {
  onLoginSuccess: (user: Models.User<Models.Preferences>) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      onLoginSuccess(user);
    } catch (err) {
      if (err instanceof AppwriteException) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6 transition-colors duration-300">
      <div className="text-center">
        <div className="flex flex-col items-center justify-center mb-4">
            <LogoIcon className="h-12 w-auto" />
            <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">account.pro.vn</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-wider">
          ACCOUNT PRO
        </h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300 flex items-center justify-center">
          Welcome to Account Pro! 
          <span role="img" aria-label="waving hand" className="ml-2 text-2xl animate-wave">👋</span>
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
         {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-lg" role="alert">
                <p className="text-sm">{error}</p>
            </div>
        )}
        <div>
          <label htmlFor="email" className="sr-only">
            Email hoặc số điện thoại
          </label>
          <input
            id="email"
            name="email"
            type="text"
            required
            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors"
            placeholder="Email hoặc số điện thoại"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Ghi nhớ đăng nhập
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-full text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 transition-colors disabled:bg-sky-300 dark:disabled:bg-sky-800 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </div>
      </form>
      
      <div className="text-sm text-center">
        <a href="#" className="font-medium text-sky-600 hover:text-sky-500">
          Bạn quên mật khẩu?
        </a>
        <span className="text-gray-400 mx-2">·</span>
        <a href="#" className="font-medium text-sky-600 hover:text-sky-500">
          Đăng ký tài khoản
        </a>
      </div>
    </div>
  );
};

export default Login;