'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Heart,
  MessageCircle,
  RefreshCw,
  Trophy,
  XCircle,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Mic,
  MicOff,
  Play,
  Volume2,
  BookOpen,
  User,
  LogOut,
  History
} from 'lucide-react';

interface Scenario {
  id: number;
  title: string;
  description: string;
  opening_message: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reason?: string;
  moodChange?: number;
  audioUrl?: string;
}

interface ReviewData {
  summary: string;
  mistakes: string[];
  goodPoints: string[];
  advice: string;
  nextStatus: 'next_wave' | 'won';
}

type GameState =
  | 'gender_select'
  | 'selecting'
  | 'playing'
  | 'review'
  | 'won'
  | 'lost';

export default function CoaxGame() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(
    null
  );
  const [gameState, setGameState] = useState<GameState>('gender_select');
  const [playerGender, setPlayerGender] = useState<'boyfriend' | 'girlfriend'>(
    'boyfriend'
  );
  const [voiceType, setVoiceType] = useState<string>('gentle_female');
  const [showVoiceSelection, setShowVoiceSelection] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<number | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMood, setCurrentMood] = useState(20);
  const [currentWave, setCurrentWave] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [roundReasons, setRoundReasons] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [gameRecordSaved, setGameRecordSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchScenarios();
  }, []);

  // 检查用户登录状态
  useEffect(() => {
    // 从 localStorage 读取用户信息（仅在客户端）
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
    setCheckingAuth(false);
  }, []);

  // 处理退出登录
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

  // 检查浏览器是否支持语音识别
  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSpeechSupported(supported);
    console.log('浏览器语音识别支持状态:', supported);
  }, []);

  // 预警系统：情绪值 < 30 时触发
  useEffect(() => {
    if (currentMood < 30 && gameState === 'playing' && !showWarning) {
      setShowWarning(true);
      playWarningSound();
    } else if (currentMood >= 30) {
      setShowWarning(false);
    }
  }, [currentMood, gameState, showWarning]);

  const playWarningSound = () => {
    try {
      // 使用 Web Audio API 生成预警音效
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('音频生成失败:', error);
    }
  };

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios');
      const data = await response.json();
      if (data.success) {
        setScenarios(data.data);
      }
    } catch (error) {
      console.error('获取场景列表失败:', error);
    }
  };

  // 语音识别功能
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器。');
      return;
    }

    const SpeechRecognitionClass = (window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onstart: () => void;
        onresult: (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
        onerror: (event: { error: string }) => void;
        onend: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onstart: () => void;
        onresult: (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
        onerror: (event: { error: string }) => void;
        onend: () => void;
        start: () => void;
      };
    }).SpeechRecognition || (window as unknown as {
      webkitSpeechRecognition: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onstart: () => void;
        onresult: (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
        onerror: (event: { error: string }) => void;
        onend: () => void;
        start: () => void;
      };
    }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器。');
      return;
    }

    const recognition = new SpeechRecognitionClass();

    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('无法访问麦克风，请检查浏览器权限设置。');
      } else if (event.error === 'network') {
        alert('语音识别暂时不可用。这可能是沙箱环境的限制。在真实浏览器环境中，语音识别功能可以正常使用。您可以使用键盘输入代替。');
      } else {
        alert(`语音识别出错: ${event.error}。请稍后重试或使用键盘输入。`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
  };

  // 生成TTS语音
  const generateTTS = async (text: string, mood: number) => {
    try {
      console.log('开始生成TTS:', { text, mood, voiceType });
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          speaker: voiceType,
          moodScore: mood
        })
      });

      const data = await response.json();
      console.log('TTS响应:', data);
      if (data.success && data.data) {
        console.log('TTS音频URL:', data.data.audioUri);
        return data.data.audioUri;
      } else {
        console.error('TTS失败:', data.error);
      }
    } catch (error) {
      console.error('TTS生成失败:', error);
    }
    return null;
  };

  // 播放音频
  const playAudio = (audioUrl: string, messageIndex: number) => {
    // 停止当前播放的音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => {
      setIsPlayingAudio(messageIndex);
    };

    audio.onended = () => {
      setIsPlayingAudio(null);
    };

    audio.onerror = () => {
      setIsPlayingAudio(null);
      console.error('音频播放失败');
    };

    audio.play();
  };

  const startGame = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    const openingMessage = { role: 'assistant' as const, content: scenario.opening_message };
    setMessages([openingMessage]);
    setCurrentMood(20);
    setCurrentWave(1);
    setCurrentRound(1);
    setRoundReasons([]);
    setGameState('playing');
    setInputMessage('');
    setShowWarning(false);

    // 为开场白生成TTS
    const audioUrl = await generateTTS(scenario.opening_message, 20);
    if (audioUrl) {
      setMessages([{ ...openingMessage, audioUrl }]);
    }
  };

  const resetGame = () => {
    // 停止正在播放的音频
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(null);
    setShowVoiceSelection(false);

    setGameState('gender_select');
    setSelectedScenario(null);
    setMessages([]);
    setCurrentMood(20);
    setCurrentWave(1);
    setCurrentRound(1);
    setRoundReasons([]);
    setReviewData(null);
    setInputMessage('');
    setShowWarning(false);
    setGameRecordSaved(false);
  };

  const startNextWave = () => {
    setGameState('playing');
    setCurrentWave((prev) => prev + 1);
    setCurrentRound(1);
    setRoundReasons([]);
    setReviewData(null);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    const updatedMessages = [
      ...messages,
      { role: 'user' as const, content: userMessage }
    ];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          moodScore: currentMood,
          currentWave,
          currentRound,
          scenario: selectedScenario,
          conversationHistory: messages.slice(1),
          roundReasons,
          playerGender
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          role: 'assistant' as const,
          content: data.data.reply,
          reason: data.data.reason,
          moodChange: data.data.moodChange
        };

        const newMessages = [
          ...updatedMessages,
          assistantMessage
        ];
        setMessages(newMessages);
        setCurrentMood(data.data.moodScore);

        // 为AI回复生成TTS
        const audioUrl = await generateTTS(data.data.reply, data.data.moodScore);
        if (audioUrl) {
          setMessages([
            ...updatedMessages,
            { ...assistantMessage, audioUrl }
          ]);
        }

        // 保存理由用于复盘
        setRoundReasons([...roundReasons, data.data.reason]);

        // 判断游戏状态
        if (data.data.waveStatus === 'won') {
          await saveGameRecord('won');
          setGameState('won');
        } else if (data.data.waveStatus === 'lost') {
          await saveGameRecord('lost');
          setGameState('lost');
        } else if (data.data.waveStatus === 'review') {
          // 波段结束，进入复盘
          handleWaveEnd();
        } else {
          // 继续下一轮
          setCurrentRound((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: '抱歉，出了点问题，请重试。' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaveEnd = async () => {
    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenario: selectedScenario,
          currentWave,
          moodScore: currentMood,
          roundReasons,
          playerGender
        })
      });

      const data = await response.json();

      if (data.success) {
        setReviewData(data.data);
        setGameState('review');
      }
    } catch (error) {
      console.error('复盘失败:', error);
      // 复盘失败时直接进入下一波
      setReviewData({
        summary: '本波段已结束',
        mistakes: [],
        goodPoints: [],
        advice: '继续加油',
        nextStatus: currentMood >= 80 ? 'won' : 'next_wave'
      });
      setGameState('review');
    }
  };

  // 保存游戏记录
  const saveGameRecord = async (result: 'won' | 'lost') => {
    if (!user) return; // 未登录用户不保存记录
    if (gameRecordSaved) return; // 已保存则不重复保存

    try {
      const response = await fetch('/api/game-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          scenario: selectedScenario?.title || '未知场景',
          finalScore: currentMood,
          result
        })
      });

      const data = await response.json();
      if (data.success) {
        setGameRecordSaved(true);
        console.log('游戏记录已保存');
      }
    } catch (error) {
      console.error('保存游戏记录失败:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMoodText = () => {
    if (currentMood >= 80) return '开心';
    if (currentMood >= 60) return '还好';
    if (currentMood >= 40) return '生气';
    if (currentMood >= 20) return '很生气';
    return '非常生气';
  };

  // 性别选择页面
  if (gameState === 'gender_select') {
    // 声音选择界面
    if (showVoiceSelection) {
      const voiceOptions = playerGender === 'boyfriend'
        ? [
            { id: 'gentle_female', name: '温柔女声', icon: '👩', desc: '温柔甜美，自然流畅' },
            { id: 'cool_female', name: '活泼女声', icon: '🎀', desc: '活力满满，生动有趣' },
            { id: 'charming_female', name: '魅力御姐', icon: '💋', desc: '成熟魅力，知性优雅' }
          ]
        : [
            { id: 'gentle_male', name: '温柔男声', icon: '👨', desc: '温和亲切，自然稳重' },
            { id: 'deep_male', name: '磁性男声', icon: '🎩', desc: '深沉有磁性，成熟可靠' }
          ];

      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4 relative">
          <HeartBackground />
          <div className="w-full max-w-lg relative z-10">
            <Button
              variant="ghost"
              onClick={() => setShowVoiceSelection(false)}
              className="mb-4"
            >
              ← 返回选择角色
            </Button>

            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                选择对方的声音
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                不同的声音会带来不同的沉浸体验
              </p>
            </div>

            <div className="space-y-3">
              {voiceOptions.map((voice) => (
                <Card
                  key={voice.id}
                  className={`p-4 cursor-pointer hover:shadow-lg transition-all duration-300 ${
                    voiceType === voice.id
                      ? 'border-2 border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                      : 'border-2 border-pink-200 dark:border-pink-900'
                  }`}
                  onClick={() => {
                    setVoiceType(voice.id);
                    setGameState('selecting');
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-pink-100 dark:bg-pink-900 rounded-full p-3 text-3xl">
                      {voice.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {voice.name}
                        </h3>
                        {voiceType === voice.id && (
                          <Volume2 className="w-5 h-5 text-pink-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {voice.desc}
                      </p>
                    </div>
                    <Play className="w-5 h-5 text-gray-400" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 性别选择界面
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4 relative">
        <HeartBackground />
        
        {/* 右上角用户区域 */}
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
                  onClick={() => {
                    window.location.href = '/login';
                  }}
                  className="border-2 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 h-8"
                >
                  登录
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = '/register';
                  }}
                  className="border-2 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400 h-8"
                >
                  注册
                </Button>
              </div>
            </Card>
          )}
        </div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              哄哄模拟器 v2.0
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              选择你的角色，开始情感修行之旅
            </p>
          </div>

          <div className="mb-4">
            <Button
              variant="outline"
              className="w-full border-2 border-pink-300 dark:border-pink-700 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all duration-300"
              onClick={() => {
                window.location.href = '/blog';
              }}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              💕 恋爱攻略
            </Button>
          </div>

          <div className="mb-4">
            <Button
              variant="outline"
              className="w-full border-2 border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-300"
              onClick={() => {
                window.location.href = '/leaderboard';
              }}
            >
              <Trophy className="w-5 h-5 mr-2" />
              🏆 排行榜
            </Button>
          </div>

          <div className="grid gap-4">
            <Card
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-blue-200 dark:border-blue-900"
              onClick={() => {
                setPlayerGender('boyfriend');
                setVoiceType('gentle_female');
                setShowVoiceSelection(true);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
                  <span className="text-2xl">👨</span>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">
                    我是男朋友
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    哄生气的女朋友
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-pink-200 dark:border-pink-900"
              onClick={() => {
                setPlayerGender('girlfriend');
                setVoiceType('gentle_male');
                setShowVoiceSelection(true);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-pink-100 dark:bg-pink-900 rounded-full p-3">
                  <span className="text-2xl">👩</span>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-1">
                    我是女朋友
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    哄生气的男朋友
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 场景选择页面
  if (gameState === 'selecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4 relative">
        <HeartBackground />
        
        {/* 右上角用户区域 */}
        <div className="fixed top-4 right-4 z-50">
          {user && (
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
          )}
        </div>
        
        <div className="w-full max-w-3xl relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              哄哄模拟器 v2.0
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              选择一个场景，开始你的情感修行之旅
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              ⏱️ 预计时长：6-8分钟 | 🎮 三轮一波段
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {scenarios.map((scenario) => (
              <Card
                key={scenario.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 border-pink-200 dark:border-pink-900"
                onClick={() => startGame(scenario)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-pink-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {scenario.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                  {scenario.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 复盘页面
  if (gameState === 'review' && reviewData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex items-center justify-center p-4 relative">
        <HeartBackground />
        
        {/* 右上角用户区域 */}
        <div className="fixed top-4 right-4 z-50">
          {user && (
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
          )}
        </div>
        
        <Card className="max-w-2xl w-full p-8 border-2 border-blue-200 dark:border-blue-900 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                第 {currentWave} 波段复盘
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                当前情绪值：{currentMood}/100
              </p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                表现总结
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {reviewData.summary}
              </p>
            </div>

            {reviewData.mistakes.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  踩雷点
                </h3>
                <ul className="space-y-1">
                  {reviewData.mistakes.map((mistake, index) => (
                    <li
                      key={index}
                      className="text-sm text-red-600 dark:text-red-300"
                    >
                      • {mistake}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviewData.goodPoints.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  加分点
                </h3>
                <ul className="space-y-1">
                  {reviewData.goodPoints.map((point, index) => (
                    <li
                      key={index}
                      className="text-sm text-green-600 dark:text-green-300"
                    >
                      • {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                建议
              </h3>
              <p className="text-gray-700 dark:text-gray-300 italic">
                &ldquo;{reviewData.advice}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {reviewData.nextStatus === 'won' ? (
              <Button
                onClick={() => setGameState('won')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                查看通关结果
              </Button>
            ) : (
              <Button
                onClick={startNextWave}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                进入第 {currentWave + 1} 波段
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // 游戏进行中页面
  if (gameState === 'playing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 flex flex-col relative">
        <HeartBackground />
        
        {/* 右上角用户区域 */}
        <div className="fixed top-4 right-4 z-50">
          {user && (
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
          )}
        </div>
        
        {/* Header */}
        <div
          className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b transition-colors duration-300 relative z-10 ${
            showWarning ? 'border-red-500' : 'border-pink-200 dark:border-pink-900'
          } p-4`}
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedScenario?.title}
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    第 {currentWave} 波段 · 第 {currentRound}/3 轮
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedScenario?.description}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetGame}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重新开始
              </Button>
            </div>

            {/* 预警提示 */}
            {showWarning && (
              <Alert className="mb-4 bg-red-50 dark:bg-red-900/20 border-red-500">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-600 dark:text-red-400 font-medium">
                  ⚠️ 警告：情绪值过低！注意你的言辞，不要踩雷！
                </AlertDescription>
              </Alert>
            )}

            {/* Mood Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {playerGender === 'boyfriend' ? '女友情绪值' : '男友情绪值'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl text-gray-900 dark:text-white">
                    {currentMood}
                  </span>
                  <Badge variant="outline">{getMoodText()}</Badge>
                </div>
              </div>
              <Progress value={currentMood} className="h-3" />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0 (生气)</span>
                <span>20 (初始)</span>
                <span>50 (平复)</span>
                <span>80 (开心)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 relative z-10">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <PartnerAvatar gender={playerGender} />
                )}
                <div className="max-w-[75%]">
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-pink-500 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-pink-200 dark:border-pink-900'
                    } ${
                      message.role === 'assistant' && message.audioUrl
                        ? 'cursor-pointer hover:shadow-md transition-shadow'
                        : ''
                    }`}
                    onClick={() => {
                      if (message.role === 'assistant' && message.audioUrl) {
                        playAudio(message.audioUrl!, index);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-1">{message.content}</span>
                      {message.role === 'assistant' && message.audioUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(message.audioUrl!, index);
                          }}
                          className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                            isPlayingAudio === index
                              ? 'bg-pink-500 text-white'
                              : 'text-gray-400 hover:text-pink-500'
                          }`}
                        >
                          {isPlayingAudio === index ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {message.role === 'assistant' && message.reason && (
                    <div
                      className={`mt-2 text-xs p-2 rounded-lg ${
                        message.moodChange && message.moodChange > 0
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {message.moodChange && (
                        <span className="font-bold mr-2">
                          {message.moodChange > 0 ? '+' : ''}
                          {message.moodChange} 分
                        </span>
                      )}
                      {message.reason}
                    </div>
                  )}
                </div>
                {message.role === 'user' && <UserAvatar />}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <PartnerAvatar gender={playerGender} />
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-pink-200 dark:border-pink-900">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-t border-pink-200 dark:border-pink-900 p-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入你的回复，尝试哄哄对方..."
                className="min-h-[60px] resize-none border-pink-200 dark:border-pink-900 focus:border-pink-500 dark:focus:border-pink-500"
                disabled={isLoading || gameState !== 'playing'}
              />
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || gameState !== 'playing' || !isSpeechSupported}
                variant={isListening ? 'default' : 'outline'}
                className="px-4"
                style={{
                  backgroundColor: isListening ? '#ef4444' : undefined,
                  borderColor: isListening ? '#ef4444' : undefined,
                  opacity: !isSpeechSupported ? 0.5 : 1
                }}
                title={!isSpeechSupported ? '您的浏览器不支持语音识别功能' : '点击开始语音输入'}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span className="sr-only">停止录音</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span className="sr-only">开始录音</span>
                  </>
                )}
              </Button>
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || gameState !== 'playing'}
                className="px-6 bg-pink-500 hover:bg-pink-600 text-white"
              >
                发送
              </Button>
            </div>
            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
                <Mic className="w-4 h-4 animate-pulse" />
                <span>正在录音中... 请说话</span>
              </div>
            )}
            {!isSpeechSupported && gameState === 'playing' && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>ℹ️ 语音输入功能在当前环境中不可用，请使用键盘输入</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 胜利页面
  if (gameState === 'won') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-emerald-950 dark:to-gray-900 flex items-center justify-center p-4 relative">
        <HeartBackground />
        
        {/* 右上角用户区域 */}
        <div className="fixed top-4 right-4 z-50">
          {user && (
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
          )}
        </div>
        
        <Card className="max-w-md w-full p-8 text-center border-2 border-green-200 dark:border-green-900 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 dark:bg-green-900 rounded-full p-4">
              <Trophy className="w-16 h-16 text-green-500" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            恭喜你！
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            你成功哄好了{playerGender === 'boyfriend' ? '女友' : '男友'}！情绪值达到了 {currentMood} 分。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">
            &ldquo;{messages[messages.length - 1]?.content}&rdquo;
          </p>
          
          {user && gameRecordSaved && (
            <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                游戏记录已保存
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button
              onClick={resetGame}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              再玩一次
            </Button>
            
            {user && (
              <Button
                variant="outline"
                onClick={() => window.location.href = '/profile'}
                className="w-full border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30"
              >
                <History className="w-4 h-4 mr-2" />
                查看历史记录
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // 失败页面
  if (gameState === 'lost') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-red-950 dark:to-gray-900 flex items-center justify-center p-4 relative">
        <HeartBackground />
        
        {/* 右上角用户区域 */}
        <div className="fixed top-4 right-4 z-50">
          {user && (
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
          )}
        </div>
        
        <Card className="max-w-md w-full p-8 text-center border-2 border-red-200 dark:border-red-900 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 dark:bg-red-900 rounded-full p-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            游戏失败
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {playerGender === 'boyfriend' ? '女友' : '男友'}彻底生气离开了，情绪值降到了 {currentMood} 分。
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">
            &ldquo;{messages[messages.length - 1]?.content}&rdquo;
          </p>
          
          {user && gameRecordSaved && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                游戏记录已保存
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <Button
              onClick={resetGame}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              再试一次
            </Button>
            
            {user && (
              <Button
                variant="outline"
                onClick={() => window.location.href = '/profile'}
                className="w-full border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <History className="w-4 h-4 mr-2" />
                查看历史记录
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return null;
}

// 爱心背景动画组件
function HeartBackground() {
  // 使用useState生成固定的随机值
  const [hearts] = useState(() =>
    Array.from({ length: 15 }, () => ({
      left: Math.random() * 100,
      fontSize: Math.random() * 20 + 10,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 10
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
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
        .heart-bubble {
          position: absolute;
          bottom: -20px;
          animation: float linear infinite;
        }
      `}</style>
      {hearts.map((heart, i) => (
        <div
          key={i}
          className="heart-bubble text-pink-300 dark:text-pink-700"
          style={{
            left: `${heart.left}%`,
            fontSize: `${heart.fontSize}px`,
            animationDuration: `${heart.duration}s`,
            animationDelay: `${heart.delay}s`
          }}
        >
          ♥
        </div>
      ))}
      {/* 大爱心水印 */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-pink-100 dark:text-pink-900/20"
        style={{ fontSize: '500px', opacity: 0.3 }}
      >
        ♥
      </div>
    </div>
  );
}

// 对方头像（可爱卡通头像）
function PartnerAvatar({ gender }: { gender: 'boyfriend' | 'girlfriend' }) {
  if (gender === 'girlfriend') {
    // 现代帅气男孩头像
    return (
      <svg
        className="w-10 h-10 flex-shrink-0"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 渐变背景 */}
        <defs>
          <linearGradient id="boyBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="100%" stopColor="#764ba2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#boyBg)" />
        {/* 头发 */}
        <ellipse cx="50" cy="32" rx="32" ry="28" fill="#2C3E50" />
        <ellipse cx="22" cy="40" rx="10" ry="18" fill="#2C3E50" />
        <ellipse cx="78" cy="40" rx="10" ry="18" fill="#2C3E50" />
        {/* 脸部 */}
        <ellipse cx="50" cy="58" rx="28" ry="30" fill="#FFE4C9" />
        {/* 眉毛 */}
        <path d="M 38 50 Q 42 48 46 50" stroke="#2C3E50" strokeWidth="2" fill="none" />
        <path d="M 54 50 Q 58 48 62 50" stroke="#2C3E50" strokeWidth="2" fill="none" />
        {/* 眼睛 */}
        <ellipse cx="42" cy="56" rx="6" ry="7" fill="#2C3E50" />
        <ellipse cx="58" cy="56" rx="6" ry="7" fill="#2C3E50" />
        <circle cx="44" cy="54" r="2" fill="#FFFFFF" />
        <circle cx="60" cy="54" r="2" fill="#FFFFFF" />
        {/* 鼻子 */}
        <ellipse cx="50" cy="64" rx="2" ry="3" fill="#DEB887" />
        {/* 嘴巴 */}
        <path
          d="M 44 72 Q 50 78 56 72"
          stroke="#E74C3C"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* 腮红 */}
        <ellipse cx="36" cy="64" rx="5" ry="3" fill="#FFB6C1" opacity="0.4" />
        <ellipse cx="64" cy="64" rx="5" ry="3" fill="#FFB6C1" opacity="0.4" />
        {/* ta 文字（蓝色） */}
        <text x="50" y="95" fontSize="18" fontWeight="bold" fill="#3B82F6" textAnchor="middle">
          ta
        </text>
      </svg>
    );
  }

  // 现代漂亮女孩头像
  return (
    <svg
      className="w-10 h-10 flex-shrink-0"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 渐变背景 */}
      <defs>
        <linearGradient id="girlBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f093fb" />
          <stop offset="100%" stopColor="#f5576c" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#girlBg)" />
      {/* 头发 */}
      <ellipse cx="50" cy="30" rx="30" ry="26" fill="#8B4513" />
      <ellipse cx="50" cy="26" rx="26" ry="18" fill="#A0522D" />
      {/* 刘海 */}
      <ellipse cx="35" cy="38" rx="9" ry="14" fill="#8B4513" />
      <ellipse cx="65" cy="38" rx="9" ry="14" fill="#8B4513" />
      <ellipse cx="50" cy="40" rx="7" ry="11" fill="#8B4513" />
      {/* 脸部 */}
      <ellipse cx="50" cy="60" rx="26" ry="28" fill="#FFE4C9" />
      {/* 眉毛 */}
      <path d="M 40 52 Q 44 50 48 52" stroke="#5D4E37" strokeWidth="1.5" fill="none" />
      <path d="M 52 52 Q 56 50 60 52" stroke="#5D4E37" strokeWidth="1.5" fill="none" />
      {/* 眼睛 */}
      <ellipse cx="42" cy="57" rx="6" ry="7" fill="#2C3E50" />
      <ellipse cx="58" cy="57" rx="6" ry="7" fill="#2C3E50" />
      <circle cx="44" cy="55" r="2" fill="#FFFFFF" />
      <circle cx="60" cy="55" r="2" fill="#FFFFFF" />
      {/* 睫毛 */}
      <path d="M 36 53 L 34 51" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" />
      <path d="M 48 53 L 50 51" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" />
      <path d="M 50 53 L 50 51" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" />
      <path d="M 52 53 L 50 51" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" />
      <path d="M 64 53 L 66 51" stroke="#2C3E50" strokeWidth="2" strokeLinecap="round" />
      {/* 鼻子 */}
      <ellipse cx="50" cy="65" rx="2" ry="2.5" fill="#DEB887" />
      {/* 嘴巴 */}
      <path
        d="M 46 73 Q 50 77 54 73"
        stroke="#E74C3C"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* 腮红 */}
      <ellipse cx="38" cy="67" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
      <ellipse cx="62" cy="67" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
      {/* 头花 */}
      <circle cx="68" cy="32" r="6" fill="#FF69B4" />
      <circle cx="68" cy="32" r="3" fill="#FFB6C1" />
      <circle cx="72" cy="28" r="4" fill="#FF69B4" opacity="0.8" />
      {/* ta 文字（红色） */}
      <text x="50" y="95" fontSize="18" fontWeight="bold" fill="#EF4444" textAnchor="middle">
        ta
      </text>
    </svg>
  );
}

// 用户头像（可爱卡通头像）
function UserAvatar() {
  return (
    <svg
      className="w-10 h-10 flex-shrink-0"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 渐变背景 */}
      <defs>
        <linearGradient id="userBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#userBg)" />
      {/* 头发 */}
      <ellipse cx="50" cy="32" rx="30" ry="26" fill="#5D4E37" />
      <ellipse cx="50" cy="28" rx="26" ry="18" fill="#6B5E52" />
      {/* 刘海 */}
      <ellipse cx="35" cy="38" rx="9" ry="14" fill="#5D4E37" />
      <ellipse cx="65" cy="38" rx="9" ry="14" fill="#5D4E37" />
      <ellipse cx="50" cy="40" rx="7" ry="11" fill="#5D4E37" />
      {/* 脸部 */}
      <ellipse cx="50" cy="60" rx="26" ry="28" fill="#FFE4C9" />
      {/* 眉毛 */}
      <path d="M 40 52 Q 44 50 48 52" stroke="#5D4E37" strokeWidth="1.5" fill="none" />
      <path d="M 52 52 Q 56 50 60 52" stroke="#5D4E37" strokeWidth="1.5" fill="none" />
      {/* 眼睛 */}
      <ellipse cx="42" cy="57" rx="6" ry="7" fill="#2C3E50" />
      <ellipse cx="58" cy="57" rx="6" ry="7" fill="#2C3E50" />
      <circle cx="44" cy="55" r="2" fill="#FFFFFF" />
      <circle cx="60" cy="55" r="2" fill="#FFFFFF" />
      {/* 鼻子 */}
      <ellipse cx="50" cy="65" rx="2" ry="2.5" fill="#DEB887" />
      {/* 微笑 */}
      <path
        d="M 46 73 Q 50 77 54 73"
        stroke="#E74C3C"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* 腮红 */}
      <ellipse cx="38" cy="67" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
      <ellipse cx="62" cy="67" rx="6" ry="4" fill="#FFB6C1" opacity="0.5" />
      {/* ta 文字（使用用户性别对应的颜色，这里默认用蓝色表示男性用户） */}
      <text x="50" y="95" fontSize="18" fontWeight="bold" fill="#3B82F6" textAnchor="middle">
        ta
      </text>
    </svg>
  );
}
