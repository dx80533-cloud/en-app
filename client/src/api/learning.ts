import { logger } from '@client/src/lib/logger';
import { axiosForBackend } from '@client/src/api/client';
import type {
  VocabWordWithProgress,
  LearningSessionResult,
} from '@shared/api.interface';

export interface GetDueWordsParams {
  limit?: number;
  mode?: string;
  bank?: string;
  level?: string;
}

export async function getDueWords(
  params: GetDueWordsParams = {},
): Promise<VocabWordWithProgress[]> {
  logger.info('learningApi.getDueWords', params);
  const { data } = await axiosForBackend.get<VocabWordWithProgress[]>(
    '/learning/due-words',
    { params },
  );
  return data;
}

export async function submitAnswer(
  wordId: string,
  correct: boolean,
  timeSpent?: number,
): Promise<LearningSessionResult> {
  logger.info(
    `learningApi.submitAnswer wordId=${wordId} correct=${correct}`,
  );
  const { data } = await axiosForBackend.post<LearningSessionResult>(
    '/learning/submit-answer',
    { wordId, correct, timeSpent },
  );
  return data;
}

export interface DailyGoal {
  dueCount: number;
  reviewedToday: number;
  correctToday: number;
  dailyGoal: number;
  xpToday: number;
}

export async function getDailyGoal(): Promise<DailyGoal> {
  logger.info('learningApi.getDailyGoal');
  const { data } = await axiosForBackend.get<DailyGoal>(
    '/learning/daily-goal',
  );
  return data;
}
