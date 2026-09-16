import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type VocabDb } from '../../database/database.module';
import {
  vocabWords,
  vocabUserProgress,
  vocabUserStats,
} from '../../database/schema';
import {
  eq,
  and,
  desc,
  asc,
  lte,
  sql,
  count,
  gte,
  notInArray,
  like,
} from 'drizzle-orm';
import type {
  VocabWordWithProgress,
  LearningSessionResult,
} from '../../../shared/api.interface';

const DAILY_GOAL = 20;
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

function familiarityToStatus(familiarity: number): string {
  if (familiarity <= 0) return 'new';
  if (familiarity <= 3) return 'learning';
  if (familiarity <= 7) return 'reviewed';
  return 'mastered';
}

function calculateNextReviewAt(familiarity: number, correct: boolean): Date {
  const now = new Date();
  if (!correct) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  let idx: number;
  if (familiarity <= 2) idx = 0;
  else if (familiarity <= 4) idx = 1;
  else if (familiarity <= 6) idx = 2;
  else if (familiarity <= 8) idx = 3;
  else idx = 4;
  const days = REVIEW_INTERVALS[Math.min(idx, REVIEW_INTERVALS.length - 1)];
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapWordWithProgress(row: {
  id: string;
  word: string;
  display: string;
  pos: string | null;
  zh: string;
  phonetic: string | null;
  definition: string | null;
  frq: number | null;
  note: string | null;
  academic: string | null;
  example: string | null;
  exampleZh: string | null;
  banks: string[];
  level: string | null;
  status: string;
  correctCount: number;
  wrongCount: number;
  familiarity: number;
  isFavorite: boolean;
  lastReviewedAt: Date | null;
}): VocabWordWithProgress {
  return {
    id: row.id,
    word: row.word,
    display: row.display,
    pos: row.pos ?? '',
    zh: row.zh,
    phonetic: row.phonetic ?? '',
    definition: row.definition ?? '',
    frq: row.frq ?? 0,
    note: row.note ?? '',
    academic: row.academic ?? '',
    example: row.example ?? '',
    exampleZh: row.exampleZh ?? '',
    banks: row.banks ?? [],
    level: row.level ?? '',
    status: row.status,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    familiarity: row.familiarity,
    isFavorite: row.isFavorite,
    lastReviewedAt: row.lastReviewedAt
      ? new Date(row.lastReviewedAt).toISOString()
      : null,
  };
}

function mapWordAsNew(w: typeof vocabWords.$inferSelect): VocabWordWithProgress {
  return {
    id: w.id,
    word: w.word,
    display: w.display,
    pos: w.pos ?? '',
    zh: w.zh,
    phonetic: w.phonetic ?? '',
    definition: w.definition ?? '',
    frq: w.frq ?? 0,
    note: w.note ?? '',
    academic: w.academic ?? '',
    example: w.example ?? '',
    exampleZh: w.exampleZh ?? '',
    banks: w.banks ?? [],
    level: w.level ?? '',
    status: 'new',
    correctCount: 0,
    wrongCount: 0,
    familiarity: 0,
    isFavorite: false,
    lastReviewedAt: null,
  };
}

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: VocabDb) {}

  async getDueWords(
    limit: number,
    mode: 'review' | 'new' | 'all',
    bank?: string,
    level?: string,
    userId?: string,
  ): Promise<VocabWordWithProgress[]> {
    try {
      if (!userId) {
        return this.getNewWords(limit, bank, level);
      }

      if (mode === 'review') {
        return this.getReviewWords(userId, limit, bank, level);
      }

      if (mode === 'new') {
        return this.getNewWordsForUser(userId, limit, bank, level);
      }

      // all mode: review first, then fill with new
      const reviewWords = await this.getReviewWords(userId, limit, bank, level);
      const remaining = limit - reviewWords.length;
      if (remaining <= 0) return reviewWords;

      const newWords = await this.getNewWordsForUser(
        userId,
        remaining,
        bank,
        level,
      );
      return [...reviewWords, ...newWords];
    } catch (error) {
      this.logger.error('取得待複習單字失敗', JSON.stringify(error));
      throw error;
    }
  }

  private async getNewWords(
    limit: number,
    bank?: string,
    level?: string,
  ): Promise<VocabWordWithProgress[]> {
    const conditions = this.buildWordConditions(bank, level);
    const words = await this.db
      .select()
      .from(vocabWords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(vocabWords.frq))
      .limit(limit);
    return words.map((w) => mapWordAsNew(w));
  }

  private async getNewWordsForUser(
    userId: string,
    limit: number,
    bank?: string,
    level?: string,
  ): Promise<VocabWordWithProgress[]> {
    const conditions = this.buildWordConditions(bank, level);
    const progressRows = await this.db
      .select({ wordId: vocabUserProgress.wordId })
      .from(vocabUserProgress)
      .where(eq(vocabUserProgress.userId, userId));
    const learnedIds = progressRows.map((r) => r.wordId);

    if (learnedIds.length > 0) {
      conditions.push(
        notInArray(vocabWords.id, learnedIds) as unknown as ReturnType<typeof eq>,
      );
    }

    const words = await this.db
      .select()
      .from(vocabWords)
      .where(and(...conditions))
      .orderBy(asc(vocabWords.frq))
      .limit(limit);
    return words.map((w) => mapWordAsNew(w));
  }

  private async getReviewWords(
    userId: string,
    limit: number,
    bank?: string,
    level?: string,
  ): Promise<VocabWordWithProgress[]> {
    const now = new Date();
    const wordConditions = this.buildWordConditions(bank, level);

    const rows = await this.db
      .select({
        id: vocabWords.id,
        word: vocabWords.word,
        display: vocabWords.display,
        pos: vocabWords.pos,
        zh: vocabWords.zh,
        phonetic: vocabWords.phonetic,
        definition: vocabWords.definition,
        frq: vocabWords.frq,
        note: vocabWords.note,
        academic: vocabWords.academic,
        example: vocabWords.example,
        exampleZh: vocabWords.exampleZh,
        banks: vocabWords.banks,
        level: vocabWords.level,
        status: vocabUserProgress.status,
        correctCount: vocabUserProgress.correctCount,
        wrongCount: vocabUserProgress.wrongCount,
        familiarity: vocabUserProgress.familiarity,
        isFavorite: vocabUserProgress.isFavorite,
        lastReviewedAt: vocabUserProgress.lastReviewedAt,
      })
      .from(vocabUserProgress)
      .innerJoin(vocabWords, eq(vocabUserProgress.wordId, vocabWords.id))
      .where(
        and(
          eq(vocabUserProgress.userId, userId),
          lte(vocabUserProgress.nextReviewAt, now),
          ...wordConditions,
        ),
      )
      .orderBy(
        asc(vocabUserProgress.familiarity),
        asc(vocabUserProgress.nextReviewAt),
      )
      .limit(limit);

    return rows.map((row) => mapWordWithProgress(row));
  }

  private buildWordConditions(
    bank?: string,
    level?: string,
  ): Array<ReturnType<typeof eq> | ReturnType<typeof like>> {
    const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof like>> = [];
    if (level) {
      conditions.push(eq(vocabWords.level, level));
    }
    if (bank) {
      conditions.push(
        like(vocabWords.banks, `%"${bank}"%`),
      );
    }
    return conditions;
  }

  async submitAnswer(
    userId: string,
    wordId: string,
    correct: boolean,
    _timeSpent?: number,
  ): Promise<LearningSessionResult> {
    try {
      return this.db.transaction((tx) => {
        const existing = tx
          .select()
          .from(vocabUserProgress)
          .where(
            and(
              eq(vocabUserProgress.userId, userId),
              eq(vocabUserProgress.wordId, wordId),
            ),
          ).all();

        const now = new Date();
        const prev = existing[0];
        const currentFamiliarity = prev?.familiarity ?? 0;
        const currentCorrectCount = prev?.correctCount ?? 0;
        const currentWrongCount = prev?.wrongCount ?? 0;

        const newFamiliarity = Math.max(
          0,
          currentFamiliarity + (correct ? 2 : -3),
        );
        const newStatus = familiarityToStatus(newFamiliarity);
        const nextReviewAt = calculateNextReviewAt(newFamiliarity, correct);
        const xpEarned = correct ? 10 : 3;

        if (prev) {
          tx
            .update(vocabUserProgress)
            .set({
              correctCount: currentCorrectCount + (correct ? 1 : 0),
              wrongCount: currentWrongCount + (correct ? 0 : 1),
              familiarity: newFamiliarity,
              status: newStatus,
              lastReviewedAt: now,
              nextReviewAt: nextReviewAt,
            })
            .where(
              and(
                eq(vocabUserProgress.userId, userId),
                eq(vocabUserProgress.wordId, wordId),
              ),
            );
        } else {
          tx.insert(vocabUserProgress).values({
            userId,
            wordId,
            correctCount: correct ? 1 : 0,
            wrongCount: correct ? 0 : 1,
            familiarity: newFamiliarity,
            status: newStatus,
            lastReviewedAt: now,
            nextReviewAt: nextReviewAt,
          });
        }

        // Update user stats
        const todayStr = getTodayDateString();
        const yesterdayStr = getYesterdayDateString();
        const statsRow = tx
          .select()
          .from(vocabUserStats)
          .where(eq(vocabUserStats.userId, userId)).all();

        if (statsRow.length > 0) {
          const s = statsRow[0];
          const lastStudy = s.lastStudyDate;
          let newStreakDays = s.streakDays;
          let newMaxStreak = s.maxStreak;

          if (lastStudy !== todayStr) {
            if (lastStudy === yesterdayStr) {
              newStreakDays = s.streakDays + 1;
            } else {
              newStreakDays = 1;
            }
            if (newStreakDays > newMaxStreak) {
              newMaxStreak = newStreakDays;
            }
          }

          const newXp = s.xp + xpEarned;
          const newLevel = Math.floor(newXp / 100) + 1;

          tx
            .update(vocabUserStats)
            .set({
              xp: newXp,
              level: newLevel,
              streakDays: newStreakDays,
              maxStreak: newMaxStreak,
              lastStudyDate: todayStr,
              totalStudied: s.totalStudied + 1,
              totalCorrect: s.totalCorrect + (correct ? 1 : 0),
              totalWrong: s.totalWrong + (correct ? 0 : 1),
            })
            .where(eq(vocabUserStats.userId, userId));
        } else {
          const newXp = xpEarned;
          const newLevel = Math.floor(newXp / 100) + 1;
          tx.insert(vocabUserStats).values({
            userId,
            xp: newXp,
            level: newLevel,
            streakDays: 1,
            maxStreak: 1,
            lastStudyDate: todayStr,
            totalStudied: 1,
            totalCorrect: correct ? 1 : 0,
            totalWrong: correct ? 0 : 1,
          });
        }

        return {
          correct,
          wordId,
          xpEarned,
          newFamiliarity,
          newStatus,
        };
      });
    } catch (error) {
      this.logger.error('提交答題結果失敗', JSON.stringify(error));
      throw error;
    }
  }

  async getDailyGoal(userId: string): Promise<{
    dailyGoal: number;
    todayStudied: number;
    todayCorrect: number;
  }> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Count unique words reviewed today
      const studiedResult = await this.db
        .select({ count: count() })
        .from(vocabUserProgress)
        .where(
          and(
            eq(vocabUserProgress.userId, userId),
            gte(vocabUserProgress.lastReviewedAt, todayStart),
          ),
        );
      const todayStudied = Number(studiedResult[0]?.count) || 0;

      // Count words studied today with correctCount > wrongCount (approximate)
      const correctResult = await this.db
        .select({ count: count() })
        .from(vocabUserProgress)
        .where(
          and(
            eq(vocabUserProgress.userId, userId),
            gte(vocabUserProgress.lastReviewedAt, todayStart),
            sql`${vocabUserProgress.correctCount} > ${vocabUserProgress.wrongCount}`,
          ),
        );
      const todayCorrect = Number(correctResult[0]?.count) || 0;

      return {
        dailyGoal: DAILY_GOAL,
        todayStudied,
        todayCorrect,
      };
    } catch (error) {
      this.logger.error('取得每日目標進度失敗', JSON.stringify(error));
      throw error;
    }
  }
}
