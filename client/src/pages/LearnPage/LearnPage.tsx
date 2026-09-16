import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@client/src/lib/logger';
import { BookOpen, Layers, ArrowLeft, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

import { learningApi } from '@/api';
import type { VocabWordWithProgress } from '@shared/api.interface';
import { QuizMode, FlashcardMode, CompleteScreen } from './LearnModes';

type Mode = 'quiz' | 'flashcard';

const BANK_OPTIONS = [
  { value: 'all', label: '全部字庫', bank: undefined, level: undefined },
  { value: 'gept-beginner', label: 'GEPT 初級', bank: 'gept', level: '初級' },
  { value: 'gept-intermediate', label: 'GEPT 中級', bank: 'gept', level: '中級' },
  { value: 'gept-high', label: 'GEPT 中高級', bank: 'gept', level: '中高級' },
  { value: 'toeic', label: 'TOEIC', bank: 'toeic', level: undefined },
  { value: 'ielts', label: 'IELTS', bank: 'ielts', level: undefined },
];

const LearnPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('quiz');
  const [bank, setBank] = useState('all');
  const [words, setWords] = useState<VocabWordWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [resultStats, setResultStats] = useState({ correct: 0, total: 0, xp: 0 });

  const loadWords = async (selectedBank: string): Promise<void> => {
    try {
      setLoading(true);
      setCompleted(false);
      const option = BANK_OPTIONS.find((o) => o.value === selectedBank);
      const data: VocabWordWithProgress[] = await learningApi.getDueWords({
        limit: 20,
        mode: 'all',
        bank: option?.bank,
        level: option?.level,
      });
      setWords(data);
      setError(null);
    } catch (err) {
      logger.error('LearnPage loadWords error', JSON.stringify(err));
      setError('載入單字失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords(bank);
  }, [bank]);

  const handleBankChange = (value: string): void => {
    setBank(value);
  };

  const handleModeChange = (value: string): void => {
    setMode(value as Mode);
    setCompleted(false);
  };

  const handleQuizComplete = (correct: number, total: number, xp: number): void => {
    setResultStats({ correct, total, xp });
    setCompleted(true);
  };

  const handleFlashcardComplete = (known: number, total: number): void => {
    setResultStats({ correct: known, total, xp: known * 5 });
    setCompleted(true);
  };

  const handleRestart = (): void => {
    loadWords(bank);
  };

  return (
<>
      <div className="page-enter min-h-screen bg-background px-4 py-4 md:px-6">
        <div className="mx-auto max-w-2xl">
          {/* 頂部控制列 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">學習練習</h1>
              <div className="w-9" />
            </div>

            <div className="flex items-center gap-3">
              <Select value={bank} onValueChange={handleBankChange}>
                <SelectTrigger className="flex-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANK_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* 模式切換 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-4"
          >
            <Tabs
              value={mode}
              onValueChange={handleModeChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                <TabsTrigger
                  value="quiz"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <BookOpen className="h-4 w-4" />
                  問答模式
                </TabsTrigger>
                <TabsTrigger
                  value="flashcard"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Layers className="h-4 w-4" />
                  閃卡模式
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* 內容區 */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          ) : error ? (
  <Card className="rounded-2xl border-0 bg-card shadow-sm">
               <CardContent className="py-10 text-center">
                 <p className="text-destructive">{error}</p>
                <Button
                  className="mt-4 rounded-xl"
                  onClick={() => loadWords(bank)}
                >
                  <RotateCcw className="h-4 w-4" />
                  重新載入
                </Button>
              </CardContent>
            </Card>
          ) : words.length === 0 ? (
  <Card className="rounded-2xl border-0 bg-card shadow-sm">
               <CardContent className="py-10 text-center">
                 <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                   <BookOpen className="h-8 w-8 text-success" />
                 </div>
                 <p className="font-medium text-foreground">今日沒有待複習的單字</p>
                 <p className="mt-1 text-sm text-muted-foreground">
                  太棒了！你已經完成所有複習
                </p>
                <Button
                  className="mt-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground"
                  onClick={() => navigate('/')}
                >
                  返回首頁
                </Button>
              </CardContent>
            </Card>
          ) : completed ? (
            <CompleteScreen
              correct={resultStats.correct}
              total={resultStats.total}
              xp={resultStats.xp}
              onRestart={handleRestart}
            />
          ) : mode === 'quiz' ? (
            <QuizMode
              words={words}
              dailyGoal={20}
              todayStudied={0}
              onComplete={handleQuizComplete}
            />
          ) : (
            <FlashcardMode words={words} onComplete={handleFlashcardComplete} />
          )}
        </div>
      </div>
</>
);
};

export default LearnPage;
