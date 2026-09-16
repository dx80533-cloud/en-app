import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  VocabWordWithProgress,
  WordListResponse,
  WordBanksInfo,
} from '@shared/api.interface';

export interface GetWordsParams {
  page?: number;
  pageSize?: number;
  bank?: string;
  level?: string;
  search?: string;
  sort?: string;
  status?: string;
}

export async function getWords(
  params: GetWordsParams = {},
): Promise<WordListResponse> {
  logger.info('vocabularyApi.getWords', params);
  const { data } = await axiosForBackend.get<WordListResponse>(
    '/api/vocabulary/words',
    { params },
  );
  return data;
}

export async function getWord(id: string): Promise<VocabWordWithProgress> {
  logger.info(`vocabularyApi.getWord id=${id}`);
  const { data } = await axiosForBackend.get<VocabWordWithProgress>(
    `/api/vocabulary/words/${id}`,
  );
  return data;
}

export async function getBanksInfo(): Promise<WordBanksInfo> {
  logger.info('vocabularyApi.getBanksInfo');
  const { data } = await axiosForBackend.get<WordBanksInfo>(
    '/api/vocabulary/banks',
  );
  return data;
}

export async function toggleFavorite(
  wordId: string,
): Promise<{ isFavorite: boolean }> {
  logger.info(`vocabularyApi.toggleFavorite wordId=${wordId}`);
  const { data } = await axiosForBackend.post<{ isFavorite: boolean }>(
    `/api/vocabulary/words/${wordId}/favorite`,
  );
  return data;
}

export interface GetFavoritesParams {
  page?: number;
  pageSize?: number;
  bank?: string;
  search?: string;
  sort?: string;
}

export async function getFavorites(
  params: GetFavoritesParams = {},
): Promise<WordListResponse> {
  logger.info('vocabularyApi.getFavorites', params);
  const { data } = await axiosForBackend.get<WordListResponse>(
    '/api/vocabulary/favorites',
    { params },
  );
  return data;
}
