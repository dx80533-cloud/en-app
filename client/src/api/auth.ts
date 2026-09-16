import { logger } from '@lark-apaas/client-toolkit/logger';
import { authClient } from '@lark-apaas/client-toolkit/auth';
import type { UserSessionInfo } from '@shared/api.interface';

export async function getCurrentUser(): Promise<UserSessionInfo> {
  logger.info('authApi.getCurrentUser');
  try {
    const result = await authClient.session.getUserInfo();
    if (result.error || !result.data?.user_info) {
      return { isLoggedIn: false };
    }
    const info = result.data.user_info;
    const nameText =
      info.name && Array.isArray(info.name) && info.name.length > 0
        ? info.name[0].text
        : undefined;
    const avatarUrl = info.avatar?.image?.large || undefined;
    return {
      isLoggedIn: true,
      userId: String(info.user_id ?? ''),
      name: nameText,
      email: info.email,
      avatar: avatarUrl,
    };
  } catch (err) {
    logger.warn('authApi.getCurrentUser failed', JSON.stringify(err));
    return { isLoggedIn: false };
  }
}

export async function redirectToLogin(returnUrl?: string): Promise<void> {
  logger.info('authApi.redirectToLogin');
  await authClient.session.redirectToLogin(returnUrl ? { returnUrl } : undefined);
}

export async function signOut(): Promise<void> {
  logger.info('authApi.signOut');
  await authClient.session.signOut();
  await authClient.session.redirectToLogin();
}
