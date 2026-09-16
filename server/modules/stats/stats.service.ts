import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type VocabDb } from '../../database/database.module';
import {
  vocabUserStats,
  vocabQuizRecords,
  vocabUserProgress,
} from '../../database/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import type { UserStats } from '../../../shared/api.interface';

interface WordProgressResponse {
  new: number;
  learning: number;
  reviewed: number;
  mastered: number;
  total: number;
}

interface QuizRecordItem {
  id: string;
  quizType: string;
  bank: string;
  level: string | null;
  totalQuestions: number;
  correctCount: number;
  score: number;
  durationSeconds: number;
  createdAt: string;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: VocabDb) {}

  async getOverview(userId: string): Promise<UserStats> {
    try {
      const result = await this.db
        .select()
        .from(vocabUserStats)
        .where(eq(vocabUserStats.userId, userId));

      if (result.length > 0) {
        const s = result[0];
        const computedLevel = Math.floor(s.xp / 100) + 1;
        return {
          xp: s.xp,
          level: computedLevel,
          streakDays: s.streakDays,
          lastStudyDate: s.lastStudyDate,
          totalStudied: s.totalStudied,
          totalCorrect: s.totalCorrect,
          totalWrong: s.totalWrong,
          maxStreak: s.maxStreak,
          totalQuizzes: s.totalQuizzes,
        };
      }

      // Create default stats record
      const inserted = await this.db
        .insert(vocabUserStats)
        .values({
          userId,
          xp: 0,
          level: 1,
          streakDays: 0,
          maxStreak: 0,
          totalStudied: 0,
          totalCorrect: 0,
          totalWrong: 0,
          totalQuizzes: 0,
        })
        .returning();

      const s = inserted[0];
      return {
        xp: s.xp,
        level: s.level,
        streakDays: s.streakDays,
        lastStudyDate: s.lastStudyDate,
        totalStudied: s.totalStudied,
        totalCorrect: s.totalCorrect,
        totalWrong: s.totalWrong,
        maxStreak: s.maxStreak,
        totalQuizzes: s.totalQuizzes,
      };
    } catch (error) {
      this.logger.error('取得使用者統計概覽失敗', JSON.stringify(error));
      throw error;
    }
  }

  async getRecentQuizzes(userId: string, limit: number): Promise<QuizRecordItem[]> {
    try {
      const records = await this.db
        .select()
        .from(vocabQuizRecords)
        .where(eq(vocabQuizRecords.userId, userId))
        .orderBy(desc(vocabQuizRecords.createdAt))
        .limit(limit);

      return records.map((r) => ({
        id: r.id,
        quizType: r.quizType,
        bank: r.bank,
        level: r.level,
        totalQuestions: r.totalQuestions,
        correctCount: r.correctCount,
        score: r.score,
        durationSeconds: r.durationSeconds,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
      }));
    } catch (error) {
      this.logger.error('取得最近測驗記錄失敗', JSON.stringify(error));
      throw error;
    }
  }

  async getWordProgress(userId: string): Promise<WordProgressResponse> {
    try {
      const statuses = ['new', 'learning', 'reviewed', 'mastered'];
      const counts: Record<string, number> = {
        new: 0,
        learning: 0,
        reviewed: 0,
        mastered: 0,
      };

      for (const status of statuses) {
        const result = await this.db
          .select({ count: count() })
          .from(vocabUserProgress)
          .where(
            and(
              eq(vocabUserProgress.userId, userId),
              eq(vocabUserProgress.status, status),
            ),
          );
        counts[status] = Number(result[0]?.count) || 0;
      }

      const total = counts.new + counts.learning + counts.reviewed + counts.mastered;

      return {
        new: counts.new,
        learning: counts.learning,
        reviewed: counts.reviewed,
        mastered: counts.mastered,
        total,
      };
    } catch (error) {
      this.logger.error('取得單字進度統計失敗', JSON.stringify(error));
      throw error;
    }
  }
}
