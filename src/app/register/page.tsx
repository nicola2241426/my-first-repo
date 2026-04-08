'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, UserPlus, Loader2, CheckCircle2, AlertCircle, User, LogOut } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [registeredUser, setRegisteredUser] = useState<{ id: number; username: string } | null>(null);

  // 检查用户登录状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // 如果已登录，跳转到首页
          router.push('/');
        } catch (error) {
          console.error('解析用户信息失败:', error);
          localStorage.removeItem('user');
        }
      }
    }
  }, [router]);

  // 处理退出登录
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    setUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 验证输入
    if (!username || !password || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (username.length < 3) {
      setError('用户名至少需要 3 个字符');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要 6 个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '注册失败');
      }

      // 存储用户信息到 localStorage
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setRegisteredUser(data.user);
      }

      setSuccess(true);

      // 3 秒后跳转到首页
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4">
        {/* 右上角用户区域 */}
        {registeredUser && (
          <div className="fixed top-4 right-4 z-50">
            <Card className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-900 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-1.5">
                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {registeredUser.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      已登录
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 h-8 w-8 p-0"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        <Card className="p-8 max-w-md w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-green-200 dark:border-green-900">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              注册成功！
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              欢迎加入哄哄模拟器
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              正在跳转到首页...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4">
      {/* 右上角用户区域 */}
      {user && (
        <div className="fixed top-4 right-4 z-50">
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
                onClick={handleLogout}
                className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 h-8 w-8 p-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      <Card className="p-8 max-w-md w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-pink-200 dark:border-pink-900">
        {/* 头部 */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UserPlus className="w-8 h-8 text-pink-500" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                注册账号
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              创建账号，开始你的恋爱修行之旅
            </p>
          </div>
        </div>

        {/* 注册表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户名
            </label>
            <Input
              type="text"
              placeholder="请输入用户名（至少 3 个字符）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="border-2 border-pink-200 dark:border-pink-900 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              密码
            </label>
            <Input
              type="password"
              placeholder="请输入密码（至少 6 个字符）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="border-2 border-pink-200 dark:border-pink-900 focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              确认密码
            </label>
            <Input
              type="password"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="border-2 border-pink-200 dark:border-pink-900 focus:border-pink-500"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-medium py-6 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                注册中...
              </>
            ) : (
              '注册'
            )}
          </Button>
        </form>

        {/* 底部链接 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            已有账号？
            <Link href="/login" className="text-pink-600 dark:text-pink-400 hover:underline ml-1 font-medium">
              立即登录
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
