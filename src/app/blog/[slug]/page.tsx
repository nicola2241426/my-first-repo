'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Heart, Calendar, BookOpen, Share2, User, LogOut } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  created_at: string;
}

export default function BlogDetailPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
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
    async function fetchPost() {
      if (!params.slug) return;

      try {
        const response = await fetch(`/api/blog/${params.slug}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setPost(null);
            return;
          }
          throw new Error(data.error || '获取文章详情失败');
        }

        setPost(data.post);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        setError(errorMessage);
        console.error('获取文章详情失败:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [params.slug]);

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
          <Link href="/blog">
            <Button>返回文章列表</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            文章未找到
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            抱歉，您要找的文章不存在
          </p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回文章列表
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // 格式化内容，将换行符转换为段落
  const formattedContent = post.content.split('\n\n').map((paragraph, index) => {
    if (paragraph.trim() === '') return null;

    // 检查是否是标题（以 ## 开头）
    if (paragraph.trim().startsWith('##')) {
      return (
        <h2 key={index} className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          {paragraph.trim().replace('##', '').trim()}
        </h2>
      );
    }

    // 检查是否是列表项（以数字 + . 开头）
    if (/^\d+\./.test(paragraph.trim())) {
      return (
        <ul key={index} className="list-decimal list-inside text-gray-700 dark:text-gray-300 my-4 space-y-2">
          {paragraph.split('\n').map((item, i) => (
            <li key={i} className="ml-4">
              {item.replace(/^\d+\.\s*/, '')}
            </li>
          ))}
        </ul>
      );
    }

    // 普通段落
    return (
      <p key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed my-6">
        {paragraph}
      </p>
    );
  });

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
        <div className="mb-6">
          <Link href="/blog">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回文章列表
            </Button>
          </Link>
        </div>

        {/* 文章卡片 */}
        <Card className="p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-pink-200 dark:border-pink-900">
          {/* 文章标题 */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {post.title}
            </h1>

            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>恋爱技巧</span>
              </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <p className="text-lg text-gray-600 dark:text-gray-300 italic">
                {post.summary}
              </p>
            </div>
          </div>

          {/* 文章内容 */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {formattedContent}
          </div>

          {/* 底部操作 */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-pink-500">
              <Heart className="w-5 h-5 fill-current" />
              <span className="font-medium">感谢阅读</span>
            </div>
            <Button
              variant="outline"
              className="border-2 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    text: post.summary,
                    url: window.location.href,
                  });
                } else {
                  // 复制链接到剪贴板
                  navigator.clipboard.writeText(window.location.href);
                  alert('链接已复制到剪贴板');
                }
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享文章
            </Button>
          </div>
        </Card>

        {/* 返回按钮 */}
        <div className="text-center mt-8">
          <Link href="/">
            <Button variant="outline" className="border-2 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400">
              <Heart className="w-4 h-4 mr-2" />
              返回哄哄模拟器
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
