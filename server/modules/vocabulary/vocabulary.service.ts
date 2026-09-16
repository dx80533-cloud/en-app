import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  eq,
  and,
  count,
  desc,
  asc,
  ilike,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { vocabWords, vocabUserProgress } from '@server/database/schema';
import type {
  VocabWordWithProgress,
  WordListResponse,
  WordBanksInfo,
} from '@shared/api.interface';

interface GetWordListParams {
  page: number;
  pageSize: number;
  bank?: string;
  level?: string;
  search?: string;
  sort?: 'frq_desc' | 'word_asc';
  status?: string;
  userId: string | null;
}

interface GetFavoritesParams {
  page: number;
  pageSize: number;
  userId: string;
}

const DEFAULT_PROGRESS = {
  status: 'new',
  correctCount: 0,
  wrongCount: 0,
  familiarity: 0,
  isFavorite: false,
  lastReviewedAt: null,
} as const;

type WordRow = typeof vocabWords.$inferSelect;
type ProgressRow = typeof vocabUserProgress.$inferSelect;
type WordWithProgressRow = { word: WordRow; progress: ProgressRow | null };

@Injectable()
export class VocabularyService {
  private readonly logger = new Logger(VocabularyService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getWordList(params: GetWordListParams): Promise<WordListResponse> {
    const {
      page,
      pageSize: rawPageSize,
      bank,
      level,
      search,
      sort = 'word_asc',
      status,
      userId,
    } = params;

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, rawPageSize));
    const offset = (safePage - 1) * safePageSize;

    const isLoggedIn = userId !== null;
    const hasStatusFilter = status !== undefined && status !== null && status !== '';

    // Anon + non-new status = empty result
    if (!isLoggedIn && hasStatusFilter && status !== 'new') {
      return {
        items: [],
        total: 0,
        page: safePage,
        pageSize: safePageSize,
      };
    }

    const wordConditions = this.buildWordConditions({ bank, level, search });
    const orderClause = sort === 'frq_desc'
      ? [desc(vocabWords.frq), asc(vocabWords.word)]
      : [asc(vocabWords.word)];

    let rows: WordWithProgressRow[];
    let total: number;

    if (isLoggedIn) {
      const progressConditions: ReturnType<typeof and>[] = [];

      if (hasStatusFilter) {
        if (status === 'new') {
          progressConditions.push(
            or(
              isNull(vocabUserProgress.id),
              eq(vocabUserProgress.status, 'new'),
            ) as unknown as ReturnType<typeof and>,
          );
        } else {
          progressConditions.push(
            eq(vocabUserProgress.status, status!) as unknown as ReturnType<typeof and>,
          );
        }
      }

      const allConditions = [...wordConditions, ...progressConditions];
      const where = allConditions.length > 0
        ? and(...allConditions)
        : undefined;

      const baseQuery = this.db
        .select({
          word: vocabWords,
          progress: vocabUserProgress,
        })
        .from(vocabWords)
        .leftJoin(
          vocabUserProgress,
          and(
            eq(vocabUserProgress.wordId, vocabWords.id),
            eq(vocabUserProgress.userId, userId!),
          ),
        );

      const query = where ? baseQuery.where(where) : baseQuery;
      rows = await query.orderBy(...orderClause).limit(safePageSize).offset(offset);

      const countBase = this.db
        .select({ count: count() })
        .from(vocabWords)
        .leftJoin(
          vocabUserProgress,
          and(
            eq(vocabUserProgress.wordId, vocabWords.id),
            eq(vocabUserProgress.userId, userId!),
          ),
        );
      const countQuery = where ? countBase.where(where) : countBase;
      const totalResult = await countQuery;
      total = Number(totalResult[0]?.count ?? 0);
    } else {
      // Not logged in: just query words, no progress join
      const where = wordConditions.length > 0
        ? and(...wordConditions)
        : undefined;

      const baseQuery = this.db.select().from(vocabWords);
      const query = where ? baseQuery.where(where) : baseQuery;
      const wordRows: WordRow[] = await query
        .orderBy(...orderClause)
        .limit(safePageSize)
        .offset(offset);

      rows = wordRows.map((w: WordRow) => ({ word: w, progress: null }));

      const countBase = this.db.select({ count: count() }).from(vocabWords);
      const countQuery = where ? countBase.where(where) : countBase;
      const totalResult = await countQuery;
      total = Number(totalResult[0]?.count ?? 0);
    }

    const items: VocabWordWithProgress[] = rows.map((row: WordWithProgressRow) =>
      this.mapRowToWordWithProgress(row.word, row.progress),
    );

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  async getWordDetail(
    id: string,
    userId: string | null,
  ): Promise<VocabWordWithProgress | null> {
    let result: VocabWordWithProgress | null = null;

    if (userId !== null) {
      const rows = await this.db
        .select({
          word: vocabWords,
          progress: vocabUserProgress,
        })
        .from(vocabWords)
        .where(eq(vocabWords.id, id))
        .leftJoin(
          vocabUserProgress,
          and(
            eq(vocabUserProgress.wordId, vocabWords.id),
            eq(vocabUserProgress.userId, userId),
          ),
        )
        .limit(1);

      if (rows.length === 0) return null;
      result = this.mapRowToWordWithProgress(rows[0].word, rows[0].progress);
    } else {
      const rows = await this.db
        .select()
        .from(vocabWords)
        .where(eq(vocabWords.id, id))
        .limit(1);

      if (rows.length === 0) return null;
      result = this.mapRowToWordWithProgress(rows[0] as WordRow, null);
    }

    if (result && (!result.example || result.example.trim().length === 0)) {
      this.fillExampleInBackground(id, result.word).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`背景補例句失敗 ${result!.word}: ${message}`);
      });
    }

    return result;
  }

  private async fillExampleInBackground(
    wordId: string,
    wordText: string,
  ): Promise<void> {
    try {
      const example = await this.fetchExampleFromDictionary(wordText);
      if (example) {
        await this.db
          .update(vocabWords)
          .set({
            example,
            exampleZh: '',
          })
          .where(eq(vocabWords.id, wordId));
        this.logger.log(`已自動補齊例句: ${wordText}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`自動補例句抓取下失敗 ${wordText}: ${message}`);
    }
  }

  private async fetchExampleFromDictionary(word: string): Promise<string | null> {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) return null;
      const data = (await response.json()) as Array<{
        meanings?: Array<{
          definitions?: Array<{ example?: string; definition?: string }>;
        }>;
      }>;

      for (const entry of data) {
        if (!entry.meanings) continue;
        for (const meaning of entry.meanings) {
          if (!meaning.definitions) continue;
          for (const def of meaning.definitions) {
            if (def.example && def.example.trim().length > 0) {
              return def.example.trim();
            }
          }
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getBanksInfo(): Promise<WordBanksInfo> {
    const totalResult = await this.db
      .select({ count: count() })
      .from(vocabWords);
    const totalWords = Number(totalResult[0]?.count ?? 0);

    const levelRows = await this.db
      .select({
        level: vocabWords.level,
        count: count(),
      })
      .from(vocabWords)
      .groupBy(vocabWords.level);

    const levels: string[] = [];
    const byLevel: Record<string, number> = {};
    for (const row of levelRows) {
      if (row.level) {
        levels.push(row.level);
        byLevel[row.level] = Number(row.count);
      }
    }
    levels.sort();

    const bankResult = await this.db.execute(
      sql`
        SELECT unnest(banks) AS bank, COUNT(*)::int AS count
        FROM vocab_words
        GROUP BY unnest(banks)
        ORDER BY bank
      `,
    );

    const banks: string[] = [];
    const byBank: Record<string, number> = {};
    for (const row of bankResult as unknown as Array<{ bank: string; count: number }>) {
      if (row.bank) {
        banks.push(row.bank);
        byBank[row.bank] = Number(row.count);
      }
    }

    return {
      banks,
      levels,
      totalWords,
      byBank,
      byLevel,
    };
  }

  async toggleFavorite(
    wordId: string,
    userId: string,
  ): Promise<{ isFavorite: boolean }> {
    const wordExists = await this.db
      .select({ id: vocabWords.id })
      .from(vocabWords)
      .where(eq(vocabWords.id, wordId))
      .limit(1);

    if (wordExists.length === 0) {
      throw new NotFoundException('單字不存在');
    }

    const existing = await this.db
      .select({
        id: vocabUserProgress.id,
        isFavorite: vocabUserProgress.isFavorite,
      })
      .from(vocabUserProgress)
      .where(
        and(
          eq(vocabUserProgress.wordId, wordId),
          eq(vocabUserProgress.userId, userId),
        ),
      )
      .limit(1);

    let newIsFavorite: boolean;

    if (existing.length > 0) {
      newIsFavorite = !existing[0].isFavorite;
      await this.db
        .update(vocabUserProgress)
        .set({ isFavorite: newIsFavorite })
        .where(eq(vocabUserProgress.id, existing[0].id));
    } else {
      newIsFavorite = true;
      await this.db.insert(vocabUserProgress).values({
        userId,
        wordId,
        status: 'new',
        correctCount: 0,
        wrongCount: 0,
        familiarity: 0,
        isFavorite: true,
      });
    }

    return { isFavorite: newIsFavorite };
  }

  async getFavorites(params: GetFavoritesParams): Promise<WordListResponse> {
    const { page, pageSize: rawPageSize, userId } = params;

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, rawPageSize));
    const offset = (safePage - 1) * safePageSize;

    const baseCondition = and(
      eq(vocabUserProgress.userId, userId),
      eq(vocabUserProgress.isFavorite, true),
    );

    const rows = await this.db
      .select({
        word: vocabWords,
        progress: vocabUserProgress,
      })
      .from(vocabUserProgress)
      .innerJoin(
        vocabWords,
        eq(vocabUserProgress.wordId, vocabWords.id),
      )
      .where(baseCondition)
      .orderBy(asc(vocabWords.word))
      .limit(safePageSize)
      .offset(offset);

    const totalResult = await this.db
      .select({ count: count() })
      .from(vocabUserProgress)
      .where(baseCondition);

    const total = Number(totalResult[0]?.count ?? 0);

    const items: VocabWordWithProgress[] = rows.map((row) =>
      this.mapRowToWordWithProgress(row.word, row.progress),
    );

    return {
      items,
      total,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  private buildWordConditions(params: {
    bank?: string;
    level?: string;
    search?: string;
  }): Array<ReturnType<typeof eq> | ReturnType<typeof ilike> | ReturnType<typeof or> | ReturnType<typeof sql>> {
    const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof ilike> | ReturnType<typeof or> | ReturnType<typeof sql>> = [];

    if (params.bank) {
      conditions.push(
        sql`${vocabWords.banks} @> ARRAY[${params.bank}]::text[]` as unknown as ReturnType<typeof sql>,
      );
    }

    if (params.level) {
      conditions.push(eq(vocabWords.level, params.level));
    }

    if (params.search) {
      const searchTerm = `%${params.search}%`;
      conditions.push(
        or(
          ilike(vocabWords.word, searchTerm),
          ilike(vocabWords.zh, searchTerm),
        ),
      );
    }

    return conditions;
  }

  private mapRowToWordWithProgress(
    word: WordRow,
    progress: ProgressRow | null | undefined,
  ): VocabWordWithProgress {
    return {
      id: word.id,
      word: word.word,
      display: word.display,
      pos: word.pos ?? '',
      zh: word.zh,
      phonetic: word.phonetic ?? '',
      definition: word.definition ?? '',
      frq: word.frq ?? 0,
      note: word.note ?? '',
      academic: word.academic ?? '',
      example: word.example ?? '',
      exampleZh: word.exampleZh ?? '',
      banks: word.banks ?? [],
      level: word.level ?? '',
      status: progress?.status ?? DEFAULT_PROGRESS.status,
      correctCount: progress?.correctCount ?? DEFAULT_PROGRESS.correctCount,
      wrongCount: progress?.wrongCount ?? DEFAULT_PROGRESS.wrongCount,
      familiarity: progress?.familiarity ?? DEFAULT_PROGRESS.familiarity,
      isFavorite: progress?.isFavorite ?? DEFAULT_PROGRESS.isFavorite,
      lastReviewedAt: progress?.lastReviewedAt
        ? progress.lastReviewedAt.toISOString()
        : DEFAULT_PROGRESS.lastReviewedAt,
    };
  }
}
