import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, inArray, sql, desc, gt } from 'drizzle-orm';
import {
  vocabWords,
  vocabUserProgress,
  vocabUserStats,
  vocabQuizRecords,
} from '@server/database/schema';
import type { QuizQuestion, QuizResult, VocabWord } from '@shared/api.interface';

interface GenerateOptions {
  count: number;
  bank?: string;
  level?: string;
  types: QuizQuestion['type'][];
  mode: 'random' | 'review' | 'weak';
  userId?: string;
}

interface SubmitQuizDto {
  quizType: string;
  bank: string;
  level: string;
  answers: Array<{
    questionId: string;
    wordId: string;
    userAnswer: string;
    correct: boolean;
    timeSpent?: number;
  }>;
  durationSeconds: number;
}

interface QuizDetailItem {
  wordId: string;
  word: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
}

// Spaced repetition intervals (in days) based on familiarity 0-10
const REVIEW_INTERVALS_DAYS: number[] = [0, 1, 2, 4, 7, 15, 30, 60, 120, 180, 365];

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async generate(opts: GenerateOptions): Promise<QuizQuestion[]> {
    const { count, bank, level, types, mode, userId } = opts;

    // Fetch candidate words based on mode
    const words = await this.getCandidateWords(mode, bank, level, userId, count * 3);

    if (words.length === 0) {
      return [];
    }

    // Shuffle words
    const shuffled = this.shuffleArray([...words]);

    // Fetch distractor pool (same bank / level)
    const distractorPool = await this.getDistractorPool(bank, level);

    const questions: QuizQuestion[] = [];
    const usedWordIds = new Set<string>();

    for (const word of shuffled) {
      if (questions.length >= count) break;
      if (usedWordIds.has(word.id)) continue;

      // Pick a random type from the allowed types
      const availableTypes = types.filter((t: QuizQuestion['type']) => {
        if ((t === 'cloze' || t === 'spelling') && !word.example) return false;
        return true;
      });
      if (availableTypes.length === 0) continue;

      const questionType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const question = this.createQuestion(word, questionType, distractorPool);
      if (question) {
        questions.push(question);
        usedWordIds.add(word.id);
      }
    }

    return questions;
  }

  async submit(userId: string, dto: SubmitQuizDto): Promise<QuizResult> {
    const { answers, durationSeconds, quizType, bank, level } = dto;
    const totalQuestions = answers.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Calculate XP
    let xpEarned: number;
    if (score >= 80) {
      xpEarned = totalQuestions * 15;
    } else if (score >= 60) {
      xpEarned = totalQuestions * 10;
    } else {
      xpEarned = totalQuestions * 5;
    }

    // Build details
    const wordIds = answers.map((a) => a.wordId);
    const wordRecords = await this.db
      .select({ id: vocabWords.id, word: vocabWords.word })
      .from(vocabWords)
      .where(inArray(vocabWords.id, wordIds));
    const wordMap = new Map<string, string>();
    for (const w of wordRecords) {
      wordMap.set(w.id, w.word);
    }

    const details: QuizDetailItem[] = answers.map((a) => ({
      wordId: a.wordId,
      word: wordMap.get(a.wordId) ?? '',
      correct: a.correct,
      userAnswer: a.userAnswer,
      correctAnswer: wordMap.get(a.wordId) ?? '',
    }));

    await this.db.transaction(async (tx) => {
      // Insert quiz record
      await tx.insert(vocabQuizRecords).values({
        userId,
        quizType,
        bank,
        level,
        totalQuestions,
        correctCount,
        score,
        durationSeconds,
        details: details as unknown as Record<string, unknown>,

      });

      // Update user stats
      const existingStats = await tx
        .select()
        .from(vocabUserStats)
        .where(sql`(${vocabUserStats.userId}).user_id = ${userId}`)
        .limit(1);

      const wrongCount = totalQuestions - correctCount;

      if (existingStats.length > 0) {
        await tx
          .update(vocabUserStats)
          .set({
            totalQuizzes: existingStats[0].totalQuizzes + 1,
            xp: existingStats[0].xp + xpEarned,
            totalStudied: existingStats[0].totalStudied + totalQuestions,
            totalCorrect: existingStats[0].totalCorrect + correctCount,
            totalWrong: existingStats[0].totalWrong + wrongCount,
            updatedAt: new Date(),
          })
          .where(sql`(${vocabUserStats.userId}).user_id = ${userId}`);
      } else {
        await tx.insert(vocabUserStats).values({
          userId,
          totalQuizzes: 1,
          xp: xpEarned,
          totalStudied: totalQuestions,
          totalCorrect: correctCount,
          totalWrong: wrongCount,
        });
      }

      // Update each word's progress
      for (const answer of answers) {
        await this.updateProgress(tx, userId, answer.wordId, answer.correct);
      }
    });

    return {
      totalQuestions,
      correctCount,
      score,
      xpEarned,
      details,
    };
  }

  // --- Private helpers ---

  private async getCandidateWords(
    mode: 'random' | 'review' | 'weak',
    bank: string | undefined,
    level: string | undefined,
    userId: string | undefined,
    limit: number,
  ): Promise<VocabWord[]> {
    const baseConditions = this.buildWhereConditions(bank, level);

    if (mode === 'random') {
      return this.db
        .select()
        .from(vocabWords)
        .where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
        .orderBy(sql`random()`)
        .limit(limit) as unknown as VocabWord[];
    }

    if (mode === 'review' && userId) {
      // Words user has already learned (status != 'new')
      const results = await this.db
        .select()
        .from(vocabUserProgress)
        .innerJoin(vocabWords, eq(vocabUserProgress.wordId, vocabWords.id))
        .where(
          and(
            sql`(${vocabUserProgress.userId}).user_id = ${userId}`,
            sql`${vocabUserProgress.status} != 'new'`,
            ...baseConditions,
          ),
        )
        .orderBy(desc(vocabUserProgress.nextReviewAt))
        .limit(limit);

      return results.map((r) => r.vocab_words) as unknown as VocabWord[];
    }

    if (mode === 'weak' && userId) {
      // Words with high error rate
      const results = await this.db
        .select()
        .from(vocabUserProgress)
        .innerJoin(vocabWords, eq(vocabUserProgress.wordId, vocabWords.id))
        .where(
          and(
            sql`(${vocabUserProgress.userId}).user_id = ${userId}`,
            gt(vocabUserProgress.wrongCount, 0),
            ...baseConditions,
          ),
        )
        .orderBy(
          sql`(${vocabUserProgress.wrongCount}::float / NULLIF(${vocabUserProgress.correctCount} + ${vocabUserProgress.wrongCount}, 0)) desc`,
        )
        .limit(limit);

      return results.map((r) => r.vocab_words) as unknown as VocabWord[];
    }

    return [];
  }

  private async getDistractorPool(
    bank: string | undefined,
    level: string | undefined,
  ): Promise<VocabWord[]> {
    const conditions = this.buildWhereConditions(bank, level);
    const results = await this.db
      .select()
      .from(vocabWords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(200);
    return results as unknown as VocabWord[];
  }

  private buildWhereConditions(
    bank: string | undefined,
    level: string | undefined,
  ) {
    const conditions = [];
    if (bank) {
      conditions.push(sql`${bank} = ANY(${vocabWords.banks})`);
    }
    if (level) {
      conditions.push(eq(vocabWords.level, level));
    }
    return conditions;
  }

  private createQuestion(
    word: VocabWord,
    type: QuizQuestion['type'],
    distractorPool: VocabWord[],
  ): QuizQuestion | null {
    const otherWords = distractorPool.filter((w) => w.id !== word.id);
    const shuffledOthers = this.shuffleArray([...otherWords]);

    switch (type) {
      case 'en2zh': {
        const distractors = this.pickDistractors(shuffledOthers, 3, 'zh', word.zh);
        if (!distractors) return null;
        const allOptions = this.shuffleArray([word.zh, ...distractors]);
        return {
          id: `q_${word.id}_en2zh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'en2zh',
          word,
          question: word.display,
          options: allOptions,
          correctAnswer: word.zh,
        };
      }
      case 'zh2en': {
        const distractors = this.pickDistractors(shuffledOthers, 3, 'word', word.word);
        if (!distractors) return null;
        const allOptions = this.shuffleArray([word.word, ...distractors]);
        return {
          id: `q_${word.id}_zh2en_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'zh2en',
          word,
          question: word.zh,
          options: allOptions,
          correctAnswer: word.word,
        };
      }
      case 'spelling': {
        if (!word.example) return null;
        return {
          id: `q_${word.id}_spelling_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'spelling',
          word,
          question: `${word.zh} ${word.phonetic ? `[${word.phonetic}]` : ''}`.trim(),
          options: [],
          correctAnswer: word.word,
        };
      }
      case 'cloze': {
        if (!word.example) return null;
        const clozeSentence = this.createClozeSentence(word.example, word.word);
        if (!clozeSentence) return null;
        const distractors = this.pickDistractors(shuffledOthers, 3, 'word', word.word);
        if (!distractors) return null;
        const allOptions = this.shuffleArray([word.word, ...distractors]);
        return {
          id: `q_${word.id}_cloze_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'cloze',
          word,
          question: clozeSentence,
          options: allOptions,
          correctAnswer: word.word,
        };
      }
      default:
        return null;
    }
  }

  private pickDistractors(
    pool: VocabWord[],
    count: number,
    field: 'zh' | 'word',
    correctValue: string,
  ): string[] | null {
    const values: string[] = [];
    const seen = new Set<string>([correctValue]);
    for (const w of pool) {
      const val = w[field];
      if (val && !seen.has(val)) {
        values.push(val);
        seen.add(val);
        if (values.length >= count) break;
      }
    }
    return values.length >= count ? values : null;
  }

  private createClozeSentence(example: string, word: string): string | null {
    if (!example || !word) return null;
    // Case-insensitive replace first occurrence of the word with ____
    const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
    if (!regex.test(example)) return null;
    return example.replace(regex, '____');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Update user progress for a single word answer
  private async updateProgress(
    tx: PostgresJsDatabase,
    userId: string,
    wordId: string,
    correct: boolean,
  ): Promise<void> {
    const existing = await tx
      .select()
      .from(vocabUserProgress)
      .where(
        and(
          sql`(${vocabUserProgress.userId}).user_id = ${userId}`,
          eq(vocabUserProgress.wordId, wordId),
        ),
      )
      .limit(1);

    const now = new Date();

    if (existing.length === 0) {
      // Create new progress record
      const newFamiliarity = correct ? 1 : 0;
      const newStatus = correct ? 'learning' : 'new';
      const nextReviewDays = REVIEW_INTERVALS_DAYS[Math.min(newFamiliarity, REVIEW_INTERVALS_DAYS.length - 1)];
      const nextReviewDate = new Date(now.getTime() + nextReviewDays * 24 * 60 * 60 * 1000);

      await tx.insert(vocabUserProgress).values({
        userId,
        wordId,
        status: newStatus,
        correctCount: correct ? 1 : 0,
        wrongCount: correct ? 0 : 1,
        lastReviewedAt: now,
        nextReviewAt: nextReviewDate,
        familiarity: newFamiliarity,
      });
      return;
    }

    const record = existing[0];
    let newFamiliarity: number;
    let newCorrectCount = record.correctCount;
    let newWrongCount = record.wrongCount;

    if (correct) {
      newCorrectCount += 1;
      newFamiliarity = Math.min(record.familiarity + 1, 10);
    } else {
      newWrongCount += 1;
      newFamiliarity = Math.max(Math.floor(record.familiarity / 2), 0);
    }

    // Determine new status
    let newStatus: string;
    if (newFamiliarity >= 8) {
      newStatus = 'mastered';
    } else if (newFamiliarity >= 4) {
      newStatus = 'reviewing';
    } else if (newFamiliarity >= 1) {
      newStatus = 'learning';
    } else {
      newStatus = 'new';
    }

    const nextReviewDays = REVIEW_INTERVALS_DAYS[Math.min(newFamiliarity, REVIEW_INTERVALS_DAYS.length - 1)];
    const nextReviewDate = new Date(now.getTime() + nextReviewDays * 24 * 60 * 60 * 1000);

    await tx
      .update(vocabUserProgress)
      .set({
        status: newStatus,
        correctCount: newCorrectCount,
        wrongCount: newWrongCount,
        lastReviewedAt: now,
        nextReviewAt: nextReviewDate,
        familiarity: newFamiliarity,
        updatedAt: now,
      })
      .where(eq(vocabUserProgress.id, record.id));
  }
}
