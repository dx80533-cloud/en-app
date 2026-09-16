import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type VocabDb } from '../../database/database.module';
import { eq, and, inArray, sql, desc, gt, like } from 'drizzle-orm';
import {
  vocabWords,
  vocabUserProgress,
  vocabUserStats,
  vocabQuizRecords,
} from '../../database/schema';
import type {
  ListeningQuestion,
  ListeningQuestionType,
  ListeningResult,
  VocabWord,
} from '../../../shared/api.interface';

interface GenerateOptions {
  count: number;
  bank: string;
  level?: string;
  types: ListeningQuestionType[];
  mode: 'random' | 'review' | 'weak';
  userId?: string;
}

interface SubmitListeningDto {
  bank: string;
  level: string;
  answers: Array<{
    wordId: string;
    userAnswer: string;
    correct: boolean;
    type: ListeningQuestionType;
    timeSpent?: number;
  }>;
  durationSeconds: number;
}

const REVIEW_INTERVALS_DAYS: number[] = [0, 1, 2, 4, 7, 15, 30, 60, 120, 180, 365];

@Injectable()
export class ListeningService {
  private readonly logger = new Logger(ListeningService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: VocabDb) {}

  async generate(opts: GenerateOptions): Promise<ListeningQuestion[]> {
    const { count, bank, level, types, mode, userId } = opts;

    const words = await this.getCandidateWords(mode, bank, level, userId, count * 4);

    if (words.length === 0) {
      return [];
    }

    const shuffled = this.shuffleArray([...words]);
    const distractorPool = await this.getDistractorPool(bank, level);

    const questions: ListeningQuestion[] = [];
    const usedWordIds = new Set<string>();

    for (const word of shuffled) {
      if (questions.length >= count) break;
      if (usedWordIds.has(word.id)) continue;

      const availableTypes = types.filter((t: ListeningQuestionType) => {
        if ((t === 'listenSentence') && !word.example) return false;
        return true;
      });
      if (availableTypes.length === 0) continue;

      const questionType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const question = this.createListeningQuestion(word, questionType, distractorPool);
      if (question) {
        questions.push(question);
        usedWordIds.add(word.id);
      }
    }

    return questions;
  }

  async submit(userId: string, dto: SubmitListeningDto): Promise<ListeningResult> {
    const { answers, durationSeconds, bank, level } = dto;
    const totalQuestions = answers.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    let xpEarned: number;
    if (score >= 80) {
      xpEarned = totalQuestions * 18;
    } else if (score >= 60) {
      xpEarned = totalQuestions * 12;
    } else {
      xpEarned = totalQuestions * 6;
    }

    const wordIds = answers.map((a) => a.wordId);
    const wordRecords = await this.db
      .select({ id: vocabWords.id, word: vocabWords.word })
      .from(vocabWords)
      .where(inArray(vocabWords.id, wordIds));
    const wordMap = new Map<string, string>();
    for (const w of wordRecords) {
      wordMap.set(w.id, w.word);
    }

    const details = answers.map((a) => ({
      wordId: a.wordId,
      word: wordMap.get(a.wordId) ?? '',
      correct: a.correct,
      userAnswer: a.userAnswer,
      correctAnswer: wordMap.get(a.wordId) ?? '',
      type: a.type,
    }));

    this.db.transaction((tx) => {
      tx.insert(vocabQuizRecords).values({
        userId,
        quizType: `listening_${level || 'all'}`,
        bank,
        level,
        totalQuestions,
        correctCount,
        score,
        durationSeconds,
        details: details as unknown as Record<string, unknown>,
      });

      const existingStats = tx
        .select()
        .from(vocabUserStats)
        .where(eq(vocabUserStats.userId, userId))
        .limit(1).all();

      const wrongCount = totalQuestions - correctCount;

      if (existingStats.length > 0) {
        tx
          .update(vocabUserStats)
          .set({
            totalQuizzes: existingStats[0].totalQuizzes + 1,
            xp: existingStats[0].xp + xpEarned,
            totalStudied: existingStats[0].totalStudied + totalQuestions,
            totalCorrect: existingStats[0].totalCorrect + correctCount,
            totalWrong: existingStats[0].totalWrong + wrongCount,
            updatedAt: new Date(),
          })
          .where(eq(vocabUserStats.userId, userId));
      } else {
        tx.insert(vocabUserStats).values({
          userId,
          totalQuizzes: 1,
          xp: xpEarned,
          totalStudied: totalQuestions,
          totalCorrect: correctCount,
          totalWrong: wrongCount,
        });
      }

      for (const answer of answers) {
        this.updateProgress(tx, userId, answer.wordId, answer.correct);
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

  private async getCandidateWords(
    mode: 'random' | 'review' | 'weak',
    bank: string,
    level: string | undefined,
    userId: string | undefined,
    limit: number,
  ): Promise<VocabWord[]> {
    const baseConditions = this.buildWhereConditions(bank, level);

    if (mode === 'random') {
      return this.db
        .select()
        .from(vocabWords)
        .where(and(...baseConditions))
        .orderBy(sql`random()`)
        .limit(limit) as unknown as VocabWord[];
    }

    if (mode === 'review' && userId) {
      const results = await this.db
        .select()
        .from(vocabUserProgress)
        .innerJoin(vocabWords, eq(vocabUserProgress.wordId, vocabWords.id))
        .where(
          and(
            eq(vocabUserProgress.userId, userId),
            sql`${vocabUserProgress.status} != 'new'`,
            ...baseConditions,
          ),
        )
        .orderBy(desc(vocabUserProgress.nextReviewAt))
        .limit(limit);
      return results.map((r) => r.vocab_words) as unknown as VocabWord[];
    }

    if (mode === 'weak' && userId) {
      const results = await this.db
        .select()
        .from(vocabUserProgress)
        .innerJoin(vocabWords, eq(vocabUserProgress.wordId, vocabWords.id))
        .where(
          and(
            eq(vocabUserProgress.userId, userId),
            gt(vocabUserProgress.wrongCount, 0),
            ...baseConditions,
          ),
        )
        .orderBy(
          sql`((${vocabUserProgress.wrongCount} * 1.0) / MAX(${vocabUserProgress.correctCount} + ${vocabUserProgress.wrongCount}, 1)) desc`,
        )
        .limit(limit);
      return results.map((r) => r.vocab_words) as unknown as VocabWord[];
    }

    return [];
  }

  private async getDistractorPool(
    bank: string,
    level: string | undefined,
  ): Promise<VocabWord[]> {
    const conditions = this.buildWhereConditions(bank, level);
    const results = await this.db
      .select()
      .from(vocabWords)
      .where(and(...conditions))
      .limit(300);
    return results as unknown as VocabWord[];
  }

  private buildWhereConditions(
    bank: string,
    level: string | undefined,
  ) {
    const conditions = [];
    conditions.push(like(vocabWords.banks, `%"${bank}"%`));
    if (level) {
      conditions.push(eq(vocabWords.level, level));
    }
    return conditions;
  }

  private createListeningQuestion(
    word: VocabWord,
    type: ListeningQuestionType,
    distractorPool: VocabWord[],
  ): ListeningQuestion | null {
    const otherWords = distractorPool.filter((w) => w.id !== word.id);
    const shuffledOthers = this.shuffleArray([...otherWords]);
    const qid = `lq_${word.id}_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const explanation = {
      word: word.display,
      zh: word.zh,
      phonetic: word.phonetic,
      example: word.example || undefined,
      exampleZh: word.exampleZh || undefined,
    };

    switch (type) {
      case 'listen2zh': {
        const distractors = this.pickDistractors(shuffledOthers, 3, 'zh', word.zh);
        if (!distractors) return null;
        const allOptions = this.shuffleArray([word.zh, ...distractors]);
        return {
          id: qid,
          type: 'listen2zh',
          word,
          audioText: word.display,
          prompt: '聽聲音，選出正確的中文釋義',
          options: allOptions,
          correctAnswer: word.zh,
          explanation,
        };
      }
      case 'listen2en': {
        const distractors = this.pickDistractors(
          shuffledOthers.filter((w) => w.definition),
          3,
          'definition',
          word.definition,
        );
        if (!distractors) {
          const fallback = this.pickDistractors(shuffledOthers, 3, 'word', word.word);
          if (!fallback) return null;
          const allOptions = this.shuffleArray([word.word, ...fallback]);
          return {
            id: qid,
            type: 'listen2en',
            word,
            audioText: word.display,
            prompt: '聽聲音，選出正確的英文字',
            options: allOptions,
            correctAnswer: word.word,
            explanation,
          };
        }
        const allOptions = this.shuffleArray([word.definition, ...distractors]);
        return {
          id: qid,
          type: 'listen2en',
          word,
          audioText: word.display,
          prompt: '聽聲音，選出正確的英文釋義',
          options: allOptions,
          correctAnswer: word.definition,
          explanation,
        };
      }
      case 'listenSentence': {
        if (!word.example) return null;
        const clozeSentence = this.createClozeSentence(word.example, word.word);
        if (!clozeSentence) return null;
        const distractors = this.pickDistractors(shuffledOthers, 3, 'word', word.word);
        if (!distractors) return null;
        const allOptions = this.shuffleArray([word.word, ...distractors]);
        return {
          id: qid,
          type: 'listenSentence',
          word,
          audioText: word.example,
          prompt: `聽完整句子，選出空格中應填入的單字：\n${clozeSentence}`,
          options: allOptions,
          correctAnswer: word.word,
          explanation,
        };
      }
      case 'listenSpell': {
        const distractors = this.pickSimilarSpelling(word, shuffledOthers);
        if (!distractors) return null;
        const allOptions = this.shuffleArray([word.word, ...distractors]);
        return {
          id: qid,
          type: 'listenSpell',
          word,
          audioText: word.display,
          prompt: '聽聲音，選出正確的拼字',
          options: allOptions,
          correctAnswer: word.word,
          explanation,
        };
      }
      default:
        return null;
    }
  }

  private pickDistractors(
    pool: VocabWord[],
    count: number,
    field: 'zh' | 'word' | 'definition',
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

  private pickSimilarSpelling(
    word: VocabWord,
    pool: VocabWord[],
  ): string[] | null {
    const target = word.word.toLowerCase();
    const scored = pool
      .filter((w) => w.word.toLowerCase() !== target)
      .map((w) => ({
        word: w.word,
        score: this.editDistance(target, w.word.toLowerCase()),
        sameFirst: w.word[0]?.toLowerCase() === target[0],
        sameLast: w.word[w.word.length - 1]?.toLowerCase() === target[target.length - 1],
        lenDiff: Math.abs(w.word.length - target.length),
      }))
      .filter((s) => s.lenDiff <= 2)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if (a.sameFirst !== b.sameFirst) return a.sameFirst ? -1 : 1;
        if (a.sameLast !== b.sameLast) return a.sameLast ? -1 : 1;
        return a.lenDiff - b.lenDiff;
      })
      .slice(0, 5)
      .map((s) => s.word);

    if (scored.length < 3) {
      const fallback = pool
        .filter((w) => w.word.toLowerCase() !== target)
        .slice(0, 3)
        .map((w) => w.word);
      return fallback.length >= 3 ? fallback : null;
    }
    return this.shuffleArray(scored).slice(0, 3);
  }

  private editDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0),
    );
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }
    return dp[m][n];
  }

  private createClozeSentence(example: string, word: string): string | null {
    if (!example || !word) return null;
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

  private updateProgress(
    tx: VocabDb,
    userId: string,
    wordId: string,
    correct: boolean,
  ): void {
    const existing = tx
      .select()
      .from(vocabUserProgress)
      .where(
        and(
          eq(vocabUserProgress.userId, userId),
          eq(vocabUserProgress.wordId, wordId),
        ),
      )
      .limit(1).all();

    const now = new Date();

    if (existing.length === 0) {
      const newFamiliarity = correct ? 1 : 0;
      const newStatus = correct ? 'learning' : 'new';
      const nextReviewDays = REVIEW_INTERVALS_DAYS[Math.min(newFamiliarity, REVIEW_INTERVALS_DAYS.length - 1)];
      const nextReviewDate = new Date(now.getTime() + nextReviewDays * 24 * 60 * 60 * 1000);

      tx.insert(vocabUserProgress).values({
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

    tx
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
