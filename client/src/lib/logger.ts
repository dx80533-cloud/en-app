/**
 * Minimal logger (replaces @lark-apaas/client-toolkit/logger for self-hosted).
 */
export const logger = {
  info: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.log('[info]', ...args);
  },
  warn: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.warn('[warn]', ...args);
  },
  error: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.error('[error]', ...args);
  },
  debug: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.debug('[debug]', ...args);
  },
};
