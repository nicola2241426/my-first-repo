'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle, Heart, Brain, MessageCircle, Compass } from 'lucide-react';

export interface ReportSkillScores {
  empathy: number;
  emotionManagement: number;
  communication: number;
  initiative: number;
}

export interface ReportContent {
  overallScore: number;
  verdict: string;
  strengths: Array<{ title: string; detail: string }>;
  weaknesses: Array<{ title: string; detail: string }>;
  skillScores: ReportSkillScores;
  advice: string[];
  quote: string;
}

export interface ReportPanelMessage {
  role: 'user' | 'assistant';
  content: string;
  reason?: string;
  moodChange?: number;
}

interface ReportPanelProps {
  userId: number;
  recordId: number | null;
  scenario: { title: string; description: string } | null;
  playerGender: 'boyfriend' | 'girlfriend';
  finalScore: number;
  result: 'won' | 'lost';
  messages: ReportPanelMessage[];
  /** 初始已加载的报告（用于从历史记录查看时直接渲染） */
  initialReport?: ReportContent | null;
}

const SKILL_LABELS: Array<{
  key: keyof ReportSkillScores;
  label: string;
  icon: typeof Heart;
  color: string;
}> = [
  { key: 'empathy', label: '共情力', icon: Heart, color: 'text-rose-500' },
  { key: 'emotionManagement', label: '情绪管理', icon: Brain, color: 'text-indigo-500' },
  { key: 'communication', label: '沟通技巧', icon: MessageCircle, color: 'text-emerald-500' },
  { key: 'initiative', label: '主动性', icon: Compass, color: 'text-amber-500' },
];

function ScoreBar({ value, color }: { value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function ReportView({ report }: { report: ReportContent }) {
  return (
    <div className="space-y-5 text-left">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            恋爱解读报告
          </h3>
        </div>
        <div className="text-5xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
          {report.overallScore}
          <span className="text-lg text-gray-400 font-medium"> / 100</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 px-2 leading-relaxed">
          {report.verdict}
        </p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          能力雷达
        </h4>
        <div className="grid grid-cols-1 gap-3">
          {SKILL_LABELS.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  {label}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {report.skillScores[key]}
                </span>
              </div>
              <ScoreBar
                value={report.skillScores[key]}
                color={
                  key === 'empathy'
                    ? 'bg-rose-400'
                    : key === 'emotionManagement'
                    ? 'bg-indigo-400'
                    : key === 'communication'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }
              />
            </div>
          ))}
        </div>
      </div>

      {report.weaknesses.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            需要改进（重点）
          </h4>
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="text-sm">
                <div className="font-medium text-red-800 dark:text-red-200">
                  · {w.title}
                </div>
                <div className="text-gray-700 dark:text-gray-300 ml-3 leading-relaxed">
                  {w.detail}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.strengths.length > 0 && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40">
          <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
            做得不错的地方
          </h4>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-sm">
                <div className="font-medium text-green-800 dark:text-green-200">
                  · {s.title}
                </div>
                <div className="text-gray-700 dark:text-gray-300 ml-3 leading-relaxed">
                  {s.detail}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.advice.length > 0 && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
            可行的改进建议
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            {report.advice.map((a, i) => (
              <li
                key={i}
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
              >
                {a}
              </li>
            ))}
          </ol>
        </div>
      )}

      <blockquote className="text-sm italic text-center text-gray-600 dark:text-gray-300 px-3 py-2 border-l-2 border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10 rounded">
        &ldquo;{report.quote}&rdquo;
      </blockquote>
    </div>
  );
}

export function ReportPanel(props: ReportPanelProps) {
  const [report, setReport] = useState<ReportContent | null>(
    props.initialReport ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate =
    props.recordId !== null && props.scenario !== null && props.messages.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: props.userId,
          recordId: props.recordId,
          scenario: {
            title: props.scenario!.title,
            description: props.scenario!.description,
          },
          playerGender: props.playerGender,
          finalScore: props.finalScore,
          result: props.result,
          messages: props.messages,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '生成报告失败');
      }
      setReport(data.data.report);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '生成报告失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (report) {
    return (
      <Card className="p-5 border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10">
        <ReportView report={report} />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 border-2 border-purple-200 dark:border-purple-800 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          AI 正在分析你的聊天记录，生成个性化报告…
        </p>
        <p className="text-xs text-gray-400">通常需要 5-15 秒</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            想知道这局表现如何吗？
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          AI 会基于你这一整局的完整对话，给出一份客观的恋爱解读报告，
          <br />
          指出你的优势和可以改进的地方。
        </p>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
            {error}
          </p>
        )}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {error ? '重新生成报告' : '生成解读报告'}
        </Button>
        {!canGenerate && (
          <p className="text-xs text-gray-400">
            （记录保存中，请稍候…）
          </p>
        )}
      </div>
    </Card>
  );
}
