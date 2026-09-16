import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { logger } from '@client/src/lib/logger';
import {
  Heart,
  Search,
  ArrowDownAZ,
  Clock,
  BookOpen,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import WordCard from '@/components/WordCard';
import { vocabularyApi } from '@/api';
import type { VocabWordWithProgress } from '@shared/api.interface';

const BANK_TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'gept', label: 'GEPT' },
  { key: 'toeic', label: 'TOEIC' },
  { key: 'ielts', label: 'IELTS' },
];

const CollectionPage: React.FC = () => {
  const [bank, setBank] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<'alphabetical' | 'favoritedAt'>(
    'favoritedAt',
  );
  const [items, setItems] = useState<VocabWordWithProgress[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [searchDebounce, setSearchDebounce] = useState<string>('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 搜尋防抖
  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setSearchDebounce(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 篩選/排序/搜尋變更時重置列表
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [bank, sort, searchDebounce]);

  const loadFavorites = useCallback(async (): Promise<void> => {
    if (loading || !hasMore || !isLoggedIn) return;
    setLoading(true);
    try {
      const currentPage: number = items.length === 0 ? 1 : page;
      const response = await vocabularyApi.getFavorites({
        page: currentPage,
        pageSize,
        bank: bank === 'all' ? undefined : bank,
        search: searchDebounce || undefined,
        sort,
      });
      setTotal(response.total);
      if (currentPage === 1) {
        setItems(response.items);
      } else {
        setItems((prev) => [...prev, ...response.items]);
      }
      setHasMore(currentPage * pageSize < response.total);
      setPage(currentPage + 1);
    } catch (err) {
      if (err && typeof err === 'object' && 'response' in err) {
        const resp: unknown = (err as { response?: { status?: number } })
          .response;
        if (resp && typeof resp === 'object' && 'status' in resp) {
          if ((resp as { status: number }).status === 401) {
            setIsLoggedIn(false);
          }
        }
      }
      logger.error('loadFavorites failed', { err: JSON.stringify(err) });
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, isLoggedIn, bank, searchDebounce, sort, page, pageSize, items.length]);

  // 初始加載與篩選變更時加載
  useEffect(() => {
    if (isLoggedIn && items.length === 0 && hasMore) {
      void loadFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, sort, searchDebounce, isLoggedIn]);

  // 無限滾動
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries[0]?.isIntersecting && hasMore && !loading && isLoggedIn) {
          void loadFavorites();
        }
      },
      { threshold: 0.1 },
    );
    const el: HTMLDivElement | null = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loading, isLoggedIn, loadFavorites]);

  const handleToggleFavorite = useCallback(
    (wordId: string): void => {
      // 樂觀更新：從列表中移除
      setItems((prev) => prev.filter((w: VocabWordWithProgress) => w.id !== wordId));
      setTotal((prev) => Math.max(0, prev - 1));
      void vocabularyApi.toggleFavorite(wordId).catch((err) => {
        logger.error('toggleFavorite failed', {
          wordId,
          err: JSON.stringify(err),
        });
        // 失敗時恢復（簡易處理，重新加載第一頁）
        setItems([]);
        setPage(1);
        setHasMore(true);
      });
    },
    [],
  );

  // 未登入提示
  if (!isLoggedIn) {
    return (
      <div className="page-enter min-h-screen bg-background px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">
            我的收藏
          </h1>
          <div className="rounded-2xl bg-card border border-border shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              登入後即可收藏單字
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              登入後即可收藏單字並跨裝置同步，隨時隨地複習你標記的重要單字！
            </p>
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-md transition-shadow">
              <LogIn className="w-4 h-4 mr-2" />
              立即登入
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const showEmpty: boolean = !loading && items.length === 0;

  return (
    <div className="page-enter min-h-screen bg-background px-4 md:px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-destructive bg-clip-text text-transparent">
            我的收藏
          </h1>
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/20">
            <Heart className="w-3 h-3 mr-1 fill-destructive" />
            {total} 字
          </Badge>
        </div>

        {/* 頂部篩選區 */}
        <div className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-4">
          {/* 字庫篩選標籤列 */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {BANK_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setBank(tab.key)}
                className={
                  'whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ' +
                  (bank === tab.key
                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md'
                    : 'bg-muted text-foreground hover:bg-border')
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 搜尋 + 排序 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜尋收藏的單字..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                 className="pl-10 rounded-xl border-border bg-background focus:bg-card"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sort === 'alphabetical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSort('alphabetical')}
                className="rounded-xl"
              >
                <ArrowDownAZ className="w-4 h-4 mr-1.5" />
                依字母
              </Button>
              <Button
                variant={sort === 'favoritedAt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSort('favoritedAt')}
                className="rounded-xl"
              >
                <Clock className="w-4 h-4 mr-1.5" />
                收藏時間
              </Button>
            </div>
          </div>
        </div>

        {/* 空態 */}
        {showEmpty && (
          <Empty className="rounded-2xl border-border bg-card py-12">
            <EmptyHeader>
              <EmptyMedia>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-primary/70" />
                </div>
              </EmptyMedia>
                <EmptyTitle className="text-lg font-semibold text-foreground">
                還沒有收藏任何單字
              </EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
                <EmptyDescription className="text-muted-foreground">
                去字庫頁逛逛，把重要的單字加入收藏吧！
              </EmptyDescription>
              <Button asChild className="mt-4 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl">
                <Link to="/vocabulary">
                  <BookOpen className="w-4 h-4 mr-2" />
                  前往字庫
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {/* 收藏單字網格 */}
        {items.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-ai-section-type="card-list"
          >
            {items.map((word: VocabWordWithProgress) => (
              <WordCard
                key={word.id}
                word={word}
                onToggleFavorite={handleToggleFavorite}
                showFavorite={true}
              />
            ))}
          </div>
        )}

        {/* 滾動哨兵 + 加載更多 */}
        <div ref={sentinelRef} className="h-4" />
        {loading && (
          <div className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              載入中...
            </div>
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            已經到底囉～ 共 {total} 個收藏單字
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
