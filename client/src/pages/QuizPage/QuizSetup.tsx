import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BookOpen, Target, Sparkles,
} from 'lucide-react';

export const BANK_OPTIONS = [
  { value: 'all', label: '全部字庫' },
  { value: 'gept|初級', label: 'GEPT 初級' },
  { value: 'gept|中級', label: 'GEPT 中級' },
  { value: 'gept|中高級', label: 'GEPT 中高級' },
  { value: 'toeic|', label: 'TOEIC' },
  { value: 'ielts|', label: 'IELTS' },
];

export const COUNT_OPTIONS = [10, 20, 50];

export const TYPE_OPTIONS = [
  { value: 'en2zh', label: '看英文選中文' },
  { value: 'zh2en', label: '看中文選英文' },
  { value: 'spelling', label: '拼字題' },
  { value: 'cloze', label: '例句填空' },
];

export const MODE_OPTIONS = [
  { value: 'random', label: '隨機抽題', icon: Sparkles },
  { value: 'weakness', label: '弱項加強', icon: Target },
  { value: 'review', label: '複習模式', icon: BookOpen },
];

interface QuizSetupProps {
  selectedBank: string;
  setSelectedBank: (v: string) => void;
  selectedCount: number;
  setSelectedCount: (v: number) => void;
  selectedTypes: string[];
  setSelectedTypes: (v: string[]) => void;
  selectedMode: string;
  setSelectedMode: (v: string) => void;
  highScore: number;
  onStart: () => void;
}

const QuizSetup: React.FC<QuizSetupProps> = ({
  selectedBank, setSelectedBank,
  selectedCount, setSelectedCount,
  selectedTypes, setSelectedTypes,
  selectedMode, setSelectedMode,
  highScore, onStart,
}) => {
  const handleTypeToggle = (type: string): void => {
    setSelectedTypes(
      selectedTypes.includes(type)
        ? selectedTypes.filter(t => t !== type)
        : [...selectedTypes, type]
    );
  };

  return (
    <div className="page-enter space-y-6 py-6 px-4 md:px-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">挑戰測驗</h1>
        <p className="text-sm text-muted-foreground">選擇你想挑戰的模式，開始測驗吧！</p>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-5 hover:shadow-md transition-shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <BookOpen className="w-5 h-5 text-primary" />
          設定選項
        </h2>

        {/* 字庫選擇 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">字庫選擇</label>
          <div className="flex flex-wrap gap-2">
            {BANK_OPTIONS.map(b => (
              <Badge
                key={b.value}
                variant={selectedBank === b.value ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1 rounded-full transition-all hover-elevate"
                onClick={() => setSelectedBank(b.value)}
              >
                {b.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* 題數 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">題數</label>
          <div className="flex gap-2">
            {COUNT_OPTIONS.map(n => (
              <Button
                key={n}
                variant={selectedCount === n ? 'default' : 'outline'}
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => setSelectedCount(n)}
              >
                {n} 題
              </Button>
            ))}
          </div>
        </div>

        {/* 題型 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">題型（可多選）</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(t => (
              <div
                key={t.value}
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTypes.includes(t.value)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-foreground/20'
                }`}
                onClick={() => handleTypeToggle(t.value)}
              >
                <Checkbox
                  checked={selectedTypes.includes(t.value)}
                  onCheckedChange={() => handleTypeToggle(t.value)}
                />
                <span className="text-sm">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 模式 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">模式</label>
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map(m => {
              const Icon = m.icon;
              return (
                <Button
                  key={m.value}
                  variant={selectedMode === m.value ? 'default' : 'outline'}
                  size="sm"
                  className="flex flex-col gap-1 h-auto py-3 rounded-xl"
                  onClick={() => setSelectedMode(m.value)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{m.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        onClick={onStart}
        disabled={selectedTypes.length === 0}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        開始測驗
      </Button>

      <div className="rounded-2xl border bg-card shadow-sm p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          <div>
            <div className="text-sm text-muted-foreground">歷史最高分</div>
            <div className="text-xl font-bold text-foreground">{highScore} 分</div>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-amber-400" />
      </div>
    </div>
  );
};

export default QuizSetup;
