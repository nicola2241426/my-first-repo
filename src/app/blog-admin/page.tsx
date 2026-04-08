'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Wand2, Loader2, CheckCircle2, AlertCircle, User, LogOut } from 'lucide-react';

interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
}

export default function BlogAdminPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; post?: Post } | null>(null);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);

  // 检查用户登录状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          console.error('解析用户信息失败:', error);
          localStorage.removeItem('user');
        }
      }
    }
  }, []);

  // 处理退出登录
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    setUser(null);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setResult({
        success: false,
        message: '请输入文章主题'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '生成失败');
      }

      setResult({
        success: true,
        message: '文章生成成功！',
        post: data.post
      });
      setTopic('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 p-4">
      {/* 右上角用户区域 */}
      <div className="fixed top-4 right-4 z-50">
        {user ? (
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
        ) : (
          <Card className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-900 shadow-lg">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/login'}
                className="border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 h-8"
              >
                登录
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/register'}
                className="border-2 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400 h-8"
              >
                注册
              </Button>
            </div>
          </Card>
        )}
      </div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* 头部 */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回游戏
            </Button>
          </Link>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              博客管理后台
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              使用 AI 生成新的恋爱沟通技巧文章
            </p>
          </div>
        </div>

        {/* 生成文章表单 */}
        <Card className="p-6 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-pink-200 dark:border-pink-900">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                文章主题
              </label>
              <Input
                placeholder="例如：如何有效沟通、纪念日惊喜、异地恋维护..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={loading}
                className="border-2 border-pink-200 dark:border-pink-900 focus:border-pink-500"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-medium py-6 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI 正在创作中...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  生成文章
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 结果提示 */}
        {result && (
          <Card
            className={`p-6 mb-6 ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-900'
                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-bold mb-2 ${result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {result.success ? '生成成功' : '生成失败'}
                </h3>
                <p className={`text-sm ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {result.message}
                </p>
                {result.success && result.post && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">{result.post.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{result.post.summary}</p>
                    <Link href={`/blog/${result.post.slug}`} className="mt-3 inline-block">
                      <Button variant="outline" size="sm" className="border-2 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400">
                        查看文章
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* 快捷主题 */}
        <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-pink-200 dark:border-pink-900">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">
            推荐主题
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              '异地恋的维系技巧',
              '如何处理误会',
              '纪念日惊喜策划',
              '冷战后的和好',
              '情侣间的有效沟通',
              '恋爱中的信任建立',
              '处理争吵的艺术',
              '表达爱意的方式'
            ].map((suggestedTopic) => (
              <Button
                key={suggestedTopic}
                variant="outline"
                size="sm"
                onClick={() => setTopic(suggestedTopic)}
                disabled={loading}
                className="border-2 border-pink-200 dark:border-pink-900 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20"
              >
                {suggestedTopic}
              </Button>
            ))}
          </div>
        </Card>

        {/* 快捷链接 */}
        <div className="mt-8 text-center">
          <Link href="/blog">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-400">
              查看所有文章
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
