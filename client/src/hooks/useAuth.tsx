import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import * as authApi from '@client/src/api/auth';
import { DEVICE_ID_KEY, NICKNAME_KEY } from '@client/src/api/auth';
import type { CurrentUser } from '@client/src/api/auth';

/** Shape kept compatible with the old `useCurrentUserProfile()` return */
export interface UserInfoShim {
  user_id: string;
  name: string;
  avatar?: string;
  email?: string;
}

interface AuthContextValue {
  userInfo: UserInfoShim | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  guestLogin: (nickname: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toShim(info: {
  isLoggedIn: boolean;
  userId?: string;
  name?: string;
  email?: string;
  avatar?: string;
}): UserInfoShim | null {
  if (!info.isLoggedIn || !info.userId) return null;
  return {
    user_id: info.userId,
    name: info.name || '使用者',
    avatar: info.avatar,
    email: info.email,
  };
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [userInfo, setUserInfo] = useState<UserInfoShim | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const info = await authApi.getCurrentUser();
      setUserInfo(toShim(info));
    } catch {
      setUserInfo(null);
    }
  }, []);

  // On mount: 1) reuse the current session; 2) otherwise silently re-enter
  // with the saved device identity (no login screen on returning visits).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await authApi.getCurrentUser();
        if (!cancelled && info.isLoggedIn && info.userId) {
          setUserInfo(toShim(info));
          return;
        }
        const deviceId = localStorage.getItem(DEVICE_ID_KEY);
        const nickname = localStorage.getItem(NICKNAME_KEY);
        if (deviceId && nickname) {
          try {
            await authApi.guestLogin(nickname);
            const info2 = await authApi.getCurrentUser();
            if (!cancelled && info2.isLoggedIn && info2.userId) {
              setUserInfo(toShim(info2));
            }
          } catch {
            /* stay logged out, show nickname entry */
          }
        }
      } catch {
        /* network/server unavailable, stay logged out */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const guestLogin = useCallback(
    async (nickname: string): Promise<CurrentUser> => {
      const user = await authApi.guestLogin(nickname);
      await refresh();
      return user;
    },
    [refresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    await authApi.signOut();
    try {
      localStorage.removeItem(DEVICE_ID_KEY);
      localStorage.removeItem(NICKNAME_KEY);
    } catch {
      /* ignore */
    }
    setUserInfo(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userInfo,
        isLoggedIn: !!userInfo,
        isLoading,
        refresh,
        guestLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
