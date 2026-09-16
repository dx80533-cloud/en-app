import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, BarChart3, X,
} from 'lucide-react';
import type { WordBanksInfo } from '@shared/api.interface';

const BANK_LABELS: Record<string, string> = {
  all: '全部',
  gept: 'GEPT',
  toeic: 'TOEIC',
  ielts: 'IELTS',
};

interface VocabFilterProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedBank: string;
  onBankChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  banksInfo: WordBanksInfo | null;
  onShowStats: () => void;
}

const SORT_OPTIONS = [
  { value: 'alphabet', label: '字母排序' },
  { value: 'frequency', label: '詞頻排序' },
  { value: 'unlearned', label: '未學習優先' },
];

const VocabFilter: React.FC<VocabFilterProps> = ({
  search, onSearchChange,
  selectedBank, onBankChange,
  sort, onSortChange,
  banksInfo, onShowStats,
}) => {
  const [showBankTabs, setShowBankTabs] = useState<boolean>(true);

  const bankKeys = banksInfo?.banks && banksInfo.banks.length > 0
    ? ['all', ...banksInfo.banks]
    : ['all', 'gept', 'toeic', 'ielts'];

  return (
    <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm pt-4 pb-3 space-y-3">
      {/* 搜尋列 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜尋單字..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 rounded-xl bg-white"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl flex-shrink-0"
          onClick={onShowStats}
        >
          <BarChart3 className="w-4 h-4" />
        </Button>
      </div>

      {/* 字庫篩選標籤列 */}
      {showBankTabs && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:-mx-6 md:px-6 scrollbar-hide">
          {bankKeys.map(b => (
            <Badge
              key={b}
              variant={selectedBank === b ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 transition-all hover-elevate"
              onClick={() => onBankChange(b)}
            >
              {BANK_LABELS[b] || b}
              {b !== 'all' && banksInfo?.byBank?.[b] !== undefined && (
                <span className="ml-1 opacity-70">({banksInfo.byBank[b]})</span>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* 排序 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">排序：</span>
        <div className="flex gap-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                sort === opt.value
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => onSortChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VocabFilter;
