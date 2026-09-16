import { useState } from 'react';
import { Heart, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { speak } from '@/utils/pronunciation';
import type { VocabWordWithProgress } from '@shared/api.interface';

interface WordCardProps {
  word: VocabWordWithProgress;
  onToggleFavorite?: (wordId: string) => void;
  showFavorite?: boolean;
  className?: string;
}

const WordCard: React.FC<WordCardProps> = ({
  word,
  onToggleFavorite,
  showFavorite = true,
  className,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  const handleSpeak = (e: React.MouseEvent): void => {
    e.stopPropagation();
    speak(word.word);
  };

  const handleFavorite = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (favoriting || !onToggleFavorite) return;
    setFavoriting(true);
    try {
      onToggleFavorite(word.id);
    } finally {
      setFavoriting(false);
    }
  };

  const bankLabelMap: Record<string, string> = {
    'gept-elementary': 'GEPT初級',
    'gept-intermediate': 'GEPT中級',
    'gept-high-intermediate': 'GEPT中高級',
    toeic: 'TOEIC',
    ielts: 'IELTS',
  };

  const bankColorMap: Record<string, string> = {
    'gept-elementary': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'gept-intermediate': 'bg-blue-100 text-blue-700 border-blue-200',
    'gept-high-intermediate': 'bg-purple-100 text-purple-700 border-purple-200',
    toeic: 'bg-orange-100 text-orange-700 border-orange-200',
    ielts: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-white border border-slate-200 shadow-sm p-5',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
        'cursor-pointer',
        className,
      )}
      onClick={() => setExpanded((prev) => !prev)}
      data-ai-section-type="card-list"
    >
      {/* 右上角：收藏按鈕 */}
      {showFavorite && (
        <button
          type="button"
          onClick={handleFavorite}
          className="absolute top-3 right-3 p-1.5 rounded-full transition-colors hover:bg-rose-50"
          aria-label={word.isFavorite ? '取消收藏' : '收藏'}
        >
          <Heart
            className={cn(
              'w-5 h-5 transition-colors',
              word.isFavorite
                ? 'fill-rose-500 text-rose-500'
                : 'text-slate-300',
            )}
          />
        </button>
      )}

      {/* 單字與音標 */}
      <div className="pr-10 mb-2">
        <h3 className="text-xl font-bold text-slate-800">{word.display || word.word}</h3>
        {word.phonetic && (
          <p className="text-sm text-slate-500 mt-0.5">{word.phonetic}</p>
        )}
      </div>

      {/* 詞性 + 中文釋義 */}
      <div className="mb-3">
        {word.pos && (
          <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mr-2">
            {word.pos}
          </span>
        )}
        <span className="text-sm text-slate-700">{word.zh}</span>
      </div>

      {/* 字庫標籤 */}
      {word.banks && word.banks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {word.banks.map((bank: string) => (
            <Badge
              key={bank}
              variant="outline"
              className={cn(
                'text-xs font-medium border',
                bankColorMap[bank] ||
                  'bg-slate-100 text-slate-600 border-slate-200',
              )}
            >
              {bankLabelMap[bank] || bank}
            </Badge>
          ))}
        </div>
      )}

      {/* 底部：喇叭按鈕 + 展開提示 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
          onClick={handleSpeak}
          aria-label="播放發音"
        >
          <Volume2 className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>{expanded ? '收起' : '展開詳情'}</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {/* 展開內容：例句與英文釋義 */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
          {word.definition && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">
                英文釋義
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {word.definition}
              </p>
            </div>
          )}
          {word.example && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">例句</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {word.example}
              </p>
              {word.exampleZh && (
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  {word.exampleZh}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordCard;
