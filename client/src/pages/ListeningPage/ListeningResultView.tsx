import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  Target,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Volume2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ListeningResult } from '@shared/api.interface';
import { speak } from '@/utils/pronunciation';

interface ListeningResultViewProps {
  result: ListeningResult | null;
  onRetry: () => void;
  onBack: () => void;
}

const ListeningResultView: React.FC<ListeningResultViewProps> = ({
  result, onRetry, onBack,
}) => {
  const [showWrong, setShowWrong] = useState<boolean>(false);

  if (!result) {
    return <div className="p-8 text-center text-muted-foreground">載入中...</div>;
  }

  const wrongItems = result.details.filter((d) => !d.correct);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 80) return 'from-success to-success/80';
    if (score >= 60) return 'from-warning to-warning/80';
    return 'from-destructive to-destructive/80';
  };

  const getScoreMessage = (score: number): string => {
    if (score >= 90) return '太厲害了！聽力高手！';
    if (score >= 80) return '非常棒！繼續保持～';
    if (score >= 60) return '不錯喔，再加油！';
    return '多多練習，一定會進步！';
  };

  return (
    <div className="page-enter px-4 md:px-6 py-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${getScoreBg(result.score)} text-primary-foreground shadow-lg`}>
          <Trophy className="w-12 h-12" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">練習完成！</h1>
          <p className="text-muted-foreground mt-1">{getScoreMessage(result.score)}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-card border shadow-sm p-6 space-y-5">
        <div className="text-center">
          <div className={`text-6xl font-bold ${getScoreColor(result.score)}`}>
            {result.score}
            <span className="text-2xl text-muted-foreground ml-1">分</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            答對 {result.correctCount} / {result.totalQuestions} 題
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-primary">+{result.xpEarned}</div>
            <div className="text-xs text-muted-foreground">獲得 XP</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-success">
              {Math.round((result.correctCount / Math.max(1, result.totalQuestions)) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">正確率</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-destructive">{wrongItems.length}</div>
            <div className="text-xs text-muted-foreground">錯題數</div>
          </div>
        </div>
      </div>

      {wrongItems.length > 0 && (
        <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
          <button
            type="button"
            className="w-full p-4 flex items-center justify-between bg-destructive/10"
            onClick={() => setShowWrong(!showWrong)}
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-destructive" />
              <span className="font-medium text-foreground">
                錯題複習（{wrongItems.length} 題）
              </span>
            </div>
            {showWrong ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          {showWrong && (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {wrongItems.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{item.word}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    你的答案：<span className="text-destructive">{item.userAnswer || '(未作答)'}</span>
                    {' · '}
                    正確：<span className="text-success">{item.correctAnswer}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speak(item.word, 0.9)}
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center"
                    aria-label="播放發音"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:-translate-y-0.5 transition-all"
          onClick={onRetry}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          再練習一次
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full rounded-2xl"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回設定
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <Sparkles className="w-4 h-4 inline mr-1" />
        持續練習，進步看得見！
      </div>
    </div>
  );
};

export default ListeningResultView;
