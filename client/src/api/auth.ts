import { axiosForBackend, logger } from './client';
import type { UserSessionInfo } from '@shared/api.interface';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  provider: string;
}

export async function getCurrentUser(): Promise<UserSessionInfo> {
  try {
    const { data } = await axiosForBackend.get<{
      isLoggedIn: boolean;
      user?: CurrentUser;
    }>('/auth/me');
    if (data?.isLoggedIn && data.user) {
      return {
        isLoggedIn: true,
        userId: data.user.id,
        name: data.user.name,
        email: data.user.email,
        avatar: data.user.avatar || undefined,
      };
    }
    return { isLoggedIn: false };
  } catch (err) {
    logger.warn('authApi.getCurrentUser failed', err);
    return { isLoggedIn: false };
  }
}

export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<CurrentUser> {
  const { data } = await axiosForBackend.post<{ user: CurrentUser }>(
    '/auth/register',
    { email, password, name },
  );
  return data.user;
}

export async function login(
  email: string,
  password: string,
): Promise<CurrentUser> {
  const { data } = await axiosForBackend.post<{ user: CurrentUser }>(
    '/auth/login',
    { email, password },
  );
  return data.user;
}

export async function signOut(): Promise<void> {
  try {
    await axiosForBackend.post('/auth/logout');
  } finally {
    window.location.href = '/';
  }
}

/** Start Google OAuth flow (server redirects to Google consent screen) */
export function loginWithGoogle(): void {
  window.location.href = '/api/auth/google';
}

export function redirectToLogin(returnUrl?: string): void {
  window.location.href = returnUrl
    ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/login';
}
