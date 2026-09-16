import { logger } from '@client/src/lib/logger';
import { axiosForBackend } from '@client/src/api/client';
import type { UserPreferences, ThemeType, UserSettings } from '@shared/api.interface';

export async function getPreferences(): Promise<UserPreferences> {
  logger.info('preferencesApi.getPreferences');
  const { data } = await axiosForBackend.get<UserPreferences>('/preferences');
  return data;
}

export async function updateTheme(theme: ThemeType): Promise<{ theme: ThemeType }> {
  logger.info(`preferencesApi.updateTheme theme=${theme}`);
  const { data } = await axiosForBackend.put<{ theme: ThemeType }>(
    '/preferences/theme',
    { theme },
  );
  return data;
}

export async function updateSettings(
  settings: UserSettings,
): Promise<{ settings: UserSettings }> {
  logger.info('preferencesApi.updateSettings');
  const { data } = await axiosForBackend.put<{ settings: UserSettings }>(
    '/preferences/settings',
    settings,
  );
  return data;
}
