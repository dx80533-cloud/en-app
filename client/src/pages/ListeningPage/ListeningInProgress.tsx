import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Volume2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { ListeningQuestion } from '@shared/api.interface';
import { speak } from '@/utils/pronunciation';

interface ListeningInProgressProps {
  questions: ListeningQuestion[];
  currentIndex: number;
  elapsed: number;
  setElapsed: (fn: (p: number) => number) => void;
  answers: Array<{ userAnswer: string; correct: boolean; type: string }>;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  listen2zh: '聽音選中文',
  listen2en: '聽音選英文',
  listenSentence: '聽句填空',
  listenSpell: '聽音辨字',
};

const ListeningInProgress: React.FC<ListeningInProgressProps> = ({
  questions, currentIndex, elapsed, setElapsed, answers, onAnswer, onNext, isSubmitting,
}) => {
  const currentQ = questions[currentIndex];
  const answered = answers[currentIndex] !== undefined;
  const isCorrect = answers[currentIndex]?.correct ?? false;
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const hasPlayedRef = useRef<boolean>(false);

  useEffect(() => {
    setShowExplanation(false);
    hasPlayedRef.current = false;
  }, [currentIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [setElapsed]);

  useEffect(() => {
    if (!currentQ || hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    const timer = setTimeout(() => {
      handlePlay();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQ?.id]);

  const progress = ((currentIndex + 1) / questions.length) * 100;

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlay = (): void => {
    if (!currentQ) return;
    speak(currentQ.audioText, 0.9);
  };

  const handleSubmit = (answer: string): void => {
    if (answered) return;
    onAnswer(answer);
    setShowExplanation(true);
  };

  const getPromptLines = (prompt: string): string[] => {
    return prompt.split('\n');
  };

  const getOptionLabel = (opt: string, type: string): string => {
    if (type === 'listen2en' && opt.length > 60) {
      return opt.slice(0, 60) + '…';
    }
    return opt;
  };

  if (!currentQ) {
    return <div className="p-8 text-center text-muted-foreground">載入中...</div>;
  }

  return (
    <div className="page-enter px-4 md:px-6 py-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {formatTime(elapsed)}
        </div>
        <div className="text-sm font-medium text-foreground/80">
          第 {currentIndex + 1} / {questions.length} 題
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
          {TYPE_LABELS[currentQ.type] || currentQ.type}
        </span>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <button
            type="button"
            onClick={handlePlay}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            aria-label="播放聲音"
          >
            <Volume2 className="w-10 h-10" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RotateCcw className="w-4 h-4" />
            點擊重播
          </div>
        </div>

        <div className="text-center space-y-2">
          {getPromptLines(currentQ.prompt).map((line, i) => (
            <p key={i} className={`text-foreground ${i === 0 ? 'font-medium' : 'text-lg italic text-foreground/80'}`}>
              {line}
            </p>
          ))}
        </div>

        <div className="grid gap-2">
          {currentQ.options.map((opt, idx) => {
            const isSelected = answers[currentIndex]?.userAnswer === opt;
            const isCorrectOption = opt === currentQ.correctAnswer;
            let variant = 'default';
            if (answered) {
              if (isCorrectOption) variant = 'correct';
              else if (isSelected && !isCorrectOption) variant = 'wrong';
              else variant = 'disabled';
            }
            return (
              <button
                key={idx}
                type="button"
                disabled={answered}
                onClick={() => handleSubmit(opt)}
                className={`p-4 rounded-xl text-left transition-all ${
                  variant === 'correct'
                    ? 'bg-success/10 border-2 border-success text-success animate-correct'
                    : variant === 'wrong'
                    ? 'bg-destructive/10 border-2 border-destructive text-destructive animate-wrong'
                    : variant === 'disabled'
                    ? 'bg-muted border border-border text-muted-foreground'
                    : 'bg-card border border-border hover:border-success hover:bg-success/10 text-foreground cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    variant === 'correct' ? 'bg-success text-success-foreground' :
                    variant === 'wrong' ? 'bg-destructive text-destructive-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 break-words">{getOptionLabel(opt, currentQ.type)}</span>
                  {answered && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />}
                  {answered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {showExplanation && currentQ.explanation && (
        <div className={`rounded-2xl border p-5 space-y-3 ${
          isCorrect
            ? 'bg-success/10 border-success/30 animate-correct'
            : 'bg-destructive/10 border-destructive/30 animate-wrong'
        }`}>
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            <span className={`font-semibold ${isCorrect ? 'text-success' : 'text-destructive'}`}>
              {isCorrect ? '答對了！' : '答錯了'}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-foreground text-base">{currentQ.explanation.word}</span>
                {currentQ.explanation.phonetic && (
                  <span className="text-muted-foreground text-xs">[{currentQ.explanation.phonetic}]</span>
                )}
              </div>
              <div className="text-foreground/80">{currentQ.explanation.zh}</div>
              {currentQ.explanation.example && (
                <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
                  <p className="italic text-foreground">{currentQ.explanation.example}</p>
                  {currentQ.explanation.exampleZh && (
                    <p className="text-muted-foreground text-xs">{currentQ.explanation.exampleZh}</p>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="w-full rounded-2xl"
        onClick={onNext}
        disabled={!answered || isSubmitting}
      >
        {currentIndex + 1 >= questions.length ? (
          isSubmitting ? '提交中...' : (<><Sparkles className="w-5 h-5 mr-2" />查看成績</>)
        ) : (
          <>下一題<ChevronRight className="w-5 h-5 ml-1" /></>
        )}
      </Button>
    </div>
  );
};

export default ListeningInProgress;
