import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import * as authApi from '@client/src/api/auth';
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
  login: (email: string, password: string) => Promise<CurrentUser>;
  register: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
      if (info.isLoggedIn && info.userId) {
        setUserInfo({
          user_id: info.userId,
          name: info.name || '使用者',
          avatar: info.avatar,
          email: info.email,
        });
      } else {
        setUserInfo(null);
      }
    } catch {
      setUserInfo(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<CurrentUser> => {
      const user = await authApi.login(email, password);
      await refresh();
      return user;
    },
    [refresh],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name?: string,
    ): Promise<CurrentUser> => {
      const user = await authApi.register(email, password, name);
      await refresh();
      return user;
    },
    [refresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    await authApi.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        userInfo,
        isLoggedIn: !!userInfo,
        isLoading,
        refresh,
        login,
        register,
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
