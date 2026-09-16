import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { ImportResult, VocabWord } from '@shared/api.interface';

export async function importWordsFile(
  file: File,
  format: 'json' | 'csv',
): Promise<ImportResult> {
  logger.info('adminApi.importWordsFile', { format, name: file.name, size: file.size });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format', format);
  const { data } = await axiosForBackend.post<ImportResult>(
    '/api/admin/words/import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function createWord(
  wordData: Omit<VocabWord, 'id'>,
): Promise<VocabWord> {
  logger.info('adminApi.createWord', { word: wordData.word });
  const { data } = await axiosForBackend.post<VocabWord>(
    '/api/admin/words',
    wordData,
  );
  return data;
}

export async function updateWord(
  id: string,
  wordData: Partial<Omit<VocabWord, 'id'>>,
): Promise<VocabWord> {
  logger.info('adminApi.updateWord', { id });
  const { data } = await axiosForBackend.patch<VocabWord>(
    `/api/admin/words/${id}`,
    wordData,
  );
  return data;
}

export async function deleteWord(id: string): Promise<void> {
  logger.info('adminApi.deleteWord', { id });
  await axiosForBackend.delete(`/api/admin/words/${id}`);
}

export async function fillMissingExamples(
  options?: { dryRun?: boolean; limit?: number },
): Promise<{ filled: number; totalMissing: number }> {
  logger.info('adminApi.fillMissingExamples', options);
  const { data } = await axiosForBackend.post<{ filled: number; totalMissing: number }>(
    '/api/admin/examples/fill',
    options,
  );
  return data;
}
