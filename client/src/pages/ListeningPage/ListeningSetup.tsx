import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Headphones,
  Volume2,
  PenLine,
  Brain,
  Sparkles,
  Target,
  BookOpen,
} from 'lucide-react';

const LEVEL_OPTIONS = [
  { value: '初級', label: 'GEPT 初級', desc: '基礎聽力入門' },
  { value: '中級', label: 'GEPT 中級', desc: '日常會話等級' },
  { value: '中高級', label: 'GEPT 中高級', desc: '學術與商務' },
];

const COUNT_OPTIONS = [10, 20, 30];

const TYPE_OPTIONS = [
  { value: 'listen2zh', label: '聽音選中文', icon: Volume2, desc: '聽單字發音，選中文釋義' },
  { value: 'listen2en', label: '聽音選英文', icon: Volume2, desc: '聽單字發音，選英文釋義' },
  { value: 'listenSentence', label: '聽句填空', icon: PenLine, desc: '聽完整例句，選出空格單字' },
  { value: 'listenSpell', label: '聽音辨字', icon: Brain, desc: '聽發音，從相似拼字中選正確答案' },
];

const MODE_OPTIONS = [
  { value: 'random', label: '隨機練習', icon: Sparkles, desc: '隨機抽題' },
  { value: 'weak', label: '錯題加強', icon: Target, desc: '優先練習錯題' },
  { value: 'review', label: '複習模式', icon: BookOpen, desc: '複習已學過的單字' },
];

interface ListeningSetupProps {
  selectedLevel: string;
  setSelectedLevel: (v: string) => void;
  selectedCount: number;
  setSelectedCount: (v: number) => void;
  selectedTypes: string[];
  setSelectedTypes: (v: string[]) => void;
  selectedMode: string;
  setSelectedMode: (v: string) => void;
  bestScore: number;
  onStart: () => void;
}

const ListeningSetup: React.FC<ListeningSetupProps> = ({
  selectedLevel, setSelectedLevel,
  selectedCount, setSelectedCount,
  selectedTypes, setSelectedTypes,
  selectedMode, setSelectedMode,
  bestScore, onStart,
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md mb-2">
          <Headphones className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">GEPT 聽力練習</h1>
        <p className="text-sm text-muted-foreground">訓練你的英文聽力，從單字到例句全面提升！</p>
      </div>

      {bestScore > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 p-4 flex items-center justify-between">
            <span className="text-sm text-warning">🏆 最高分</span>
            <span className="text-xl font-bold text-warning">{bestScore} 分</span>
          </div>
      )}

      <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-5 hover:shadow-md transition-shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Headphones className="w-5 h-5 text-success" />
          選擇級別
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {LEVEL_OPTIONS.map(l => (
            <div
              key={l.value}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedLevel === l.value
                  ? 'border-success bg-success/10'
                  : 'border-border hover:border-foreground/20'
              }`}
              onClick={() => setSelectedLevel(l.value)}
            >
              <div className="font-medium text-foreground">{l.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{l.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-5 hover:shadow-md transition-shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Sparkles className="w-5 h-5 text-primary" />
          練習模式
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {MODE_OPTIONS.map(m => (
            <div
              key={m.value}
              className={`p-3 rounded-xl border cursor-pointer transition-all text-center ${
                selectedMode === m.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-foreground/20'
              }`}
              onClick={() => setSelectedMode(m.value)}
            >
              <m.icon className={`w-5 h-5 mx-auto mb-1 ${selectedMode === m.value ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-sm font-medium text-foreground">{m.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-5 hover:shadow-md transition-shadow">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Target className="w-5 h-5 text-destructive" />
          題型與題數
        </h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">題型（可多選）</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(t => (
              <div
                key={t.value}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTypes.includes(t.value)
                    ? 'border-success bg-success/10'
                    : 'border-border hover:border-foreground/20'
                }`}
                onClick={() => handleTypeToggle(t.value)}
              >
                <div className="flex items-center gap-2">
                  <t.icon className={`w-4 h-4 ${selectedTypes.includes(t.value) ? 'text-success' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 ml-6">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

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
      </div>

      <Button
        size="lg"
        className="w-full rounded-2xl text-base py-6 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
        onClick={onStart}
        disabled={selectedTypes.length === 0}
      >
        <Headphones className="w-5 h-5 mr-2" />
        開始聽力練習
      </Button>
    </div>
  );
};

export default ListeningSetup;
