'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Heart, BookOpen, Calendar, Wand2, User, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  summary: string;
  created_at: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/api/blog');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '获取文章列表失败');
        }

        setPosts(data.posts || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        setError(errorMessage);
        console.error('获取文章列表失败:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            加载失败
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </Card>
      </div>
    );
  }

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
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <Link href="/">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回游戏
              </Button>
            </Link>
            <Link href="/blog-admin">
              <Button variant="outline" size="sm" className="border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400">
                <Wand2 className="w-4 h-4 mr-2" />
                管理后台
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-8 h-8 text-pink-500" />
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                恋爱攻略
              </h1>
              <Heart className="w-8 h-8 text-pink-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              学习恋爱技巧，让感情升温
            </p>
          </div>
        </div>

        {/* 文章列表 */}
        <div className="grid gap-6">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card
                className="p-6 cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 border-pink-200 dark:border-pink-900 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 dark:bg-pink-900 rounded-full p-3 flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {post.summary}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded-full text-xs font-medium">
                        恋爱技巧
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-8 text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center gap-2">
            <Heart className="w-4 h-4" />
            更多精彩内容，敬请期待
          </p>
        </div>
      </div>
    </div>
  );
}
