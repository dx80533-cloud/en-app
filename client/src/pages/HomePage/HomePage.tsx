import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { logger } from '@client/src/lib/logger';
import {
  Flame,
  BookOpen,
  Target,
  Trophy,
  Play,
  Zap,
  Clock,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Award,
  Palette,
  Check,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { statsApi } from '@/api';
import { learningApi } from '@/api';
import { useTheme } from '@/hooks/useTheme';
import { THEMES, type ThemeType } from '@shared/api.interface';
import type { UserStats } from '@shared/api.interface';
import type { QuizRecord } from '@/api/stats';
import type { DailyGoal } from '@/api/learning';
import { xpToLevel, levelProgress, xpForNextLevel } from '@/utils/level';

const HomePage: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal | null>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<QuizRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme, themes } = useTheme();

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        const [statsData, dailyGoalData, quizzesData] = await Promise.all([
          statsApi.getOverview(),
          learningApi.getDailyGoal(),
          statsApi.getRecentQuizzes(3),
        ]);
        setStats(statsData);
        setDailyGoal(dailyGoalData);
        setRecentQuizzes(quizzesData);
      } catch (err) {
        logger.error('HomePage load error', JSON.stringify(err));
        setError('載入失敗，請稍後再試');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const correctRate = stats
    ? stats.totalCorrect + stats.totalWrong > 0
      ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalWrong)) * 100)
      : 0
    : 0;

  const dailyProgress = dailyGoal
    ? Math.min(100, Math.round((dailyGoal.reviewedToday / dailyGoal.dailyGoal) * 100))
    : 0;

  const formatDate = (dateStr: string): string => {
    const date: Date = new Date(dateStr);
    const month: number = date.getMonth() + 1;
    const day: number = date.getDate();
    return `${month}/${day}`;
  };

  const statCards = [
    {
      icon: Flame,
      label: '連續學習',
      value: stats?.streakDays ?? 0,
      unit: '天',
      color: 'from-orange-400 to-rose-500',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
    {
      icon: BookOpen,
      label: '已學單字',
      value: stats?.totalStudied ?? 0,
      unit: '個',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
    },
    {
      icon: Target,
      label: '答對率',
      value: correctRate,
      unit: '%',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
    {
      icon: Trophy,
      label: '測驗次數',
      value: stats?.totalQuizzes ?? 0,
      unit: '次',
      color: 'from-amber-400 to-orange-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-6 page-enter">
        <div className="mx-auto max-w-2xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i: number) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 page-enter">
        <Card className="w-full max-w-sm rounded-2xl">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button
              className="mt-4 rounded-xl"
              onClick={() => window.location.reload()}
            >
              重新載入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6 page-enter">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* 歡迎標題 + 等級進度 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-warning" />
            <h1 className="bg-gradient-to-r from-primary via-accent to-destructive bg-clip-text text-2xl font-bold text-transparent">
              今日也要加油！
            </h1>
          </div>

          <Card className="overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-primary via-accent to-destructive shadow-md">
            <CardContent className="p-5 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">等級 {stats ? xpToLevel(stats.xp) : 1}</p>
                  <p className="text-3xl font-bold">
                    {stats?.xp ?? 0} <span className="text-lg font-normal opacity-80">XP</span>
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <Award className="h-7 w-7" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xs opacity-80">
                  <span>升級進度</span>
                  <span>
                    {stats ? levelProgress(stats.xp) : 0} /{' '}
                    {stats ? xpForNextLevel(stats.xp) : 100} XP
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: stats
                        ? `${(levelProgress(stats.xp) / xpForNextLevel(stats.xp)) * 100}%`
                        : '0%',
                    }}
                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    className="h-full rounded-full bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 四大統計卡片 */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-3"
        >
          {statCards.map((card, index: number) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} variants={item}>
                <Card className="rounded-2xl border-0 bg-card shadow-sm transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-${card.iconColor?.split('-')[1]}-500/10`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {card.value}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {card.unit}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 今日任務 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="rounded-2xl border-0 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Target className="h-5 w-5 text-primary" />
                今日任務
              </CardTitle>
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
                {dailyGoal?.dailyGoal ?? 20} 題
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">學習進度</span>
                  <span className="font-medium text-foreground">
                    {dailyGoal?.reviewedToday ?? 0} / {dailyGoal?.dailyGoal ?? 20}
                  </span>
                </div>
                <Progress value={dailyProgress} className="h-2.5" />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span>答對 {dailyGoal?.correctToday ?? 0} 題</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-warning" />
                  <span>獲得 {dailyGoal?.xpToday ?? 0} XP</span>
                </div>
              </div>
              <Button asChild size="lg" className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg">
                <Link to="/learn">
                  <Play className="h-5 w-5" />
                  開始學習
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* 快速行動 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
           <Button
             asChild
             variant="outline"
             className="h-28 flex-col items-start gap-2 rounded-2xl border-0 bg-gradient-to-br from-primary/10 to-accent/10 p-4 text-left shadow-sm hover:shadow-md"
           >
             <Link to="/learn" className="w-full">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                 <BookOpen className="h-5 w-5" />
               </div>
               <div>
                 <p className="text-base font-semibold text-foreground">開始練習</p>
                 <p className="text-xs text-muted-foreground">多題型互動學習</p>
               </div>
             </Link>
           </Button>
           <Button
             asChild
             variant="outline"
             className="h-28 flex-col items-start gap-2 rounded-2xl border-0 bg-gradient-to-br from-warning/10 to-accent/10 p-4 text-left shadow-sm hover:shadow-md"
           >
             <Link to="/quiz" className="w-full">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning text-warning-foreground">
                 <Trophy className="h-5 w-5" />
               </div>
               <div>
                 <p className="text-base font-semibold text-foreground">挑戰測驗</p>
                 <p className="text-xs text-muted-foreground">檢驗學習成果</p>
               </div>
             </Link>
           </Button>
        </motion.div>

        {/* 風格主題選擇 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Card className="rounded-2xl border-0 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Palette className="h-5 w-5 text-accent" />
                風格主題
              </CardTitle>
              <Badge variant="secondary" className="rounded-full bg-accent/10 text-accent">
                6 種風格
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {themes.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={[
                      'group relative flex flex-col items-start gap-2 rounded-xl p-3 text-left transition-all duration-200',
                      'hover:-translate-y-0.5 hover:shadow-md',
                      isActive
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'ring-1 ring-border',
                    ].join(' ')}
                  >
                    {isActive && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {/* 色票預覽 */}
                    <div className="flex h-10 w-full items-stretch gap-0.5 overflow-hidden rounded-lg">
                      {t.previewColors.map((color, i: number) => (
                        <div
                          key={i}
                          className="flex-1 transition-transform group-hover:scale-110"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="w-full">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <span>{t.emoji}</span>
                        <span>{t.name}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* 最近測驗記錄 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="rounded-2xl border-0 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                最近測驗
              </CardTitle>
              <Link
                to="/quiz"
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                查看全部 <ChevronRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentQuizzes.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  還沒有測驗記錄，快去挑戰吧！
                </div>
              ) : (
                recentQuizzes.map((quiz: QuizRecord) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between rounded-xl bg-muted p-3 transition-colors hover:bg-muted/80"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-success-foreground ${
                          quiz.score >= 80
                            ? 'bg-success'
                            : quiz.score >= 60
                              ? 'bg-warning'
                              : 'bg-destructive'
                        }`}
                      >
                        {quiz.score}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{quiz.bank}</p>
                        <p className="text-xs text-muted-foreground">
                          {quiz.totalQuestions} 題 · 答對 {quiz.correctCount} 題
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{formatDate(quiz.createdAt)}</p>
                      <p className="text-xs text-warning">+{quiz.xpEarned} XP</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
