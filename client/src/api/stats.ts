import { logger } from '@client/src/lib/logger';
import { axiosForBackend } from '@client/src/api/client';
import type { UserStats } from '@shared/api.interface';

export async function getOverview(): Promise<UserStats> {
  logger.info('statsApi.getOverview');
  const { data } = await axiosForBackend.get<UserStats>('/stats/overview');
  return data;
}

export interface QuizRecord {
  id: string;
  bank: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
  xpEarned: number;
  createdAt: string;
}

export async function getRecentQuizzes(
  limit?: number,
): Promise<QuizRecord[]> {
  logger.info(`statsApi.getRecentQuizzes limit=${limit ?? 'default'}`);
  const { data } = await axiosForBackend.get<QuizRecord[]>(
    '/stats/recent-quizzes',
    { params: limit ? { limit } : {} },
  );
  return data;
}

export interface WordProgress {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  total: number;
  byBank: Record<string, { learned: number; total: number }>;
}

export async function getWordProgress(): Promise<WordProgress> {
  logger.info('statsApi.getWordProgress');
  const { data } = await axiosForBackend.get<WordProgress>(
    '/stats/word-progress',
  );
  return data;
}
