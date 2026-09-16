import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { logger } from '@client/src/lib/logger';
import { useAuth } from '@client/src/hooks/useAuth';
import { preferencesApi } from '@client/src/api';
import { THEMES, type ThemeType, type UserSettings } from '@shared/api.interface';

const STORAGE_KEY = 'vocab_theme_preference';
const SETTINGS_STORAGE_KEY = 'vocab_user_settings';

interface ThemeContextValue {
  theme: ThemeType;
  themes: typeof THEMES;
  settings: UserSettings;
  setTheme: (theme: ThemeType, persistRemote?: boolean) => Promise<void>;
  updateSettings: (settings: UserSettings) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { userInfo } = useAuth();
  const isLoggedIn = !!userInfo?.user_id;

  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window === 'undefined') return 'default';
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeType | null;
    if (stored && THEMES.some((t) => t.id === stored)) return stored;
    return 'default';
  });

  const [settings, setSettingsState] = useState<UserSettings>(() => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  });

  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.remove('theme-default', 'theme-midnight', 'theme-beyblade', 'theme-manga', 'theme-candy', 'theme-retro');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const prefs = await preferencesApi.getPreferences();
        if (cancelled) return;
        if (prefs.theme && THEMES.some((t) => t.id === prefs.theme)) {
          setThemeState(prefs.theme);
        }
        if (prefs.settings) {
          setSettingsState(prefs.settings);
        }
      } catch (err) {
        logger.warn('Failed to load preferences', err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const setTheme = useCallback(
    async (newTheme: ThemeType, persistRemote: boolean = true): Promise<void> => {
      setThemeState(newTheme);
      if (isLoggedIn && persistRemote) {
        try {
          await preferencesApi.updateTheme(newTheme);
        } catch (err) {
          logger.warn('Failed to persist theme', err);
        }
      }
    },
    [isLoggedIn],
  );

  const updateSettings = useCallback(
    (newSettings: UserSettings): void => {
      setSettingsState((prev) => ({ ...prev, ...newSettings }));
      if (isLoggedIn) {
        preferencesApi.updateSettings(newSettings).catch((err) => {
          logger.warn('Failed to persist settings', err);
        });
      }
    },
    [isLoggedIn],
  );

  return (
    <ThemeContext.Provider
      value={{ theme, themes: THEMES, settings, setTheme, updateSettings, isLoaded }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
