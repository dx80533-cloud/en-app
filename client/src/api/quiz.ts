import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { QuizQuestion, QuizResult } from '@shared/api.interface';

export interface GenerateQuizParams {
  count?: number;
  bank?: string;
  level?: string;
  types?: string[];
  mode?: string;
}

export async function generateQuiz(
  params: GenerateQuizParams = {},
): Promise<QuizQuestion[]> {
  logger.info('quizApi.generateQuiz', params);
  const queryParams: Record<string, string | number> = {};
  if (params.count) queryParams.count = params.count;
  if (params.bank) queryParams.bank = params.bank;
  if (params.level) queryParams.level = params.level;
  if (params.types && params.types.length > 0) queryParams.types = params.types.join(',');
  if (params.mode) queryParams.mode = params.mode;
  const { data } = await axiosForBackend.get<QuizQuestion[]>(
    '/api/quiz/generate',
    { params: queryParams },
  );
  return data;
}

export interface SubmitQuizAnswer {
  wordId: string;
  userAnswer: string;
  correct: boolean;
  timeSpent?: number;
}

export interface SubmitQuizData {
  quizType: string;
  bank: string;
  level: string;
  answers: SubmitQuizAnswer[];
  durationSeconds: number;
}

export async function submitQuiz(data: SubmitQuizData): Promise<QuizResult> {
  logger.info('quizApi.submitQuiz', { count: data.answers.length });
  const { data: result } = await axiosForBackend.post<QuizResult>(
    '/api/quiz/submit',
    data,
  );
  return result;
}
