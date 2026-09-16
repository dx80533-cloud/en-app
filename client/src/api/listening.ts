import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { ListeningQuestion, ListeningResult, ListeningQuestionType } from '@shared/api.interface';

export interface GenerateListeningParams {
  count?: number;
  bank?: string;
  level?: string;
  types?: ListeningQuestionType[];
  mode?: string;
}

export async function generateListening(
  params: GenerateListeningParams = {},
): Promise<ListeningQuestion[]> {
  logger.info('listeningApi.generateListening', params);
  const queryParams: Record<string, string | number> = {};
  if (params.count) queryParams.count = params.count;
  if (params.bank) queryParams.bank = params.bank;
  if (params.level) queryParams.level = params.level;
  if (params.types && params.types.length > 0) queryParams.types = params.types.join(',');
  if (params.mode) queryParams.mode = params.mode;
  const { data } = await axiosForBackend.get<ListeningQuestion[]>(
    '/api/listening/generate',
    { params: queryParams },
  );
  return data;
}

export interface SubmitListeningAnswer {
  wordId: string;
  userAnswer: string;
  correct: boolean;
  type: ListeningQuestionType;
  timeSpent?: number;
}

export interface SubmitListeningData {
  bank: string;
  level: string;
  answers: SubmitListeningAnswer[];
  durationSeconds: number;
}

export async function submitListening(data: SubmitListeningData): Promise<ListeningResult> {
  logger.info('listeningApi.submitListening', { count: data.answers.length });
  const { data: result } = await axiosForBackend.post<ListeningResult>(
    '/api/listening/submit',
    data,
  );
  return result;
}
