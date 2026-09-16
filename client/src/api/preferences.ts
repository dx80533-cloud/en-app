import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { UserPreferences, ThemeType, UserSettings } from '@shared/api.interface';

export async function getPreferences(): Promise<UserPreferences> {
  logger.info('preferencesApi.getPreferences');
  const { data } = await axiosForBackend.get<UserPreferences>('/api/preferences');
  return data;
}

export async function updateTheme(theme: ThemeType): Promise<{ theme: ThemeType }> {
  logger.info(`preferencesApi.updateTheme theme=${theme}`);
  const { data } = await axiosForBackend.put<{ theme: ThemeType }>(
    '/api/preferences/theme',
    { theme },
  );
  return data;
}

export async function updateSettings(
  settings: UserSettings,
): Promise<{ settings: UserSettings }> {
  logger.info('preferencesApi.updateSettings');
  const { data } = await axiosForBackend.put<{ settings: UserSettings }>(
    '/api/preferences/settings',
    settings,
  );
  return data;
}
