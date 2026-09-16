import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@client/src/hooks/useAuth';
import * as authApi from '@client/src/api/auth';

type Mode = 'login' | 'register';

const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const googleError = searchParams.get('error');

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const goHome = (): void => {
    const safe = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
    navigate(safe);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('請輸入 email 與密碼');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      goHome();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
        (err as { message?: string })?.message ||
        '操作失敗，請重試';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = (): void => {
    authApi.loginWithGoogle();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shadow-lg">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-foreground">字庫派對</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'login' ? '歡迎回來，繼續你的單字冒險！' : '加入字庫派對，開始你的單字冒險！'}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-md border border-border p-6 space-y-5">
          {/* Google 登入（預設） */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors font-medium text-foreground disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>使用 Google 帳號登入</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>或使用 email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* 登入 / 註冊切換 */}
          <div className="flex rounded-xl bg-muted p-1">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? '登入' : '註冊'}
              </button>
            ))}
          </div>

          {googleError && (
            <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
              Google 登入失敗，請改用 email 登入或稍後再試。
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="暱稱（可留空）"
                  className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                required
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密碼"
                required
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60"
            >
              {loading
                ? '處理中…'
                : mode === 'login'
                  ? '登入'
                  : '建立帳號'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          登入後進度、收藏與主題會跨裝置同步
        </p>
        <div className="text-center mt-2">
          <Link to="/" className="text-sm text-primary hover:underline">
            先逛逛，稍後再登入
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
