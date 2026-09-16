import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { XCircle, RotateCcw, Home, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { QuizResult } from '@shared/api.interface';

interface QuizResultViewProps {
  result: QuizResult;
  onRetry: () => void;
}

function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'S', color: 'bg-accent text-accent-foreground' };
  if (score >= 80) return { grade: 'A', color: 'bg-success text-success-foreground' };
  if (score >= 70) return { grade: 'B', color: 'bg-info text-info-foreground' };
  if (score >= 60) return { grade: 'C', color: 'bg-warning text-warning-foreground' };
  return { grade: 'D', color: 'bg-destructive text-destructive-foreground' };
}

const QuizResultView: React.FC<QuizResultViewProps> = ({ result, onRetry }) => {
  const gradeInfo = getGrade(result.score);
  const accuracy = result.totalQuestions > 0
    ? Math.round((result.correctCount / result.totalQuestions) * 100)
    : 0;
  const wrongList = result.details.filter(d => !d.correct);
  const [xpDisplay, setXpDisplay] = useState<number>(0);

  useEffect(() => {
    let cur = 0;
    const step = Math.max(1, Math.floor(result.xpEarned / 30));
    const timer = setInterval(() => {
      cur += step;
      if (cur >= result.xpEarned) {
        cur = result.xpEarned;
        clearInterval(timer);
      }
      setXpDisplay(cur);
    }, 30);
    return () => clearInterval(timer);
  }, [result.xpEarned]);

  return (
    <div className="page-enter space-y-6 py-6 px-4 md:px-6 max-w-2xl mx-auto">
      {/* 大分數 */}
      <div className="rounded-2xl shadow-md bg-gradient-to-br from-primary to-accent text-primary-foreground p-6 text-center space-y-3">
        <div className="text-sm text-primary-foreground/80">本次測驗成績</div>
        <div className="text-6xl font-bold tracking-tight">
          {result.score}
          <span className="text-2xl font-normal text-primary-foreground/80 ml-1">分</span>
        </div>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${gradeInfo.color} shadow-lg`}>
          {gradeInfo.grade}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-card shadow-sm p-5 text-center">
          <div className="text-sm text-muted-foreground">答對數</div>
          <div className="text-xl font-bold text-success">
            {result.correctCount}/{result.totalQuestions}
          </div>
        </div>
        <div className="rounded-2xl border bg-card shadow-sm p-5 text-center">
          <div className="text-sm text-muted-foreground">答對率</div>
          <div className="text-xl font-bold text-primary">{accuracy}%</div>
        </div>
        <div className="rounded-2xl border bg-card shadow-sm p-5 text-center">
          <div className="text-sm text-muted-foreground">獲得 XP</div>
          <div className="text-xl font-bold text-amber-500 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4" />
            +{xpDisplay}
          </div>
        </div>
      </div>

      {/* 錯題列表 */}
      {wrongList.length > 0 && (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <XCircle className="w-5 h-5 text-destructive" />
              錯題列表（{wrongList.length} 題）
            </h3>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {wrongList.map((item, i: number) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-foreground">{item.word}</div>
                  <div className="text-xs text-muted-foreground">
                    你的答案：<span className="text-destructive">{item.userAnswer || '未作答'}</span>
                    {' · '}
                    正確：<span className="text-success">{item.correctAnswer}</span>
                  </div>
                </div>
                <XCircle className="w-5 h-5 text-destructive/70 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1 rounded-xl"
          onClick={onRetry}
        >
          <RotateCcw className="w-4 h-4" />
          再測一次
        </Button>
        <Link to="/" className="flex-1">
          <Button variant="default" size="lg" className="w-full rounded-xl">
            <Home className="w-4 h-4" />
            回首頁
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default QuizResultView;
