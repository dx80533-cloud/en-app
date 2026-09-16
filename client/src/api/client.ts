import axios from 'axios';
import { logger } from '@client/src/lib/logger';

/**
 * Shared axios instance for all backend API calls.
 * - baseURL `/api` (same origin; behind reverse proxy the server is mounted
 *   at the domain root)
 * - withCredentials so the httpOnly JWT cookie is sent automatically
 */
export const axiosForBackend = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000,
});

axiosForBackend.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const url = (error as { config?: { url?: string } })?.config?.url || '';
    if (
      status === 401 &&
      !window.location.pathname.startsWith('/login') &&
      !url.includes('/auth/')
    ) {
      logger.warn('401 未登入，導向登入頁');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export { logger };
