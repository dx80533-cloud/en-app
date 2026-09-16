import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@client/src/lib/logger';
import {
  Volume2,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { learningApi } from '@/api';
import type { VocabWordWithProgress } from '@shared/api.interface';
import { speak } from '@/utils/pronunciation';

export type QuizType = 'en2zh' | 'zh2en' | 'spelling' | 'cloze';

interface QuizQuestionData {
  type: QuizType;
  word: VocabWordWithProgress;
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizCardProps {
  question: QuizQuestionData;
  onAnswer: (correct: boolean, userAnswer: string) => void;
  showResult: boolean;
  isCorrect: boolean | null;
  userAnswer: string;
  onNext: () => void;
}

const shuffleArray = <T,>(arr: T[]): T[] => {
  const result: T[] = [...arr];
  for (let i: number = result.length - 1; i > 0; i -= 1) {
    const j: number = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const generateQuestion = (word: VocabWordWithProgress, typeIndex: number, allWords: VocabWordWithProgress[]): QuizQuestionData => {
  const types: QuizType[] = ['en2zh', 'zh2en', 'spelling', 'cloze'];
  const type: QuizType = types[typeIndex % 4];

  const otherWords: VocabWordWithProgress[] = allWords.filter((w: VocabWordWithProgress) => w.id !== word.id);
  const distractors: VocabWordWithProgress[] = shuffleArray(otherWords).slice(0, 3);

  switch (type) {
    case 'en2zh': {
      const options: string[] = shuffleArray([
        word.zh,
        ...distractors.map((w: VocabWordWithProgress) => w.zh),
      ]);
      return { type, word, question: word.word, options, correctAnswer: word.zh };
    }
    case 'zh2en': {
      const options: string[] = shuffleArray([
        word.word,
        ...distractors.map((w: VocabWordWithProgress) => w.word),
      ]);
      return { type, word, question: word.zh, options, correctAnswer: word.word };
    }
    case 'spelling': {
      return {
        type,
        word,
        question: word.zh,
        options: [],
        correctAnswer: word.word,
      };
    }
    case 'cloze': {
      const example: string = word.example || `The ${word.word} is important.`;
      const clozeQuestion: string = example.replace(
        new RegExp(word.word, 'gi'),
        '_____',
      );
      const options: string[] = shuffleArray([
        word.word,
        ...distractors.map((w: VocabWordWithProgress) => w.word),
      ]);
      return { type, word, question: clozeQuestion, options, correctAnswer: word.word };
    }
    default:
      return {
        type: 'en2zh',
        word,
        question: word.word,
        options: [word.zh],
        correctAnswer: word.zh,
      };
  }
};

const QuizCard: React.FC<QuizCardProps> = ({
  question,
  onAnswer,
  showResult,
  isCorrect,
  userAnswer,
  onNext,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue('');
    if (question.type === 'spelling') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [question]);

  const handleOptionClick = (option: string): void => {
    if (showResult) return;
    onAnswer(option === question.correctAnswer, option);
  };

  const handleSubmitSpelling = (e: React.FormEvent): void => {
    e.preventDefault();
    if (showResult || !inputValue.trim()) return;
    const correct: boolean =
      inputValue.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    onAnswer(correct, inputValue.trim());
  };

  const handleSpeak = (): void => {
    speak(question.word.word);
  };

  const typeLabels: Record<QuizType, string> = {
    en2zh: '看英文選中文',
    zh2en: '看中文選英文',
    spelling: '拼字測驗',
    cloze: '克漏字',
  };

  const isChoiceType: boolean = question.type === 'en2zh' || question.type === 'zh2en' || question.type === 'cloze';

  return (
    <motion.div
      key={question.word.id + question.type}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card
        className={`overflow-hidden rounded-2xl border-0 shadow-md transition-all duration-300 ${
          showResult
            ? isCorrect
              ? 'ring-2 ring-emerald-400 bg-emerald-50/30'
              : 'ring-2 ring-rose-400 bg-rose-50/30'
            : 'bg-white'
        }`}
      >
        <CardContent className="p-6">
          {/* 題型標籤 */}
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="secondary" className="rounded-full bg-indigo-50 text-indigo-600">
              {typeLabels[question.type]}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-indigo-500 hover:bg-indigo-50"
              onClick={handleSpeak}
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>

          {/* 題目 */}
          <motion.div
            animate={showResult && isCorrect ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.3 }}
            className="mb-6 text-center"
          >
            <h2 className="text-3xl font-bold text-slate-800 md:text-4xl">
              {question.question}
            </h2>
            {question.type === 'en2zh' && (
              <p className="mt-2 text-slate-500">{question.word.phonetic}</p>
            )}
          </motion.div>

          {/* 選項 / 輸入框 */}
          {isChoiceType ? (
            <div className="space-y-2.5">
              {question.options.map((option: string, index: number) => {
                const isSelected: boolean = userAnswer === option;
                const isCorrectOption: boolean = option === question.correctAnswer;
                let optionClass: string =
                  'w-full justify-start rounded-xl border-0 bg-slate-50 px-4 py-3.5 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-700';

                if (showResult) {
                  if (isCorrectOption) {
                    optionClass =
                      'w-full justify-start rounded-xl border-0 bg-emerald-100 px-4 py-3.5 text-left text-emerald-800';
                  } else if (isSelected && !isCorrect) {
                    optionClass =
                      'w-full justify-start rounded-xl border-0 bg-rose-100 px-4 py-3.5 text-left text-rose-800';
                  } else {
                    optionClass =
                      'w-full justify-start rounded-xl border-0 bg-slate-50 px-4 py-3.5 text-left text-slate-400 opacity-60';
                  }
                }

                return (
                  <motion.button
                    key={index}
                    whileHover={!showResult ? { scale: 1.01 } : {}}
                    whileTap={!showResult ? { scale: 0.98 } : {}}
                    className={optionClass}
                    onClick={() => handleOptionClick(option)}
                    disabled={showResult}
                  >
                    <span className="flex w-full items-center gap-3">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-slate-500 shadow-sm">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && isCorrectOption && (
                        <Check className="h-5 w-5 text-emerald-600" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <X className="h-5 w-5 text-rose-600" />
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleSubmitSpelling} className="space-y-3">
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                placeholder="請輸入英文單字..."
                className={`h-12 rounded-xl text-center text-lg ${
                  showResult
                    ? isCorrect
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-rose-400 bg-rose-50 text-rose-800'
                    : ''
                }`}
                disabled={showResult}
              />
              {!showResult && (
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500"
                  disabled={!inputValue.trim()}
                >
                  確認答案
                </Button>
              )}
            </form>
          )}

          {/* 結果與解析 */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-5 space-y-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-emerald-600">答對了！+10 XP</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white">
                          <X className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-rose-600">答錯了</span>
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-800">
                        {question.word.word}
                      </span>
                      <span className="text-sm text-slate-400">
                        {question.word.phonetic}
                      </span>
                      <span className="text-xs text-indigo-500">{question.word.pos}</span>
                    </div>
                    <p className="text-slate-600">{question.word.zh}</p>
                    {question.word.example && (
                      <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
                        <p className="text-slate-700">{question.word.example}</p>
                        <p className="mt-1 text-slate-500">{question.word.exampleZh}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={onNext}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500"
                  >
                    下一題
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface QuizModeProps {
  words: VocabWordWithProgress[];
  dailyGoal: number;
  todayStudied: number;
  onComplete: (correct: number, total: number, xp: number) => void;
}

const QuizMode: React.FC<QuizModeProps> = ({ words, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [question, setQuestion] = useState<QuizQuestionData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const currentWord: VocabWordWithProgress | undefined = words[currentIndex];

  useEffect(() => {
    if (currentWord && words.length > 0) {
      const q: QuizQuestionData = generateQuestion(currentWord, currentIndex, words);
      setQuestion(q);
      setShowResult(false);
      setIsCorrect(null);
      setUserAnswer('');
    }
  }, [currentIndex, currentWord, words]);

  const handleAnswer = useCallback(
    async (correct: boolean, answer: string): Promise<void> => {
      if (!currentWord) return;
      setShowResult(true);
      setIsCorrect(correct);
      setUserAnswer(answer);
      if (correct) {
        setCorrectCount((prev: number) => prev + 1);
      }
      setAnsweredCount((prev: number) => prev + 1);

      try {
        await learningApi.submitAnswer(currentWord.id, correct);
      } catch (err) {
        logger.error('submitAnswer error', JSON.stringify(err));
      }
    },
    [currentWord],
  );

  const handleNext = useCallback((): void => {
    if (currentIndex >= words.length - 1) {
      const xp: number = correctCount * 10 + (showResult && isCorrect ? 0 : 0);
      onComplete(correctCount, answeredCount, xp);
      return;
    }
    setCurrentIndex((prev: number) => prev + 1);
  }, [currentIndex, words.length, correctCount, answeredCount, showResult, isCorrect, onComplete]);

  const progress: number = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  if (!question) {
    return (
      <div className="flex items-center justify-center py-20">
        <RotateCcw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 進度列 */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm text-slate-500">
          <span>
            第 {currentIndex + 1} / {words.length} 題
          </span>
          <span>
            答對 {correctCount} 題
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <QuizCard
          key={currentWord?.id + currentIndex}
          question={question}
          onAnswer={handleAnswer}
          showResult={showResult}
          isCorrect={isCorrect}
          userAnswer={userAnswer}
          onNext={handleNext}
        />
      </AnimatePresence>
    </div>
  );
};

interface FlashcardModeProps {
  words: VocabWordWithProgress[];
  onComplete: (known: number, total: number) => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ words, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  const currentWord: VocabWordWithProgress | undefined = words[currentIndex];

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const handleSpeak = (): void => {
    if (currentWord) {
      speak(currentWord.word);
    }
  };

  const handleCardClick = (): void => {
    setIsFlipped((prev: boolean) => !prev);
  };

  const handleRate = async (known: boolean): Promise<void> => {
    if (!currentWord) return;
    if (known) {
      setKnownCount((prev: number) => prev + 1);
    }
    setReviewedCount((prev: number) => prev + 1);

    try {
      await learningApi.submitAnswer(currentWord.id, known);
    } catch (err) {
      logger.error('flashcard submit error', JSON.stringify(err));
    }

    if (currentIndex >= words.length - 1) {
      onComplete(knownCount + (known ? 1 : 0), reviewedCount + 1);
      return;
    }
    setCurrentIndex((prev: number) => prev + 1);
  };

  const progress: number = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  if (!currentWord) {
    return <div className="py-20 text-center text-slate-400">沒有單字</div>;
  }

  return (
    <div className="space-y-5">
      {/* 進度 */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm text-slate-500">
          <span>
            第 {currentIndex + 1} / {words.length} 張
          </span>
          <span>記住了 {knownCount} 張</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* 閃卡 */}
      <div
        className="relative h-72 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={handleCardClick}
      >
        <motion.div
          className="relative h-full w-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* 正面 */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg [backface-visibility:hidden]"
          >
            <p className="text-4xl font-bold md:text-5xl">{currentWord.word}</p>
            <p className="mt-2 text-white/70">{currentWord.phonetic}</p>
            <button
              className="mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-colors hover:bg-white/30"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleSpeak();
              }}
            >
              <Volume2 className="h-5 w-5" />
            </button>
            <p className="mt-auto text-sm text-white/50">點擊卡片翻到背面</p>
          </div>

          {/* 背面 */}
          <div
            className="absolute inset-0 flex flex-col justify-center rounded-2xl bg-white p-6 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-800">{currentWord.word}</span>
                <Badge variant="secondary" className="rounded-full bg-indigo-50 text-indigo-600">
                  {currentWord.pos}
                </Badge>
              </div>
              <p className="text-xl text-slate-700">{currentWord.zh}</p>
              {currentWord.example && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="text-sm text-slate-700">{currentWord.example}</p>
                  <p className="mt-1 text-xs text-slate-500">{currentWord.exampleZh}</p>
                </div>
              )}
            </div>
            <p className="mt-auto text-center text-sm text-slate-400">點擊卡片翻回正面</p>
          </div>
        </motion.div>
      </div>

      {/* 操作按鈕 */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-12 rounded-xl border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
          onClick={() => handleRate(false)}
        >
          <X className="h-5 w-5" />
          還不熟
        </Button>
        <Button
          className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
          onClick={() => handleRate(true)}
        >
          <Check className="h-5 w-5" />
          記住了
        </Button>
      </div>
    </div>
  );
};

interface CompleteScreenProps {
  correct: number;
  total: number;
  xp: number;
  onRestart: () => void;
}

const CompleteScreen: React.FC<CompleteScreenProps> = ({ correct, total, xp, onRestart }) => {
  const rate: number = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring', damping: 20 }}
      className="py-8 text-center"
    >
      <Card className="rounded-2xl border-0 bg-white shadow-lg">
        <CardContent className="space-y-6 p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Sparkles className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">太棒了！</h2>
            <p className="mt-1 text-slate-500">你完成了今日的學習</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-2xl font-bold text-indigo-600">{total}</p>
              <p className="text-xs text-slate-500">學習題數</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-600">{rate}%</p>
              <p className="text-xs text-slate-500">答對率</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-2xl font-bold text-amber-600">+{xp}</p>
              <p className="text-xs text-slate-500">獲得 XP</p>
            </div>
          </div>

          <Button
            onClick={onRestart}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500"
          >
            <RotateCcw className="h-4 w-4" />
            再練一輪
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export { QuizMode, FlashcardMode, CompleteScreen };
