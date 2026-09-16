import { useEffect, useRef, useState } from 'react';
import { logger } from '@client/src/lib/logger';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, X, BookOpen, Loader2,
} from 'lucide-react';
import { vocabularyApi } from '@/api';
import type { VocabWordWithProgress, WordBanksInfo } from '@shared/api.interface';
import VocabFilter from './VocabFilter';
import WordItem from './WordItem';
import {
  Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia,
} from '@/components/ui/empty';

const PAGE_SIZE = 20;

const BANK_LABELS: Record<string, string> = {
  all: '全部',
  gept: 'GEPT',
  toeic: 'TOEIC',
  ielts: 'IELTS',
};

type SortType = 'alphabet' | 'frequency' | 'unlearned';

const VocabularyPage: React.FC = () => {
  const [search, setSearch] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [sort, setSort] = useState<SortType>('alphabet');
  const [words, setWords] = useState<VocabWordWithProgress[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [banksInfo, setBanksInfo] = useState<WordBanksInfo | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [learnedCount, setLearnedCount] = useState<number>(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 載入字庫資訊
  useEffect(() => {
    const loadBanksInfo = async (): Promise<void> => {
      try {
        const info = await vocabularyApi.getBanksInfo();
        setBanksInfo(info);
      } catch (err) {
        logger.error('load banks info failed', JSON.stringify(err));
      }
    };
    loadBanksInfo();
  }, []);

  // 載入單字列表
  const loadWords = async (pageNum: number, reset = false): Promise<void> => {
    setLoading(true);
    try {
      const res = await vocabularyApi.getWords({
        page: pageNum,
        pageSize: PAGE_SIZE,
        bank: selectedBank === 'all' ? undefined : selectedBank,
        search: search || undefined,
        sort,
      });
      if (reset) {
        setWords(res.items);
      } else {
        setWords(prev => [...prev, ...res.items]);
      }
      setTotal(res.total);
      setHasMore(pageNum * PAGE_SIZE < res.total);
      setLearnedCount(prev => reset
        ? res.items.filter(w => w.status !== 'unlearned').length
        : prev + res.items.filter(w => w.status !== 'unlearned').length
      );
    } catch (err) {
      logger.error('load words failed', JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  // 初次載入 & 篩選變更時重置
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadWords(1, true);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBank, sort, search]);

  // 無限滾動
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadWords(nextPage);
        }
      },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, page]);

  const handleToggleFavorite = async (wordId: string): Promise<void> => {
    await vocabularyApi.toggleFavorite(wordId);
    setWords(prev => prev.map(w =>
      w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w
    ));
  };

  const learnedPercent = total > 0 ? Math.round((learnedCount / total) * 100) : 0;

  return (
    <div className="page-enter px-4 md:px-6 pb-8 max-w-3xl mx-auto">
      <div className="pt-6 pb-2">
        <h1 className="text-2xl font-bold text-foreground">字庫瀏覽</h1>
        <p className="text-sm text-muted-foreground mt-1">
          共 {total} 個單字 · 已學 {learnedCount} 個
        </p>
      </div>

      <VocabFilter
        search={search}
        onSearchChange={setSearch}
        selectedBank={selectedBank}
        onBankChange={setSelectedBank}
        sort={sort}
        onSortChange={(v) => setSort(v as SortType)}
        banksInfo={banksInfo}
        onShowStats={() => setShowStatsModal(true)}
      />

      {/* 單字列表 */}
      <div className="space-y-2.5 mt-2">
        {words.map((w: VocabWordWithProgress) => (
          <WordItem
            key={w.id}
            word={w}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}

        {!loading && words.length === 0 && (
          <Empty className="mt-12">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-primary/10 text-primary/70">
                <BookOpen className="w-6 h-6" />
              </EmptyMedia>
              <EmptyTitle>找不到符合的單字</EmptyTitle>
              <EmptyDescription>
                試試更換篩選條件或調整關鍵字
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <div ref={sentinelRef} className="h-4" />

        {loading && (
          <div className="flex justify-center py-4">
             <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
      </div>

      {/* 頁尾統計 */}
      {total > 0 && (
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-foreground">學習進度</span>
            <span className="text-muted-foreground">
              {learnedCount} / {total}（{learnedPercent}%）
            </span>
          </div>
          <Progress value={learnedPercent} className="h-2 bg-muted" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>未學 {total - learnedCount}</span>
            <span>已學 {learnedCount}</span>
          </div>
        </div>
      )}

      {/* 字庫統計彈窗 */}
      {showStatsModal && banksInfo && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4"
          onClick={() => setShowStatsModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <BarChart3 className="w-5 h-5 text-primary" />
                字庫統計
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setShowStatsModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-center py-4 bg-primary/10 rounded-xl">
              <div className="text-sm text-primary">總單字數</div>
              <div className="text-3xl font-bold text-primary">{banksInfo.totalWords}</div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {banksInfo.banks.map(bank => {
                const count = banksInfo.byBank[bank] || 0;
                const pct = banksInfo.totalWords > 0
                  ? Math.round((count / banksInfo.totalWords) * 100)
                  : 0;
                return (
                  <div key={bank} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{BANK_LABELS[bank] || bank}</span>
                      <span className="text-muted-foreground">{count} 字</span>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-muted" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularyPage;
