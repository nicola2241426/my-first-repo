'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, LogOut } from 'lucide-react';

interface UserInfoProps {
  user: { id: number; username: string } | null;
  checkingAuth?: boolean;
  onLogout: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

export function UserInfo({ user, checkingAuth, onLogout, onLogin, onRegister }: UserInfoProps) {
  return (
    <div className="fixed top-4 right-4 z-50">
      {checkingAuth ? (
        <Card className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-900 shadow-lg">
          <div className="text-sm text-gray-500 dark:text-gray-400">加载中...</div>
        </Card>
      ) : user ? (
        <Card className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-900 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-1.5">
                <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {user.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  已登录
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 h-8 w-8 p-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-900 shadow-lg">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onLogin}
              className="border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 h-8"
            >
              登录
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRegister}
              className="border-2 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400 h-8"
            >
              注册
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
