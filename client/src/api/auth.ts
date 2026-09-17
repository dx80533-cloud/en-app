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
  } catch (err) {
    logger.warn('authApi.signOut failed', err);
  }
}

export const DEVICE_ID_KEY = 'vocab_device_id';
export const NICKNAME_KEY = 'vocab_nickname';

/** Get or create a stable device-local id (the guest identity). */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Guest login: nickname + device id → JWT cookie. No password needed. */
export async function guestLogin(nickname: string): Promise<CurrentUser> {
  const deviceId = getOrCreateDeviceId();
  const { data } = await axiosForBackend.post<{ user: CurrentUser }>(
    '/auth/guest',
    { nickname: nickname.trim().slice(0, 20), deviceId },
  );
  try {
    localStorage.setItem(NICKNAME_KEY, nickname.trim().slice(0, 20));
  } catch {
    /* storage unavailable, ignore */
  }
  return data.user;
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
