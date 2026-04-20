'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  XCircle,
  History,
  User,
  LogOut,
  ArrowLeft,
  Calendar,
  Target,
  Sparkles,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { ReportView, type ReportContent } from '@/components/report-panel';

interface GameRecord {
  id: number;
  userId: number;
  scenario: string;
  finalScore: number;
  result: string;
  reportKey: string | null;
  playedAt: string;
}

interface User {
  id: number;
  username: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reportCache, setReportCache] = useState<Record<number, ReportContent>>({});
  const [reportLoadingId, setReportLoadingId] = useState<number | null>(null);
  const [reportError, setReportError] = useState<{ id: number; msg: string } | null>(null);

  const handleToggleReport = async (record: GameRecord) => {
    if (expandedId === record.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(record.id);
    setReportError(null);

    if (reportCache[record.id] || !record.reportKey || !user) return;

    setReportLoadingId(record.id);
    try {
      const res = await fetch(
        `/api/game-records/${record.id}/report?userId=${user.id}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '加载报告失败');
      }
      setReportCache((prev) => ({ ...prev, [record.id]: data.data.report }));
    } catch (err) {
      setReportError({
        id: record.id,
        msg: err instanceof Error ? err.message : '加载报告失败',
      });
    } finally {
      setReportLoadingId(null);
    }
  };

  useEffect(() => {
    // 从 localStorage 读取用户信息
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          fetchRecords(userData.id);
        } catch (error) {
          console.error('解析用户信息失败:', error);
          localStorage.removeItem('user');
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  const fetchRecords = async (userId: number) => {
    try {
      const response = await fetch(`/api/game-records?userId=${userId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.records) {
        setRecords(data.records);
      }
    } catch (error) {
      console.error('获取游戏记录失败:', error);
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
      router.push('/');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getResultIcon = (result: string) => {
    return result === 'won' ? (
      <Trophy className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getResultBadge = (result: string) => {
    return result === 'won' ? (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
        成功
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0">
        失败
      </Badge>
    );
  };

  // 统计数据
  const totalGames = records.length;
  const wonGames = records.filter(r => r.result === 'won').length;
  const avgScore = totalGames > 0
    ? Math.round(records.reduce((sum, r) => sum + r.finalScore, 0) / totalGames)
    : 0;
  const winRate = totalGames > 0
    ? Math.round((wonGames / totalGames) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
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
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pt-20 relative z-10">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <History className="w-8 h-8 text-purple-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              游戏记录
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            查看你的哄人技巧进步历程
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-900">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalGames}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  总场次
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-900">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900 rounded-full p-2">
                <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {wonGames}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  成功场次
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-900">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full p-2">
                <Target className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {avgScore}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  平均分数
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-900">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-2">
                <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {winRate}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  胜率
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 记录列表 */}
        {records.length === 0 ? (
          <Card className="p-8 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-900">
            <History className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              还没有游戏记录
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
            {records.map((record) => {
              const isExpanded = expandedId === record.id;
              const hasReport = !!record.reportKey;
              const cached = reportCache[record.id];
              const isLoading = reportLoadingId === record.id;
              const errMsg =
                reportError?.id === record.id ? reportError.msg : null;

              return (
                <Card
                  key={record.id}
                  className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getResultIcon(record.result)}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {record.scenario}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.playedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${getScoreColor(record.finalScore)}`}>
                          {record.finalScore}分
                        </p>
                        {getResultBadge(record.result)}
                      </div>
                    </div>
                  </div>

                  {hasReport && (
                    <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-900/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleReport(record)}
                        className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 w-full justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          {isExpanded ? '收起解读报告' : '查看解读报告'}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </Button>

                      {isExpanded && (
                        <div className="mt-3">
                          {isLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              加载报告中…
                            </div>
                          )}
                          {errMsg && !isLoading && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded">
                              {errMsg}
                            </div>
                          )}
                          {cached && !isLoading && (
                            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-100 dark:border-purple-900/50">
                              <ReportView report={cached} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
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
