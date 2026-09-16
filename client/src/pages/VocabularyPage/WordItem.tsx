import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Volume2, Heart, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { VocabWordWithProgress } from '@shared/api.interface';
import { speak } from '@/utils/pronunciation';

interface WordItemProps {
  word: VocabWordWithProgress;
  onToggleFavorite: (id: string) => void;
}

const WordItem: React.FC<WordItemProps> = ({ word, onToggleFavorite }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(word.isFavorite);

  const handleSpeak = (e: React.MouseEvent): void => {
    e.stopPropagation();
    speak(word.word);
  };

  const handleFavorite = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    setIsFavorite(prev => !prev);
    try {
      await onToggleFavorite(word.id);
    } catch {
      // revert on failure
      setIsFavorite(prev => !prev);
    }
  };

  return (
    <div
      className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 flex items-center gap-3">
        {/* 主資訊 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-slate-800">{word.word}</span>
            <span className="text-xs text-slate-400">{word.phonetic}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {word.pos}
            </span>
          </div>
          <div className="text-sm text-slate-600 mt-0.5 truncate">{word.zh}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1 flex-wrap">
              {word.banks.slice(0, 2).map((b: string) => (
                <Badge key={b} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {b}
                </Badge>
              ))}
              {word.banks.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  +{word.banks.length - 2}
                </Badge>
              )}
            </div>
            <div className="flex-1 max-w-24">
              <Progress value={word.familiarity} className="h-1.5 bg-slate-100" />
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSpeak}
            className="p-2 rounded-full hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors"
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleFavorite}
            className={`p-2 rounded-full transition-colors ${
              isFavorite
                ? 'text-rose-500 hover:bg-rose-50'
                : 'text-slate-300 hover:text-rose-400 hover:bg-rose-50'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <div className="p-2 text-slate-400">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* 展開詳情 */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
          {word.definition && (
            <div className="pt-3">
              <div className="text-xs text-slate-400 mb-1">英文釋義</div>
              <div className="text-sm text-slate-700">{word.definition}</div>
            </div>
          )}
          {word.example && (
            <div>
              <div className="text-xs text-slate-400 mb-1">例句</div>
              <div className="text-sm text-slate-700 italic">{word.example}</div>
              {word.exampleZh && (
                <div className="text-sm text-slate-500 mt-0.5">{word.exampleZh}</div>
              )}
            </div>
          )}
          {word.academic && (
            <div>
              <div className="text-xs text-slate-400 mb-1">學術分級</div>
              <div className="text-sm text-slate-700">{word.academic}</div>
            </div>
          )}
          {word.note && (
            <div>
              <div className="text-xs text-slate-400 mb-1">筆記</div>
              <div className="text-sm text-slate-700">{word.note}</div>
            </div>
          )}
          <div className="flex items-center gap-4 pt-1">
            <div className="text-xs text-slate-400">
              答對：<span className="text-emerald-600 font-medium">{word.correctCount}</span>
            </div>
            <div className="text-xs text-slate-400">
              答錯：<span className="text-rose-500 font-medium">{word.wrongCount}</span>
            </div>
            <div className="text-xs text-slate-400">
              狀態：<span className="text-indigo-600 font-medium">{word.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordItem;
