import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, User as UserIcon } from 'lucide-react';
import { useAuth } from '@client/src/hooks/useAuth';
import { NICKNAME_KEY } from '@client/src/api/auth';

const LoginPage: React.FC = () => {
  const { guestLogin, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Already in a session (silent re-entry) → go straight home
  useEffect(() => {
    if (isLoggedIn) {
      navigate(returnUrl, { replace: true });
    }
    // Prefill with last used nickname for convenience
    const saved = localStorage.getItem(NICKNAME_KEY);
    if (saved) setNickname(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const goHome = (): void => {
    const safe = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
    navigate(safe);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    const nick = nickname.trim();
    if (!nick) {
      setError('請輸入暱稱');
      return;
    }
    setLoading(true);
    try {
      await guestLogin(nick);
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
            輸入暱稱，立刻開始你的單字冒險！
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-md border border-border p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                placeholder="你的暱稱（例如：小勇士）"
                maxLength={20}
                required
                autoFocus
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 hover:shadow-md transition-all disabled:opacity-60"
            >
              {loading ? '進入中…' : '開始學習 🚀'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            不用註冊帳號，輸入暱稱就能開始。
            <br />
            學習進度會自動保存在這台裝置，下次回來直接繼續。
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
