'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Medal,
  Crown,
  User,
  LogOut,
  ArrowLeft,
  Calendar,
  Target,
  Sparkles
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  score: number;
  scenario: string;
  playedAt: string;
}

interface User {
  id: number;
  username: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 读取用户信息
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          console.error('解析用户信息失败:', error);
        }
      }
    }
    
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.data);
      }
    } catch (error) {
      console.error('获取排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
      setUser(null);
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-600 dark:text-gray-400">{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
    return 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300';
  };

  const isCurrentUser = (entry: LeaderboardEntry) => {
    return user && entry.userId === user.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 p-4 relative">
      {/* 爱心背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-pink-200 dark:text-pink-900 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 20 + 10}px`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* 顶部导航栏 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-purple-100 dark:border-purple-900">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-1.5">
                    <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {user.username}
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
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="text-purple-600 dark:text-purple-400"
                >
                  登录
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/register')}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  注册
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-20 relative z-10">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              哄人高手排行榜
            </h1>
            <Sparkles className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            看看谁是哄人小能手
          </p>
        </div>

        {/* 记录列表 */}
        {leaderboard.length === 0 ? (
          <Card className="p-8 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-900">
            <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              暂无排行数据
            </p>
            <Button
              onClick={() => router.push('/')}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              开始第一局游戏
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <Card
                key={entry.rank}
                className={`p-4 backdrop-blur-sm border-2 transition-all ${
                  isCurrentUser(entry)
                    ? 'bg-purple-100/90 dark:bg-purple-900/90 border-purple-400 dark:border-purple-600 shadow-lg ring-2 ring-purple-300 dark:ring-purple-700'
                    : 'bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 排名 */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRankBadge(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {entry.username}
                        </h3>
                        {isCurrentUser(entry) && (
                          <Badge className="bg-purple-500 text-white border-0 text-xs">
                            我
                          </Badge>
                        )}
                        {entry.rank <= 3 && (
                          <Badge className={`${entry.rank === 1 ? 'bg-yellow-500' : entry.rank === 2 ? 'bg-gray-400' : 'bg-amber-600'} text-white border-0 text-xs`}>
                            TOP {entry.rank}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <Target className="w-3 h-3" />
                        {entry.scenario}
                        <span className="mx-1">·</span>
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.playedAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${
                      entry.score >= 90 ? 'text-green-600 dark:text-green-400' :
                      entry.score >= 80 ? 'text-blue-600 dark:text-blue-400' :
                      'text-purple-600 dark:text-purple-400'
                    }`}>
                      {entry.score}分
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      最高分
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 底部说明 */}
        {leaderboard.length > 0 && (
          <Card className="mt-6 p-4 bg-blue-50/80 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Trophy className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  排行榜规则
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  · 仅统计成功通关的游戏记录<br/>
                  · 每位用户只显示最高分数<br/>
                  · 登录用户的游戏成绩才能上榜
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 15s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
