import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Clock, Volume2, ChevronRight, CheckCircle2, XCircle,
} from 'lucide-react';
import type { QuizQuestion } from '@shared/api.interface';
import { speak } from '@/utils/pronunciation';

interface QuizInProgressProps {
  questions: QuizQuestion[];
  currentIndex: number;
  elapsed: number;
  answers: Array<{ userAnswer: string; correct: boolean }>;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

const QuizInProgress: React.FC<QuizInProgressProps> = ({
  questions, currentIndex, elapsed, answers, onAnswer, onNext, isSubmitting,
}) => {
  const currentQ = questions[currentIndex];
  const [userAnswer, setUserAnswer] = useState<string>('');
  const answered = answers[currentIndex] !== undefined;
  const isCorrect = answers[currentIndex]?.correct ?? false;

  useEffect(() => {
    setUserAnswer('');
  }, [currentIndex]);

  const progress = ((currentIndex + 1) / questions.length) * 100;

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (answer: string): void => {
    if (answered) return;
    onAnswer(answer);
  };

  const handleSpellingSubmit = (): void => {
    if (answered || !userAnswer.trim()) return;
    handleSubmit(userAnswer.trim().toLowerCase());
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'en2zh': return '看英文選中文';
      case 'zh2en': return '看中文選英文';
      case 'spelling': return '拼字題';
      case 'cloze': return '例句填空';
      default: return type;
    }
  };

  const isChoiceType = currentQ?.type === 'en2zh' || currentQ?.type === 'zh2en' || currentQ?.type === 'cloze';

  return (
    <div className="page-enter space-y-5 py-6 px-4 md:px-6 max-w-2xl mx-auto">
      {/* 頂部進度列 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-foreground">
            第 {currentIndex + 1} / {questions.length} 題
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            {formatTime(elapsed)}
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-muted" />
      </div>

      {/* 題目卡片 */}
      <div className={`rounded-2xl border bg-card shadow-md overflow-hidden transition-all duration-300 ${
        answered
          ? isCorrect
            ? 'ring-2 ring-success bg-success/10 animate-correct'
            : 'ring-2 ring-destructive bg-destructive/10 animate-wrong'
          : ''
      }`}>
        <div className="p-6 pb-2">
          <Badge variant="secondary" className="w-fit">
            {getTypeLabel(currentQ.type)}
          </Badge>
        </div>
        <div className="p-6 pt-0 space-y-5">
          {/* 題目本體 */}
          {currentQ.type === 'en2zh' && (
            <div className="text-center space-y-2 py-4">
              <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-bold text-foreground">
                {currentQ.word.word}
              </span>
              <button
                onClick={() => speak(currentQ.word.word)}
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
              <div className="text-sm text-muted-foreground">{currentQ.word.phonetic}</div>
            </div>
          )}

          {currentQ.type === 'zh2en' && (
            <div className="text-center py-4">
              <span className="text-2xl font-bold text-foreground">
                {currentQ.word.zh}
              </span>
            </div>
          )}

          {currentQ.type === 'spelling' && (
            <div className="text-center space-y-3 py-4">
              <div className="text-xl font-bold text-foreground">{currentQ.word.zh}</div>
              <div className="text-sm text-muted-foreground">{currentQ.word.phonetic}</div>
              <div className="max-w-xs mx-auto pt-2">
                <Input
                  placeholder="請輸入英文單字"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !answered) handleSpellingSubmit();
                  }}
                  disabled={answered}
                  className="text-center text-lg font-medium rounded-xl"
                />
                {!answered && (
                  <Button
                    className="w-full mt-3 rounded-xl"
                    onClick={handleSpellingSubmit}
                    disabled={!userAnswer.trim()}
                  >
                    確認答案
                  </Button>
                )}
              </div>
            </div>
          )}

          {currentQ.type === 'cloze' && (
            <div className="py-4">
              <div className="text-lg text-foreground leading-relaxed text-center">
                {currentQ.question}
              </div>
            </div>
          )}

          {/* 選項按鈕 */}
          {isChoiceType && (
            <div className="space-y-2">
              {currentQ.options.map((opt: string, i: number) => {
                const userAns = answers[currentIndex]?.userAnswer;
                const isSelected = answered && userAns === opt;
                const isRightAnswer = answered && opt === currentQ.correctAnswer;
                let btnClass = 'w-full justify-start rounded-xl text-left px-4 py-3 ';
                if (answered) {
                  if (isRightAnswer) {
                    btnClass += 'bg-success/20 text-success border-success/40 hover:bg-success/20';
                  } else if (isSelected && !isCorrect) {
                    btnClass += 'bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/20';
                  } else {
                    btnClass += 'bg-muted text-muted-foreground border-border';
                  }
                } else {
                  btnClass += 'bg-card hover:bg-primary/10 hover:border-primary/40';
                }
                return (
                  <Button
                    key={i}
                    variant="outline"
                    className={btnClass}
                    onClick={() => handleSubmit(opt)}
                    disabled={answered}
                  >
                    <span className="font-medium mr-3 text-muted-foreground">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isRightAnswer && <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />}
                    {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />}
                  </Button>
                );
              })}
            </div>
          )}

          {/* 答案解析 */}
          {answered && (
            <div className={`p-4 rounded-xl space-y-2 transition-all ${
              isCorrect ? 'bg-success/10' : 'bg-destructive/10'
            }`}>
              <div className={`font-semibold flex items-center gap-2 ${
                isCorrect ? 'text-success' : 'text-destructive'
              }`}>
                {isCorrect ? (
                  <><CheckCircle2 className="w-5 h-5" /> 答對了！</>
                ) : (
                  <><XCircle className="w-5 h-5" /> 答錯了</>
                )}
              </div>
              <div className="text-sm text-foreground">
                <span className="font-medium">正確答案：</span>
                {currentQ.correctAnswer}
              </div>
              {currentQ.word.definition && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">解析：</span>
                  {currentQ.word.definition}
                </div>
              )}
              {currentQ.word.example && (
                <div className="text-sm text-muted-foreground italic">
                  例句：{currentQ.word.example}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 下一題按鈕 */}
      {answered && (
        <Button
          size="lg"
          className="w-full rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          onClick={onNext}
          disabled={isSubmitting}
        >
          {currentIndex + 1 >= questions.length ? '看結果' : '下一題'}
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};

export default QuizInProgress;
