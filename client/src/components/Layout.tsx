import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Brain,
  Headphones,
  Library,
  Heart,
  Info,
  Sparkles,
  LogOut,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import * as authApi from '@client/src/api/auth';
import { Image } from '@client/src/components/ui/image';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/', label: '首頁', icon: <Home className="h-5 w-5" /> },
  { to: '/learn', label: '學習', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/quiz', label: '測驗', icon: <Brain className="h-5 w-5" /> },
  { to: '/listening', label: '聽力', icon: <Headphones className="h-5 w-5" /> },
  { to: '/vocabulary', label: '字庫', icon: <Library className="h-5 w-5" /> },
  {
    to: '/collection',
    label: '收藏',
    icon: <Heart className="h-5 w-5" />,
  },
  { to: '/about', label: '關於', icon: <Info className="h-5 w-5" /> },
];

const Layout: React.FC = () => {
  const userInfo = useCurrentUserProfile();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = !!userInfo?.user_id;

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogin = (): void => {
    authApi.redirectToLogin(window.location.pathname);
  };

  const handleLogout = (): void => {
    authApi.signOut();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 桌面端頂部導航 */}
      <header className="hidden md:block bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shadow-sm group-hover:shadow-md transition-shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-foreground">
              字庫派對
            </span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {navItems.map((item: NavItem) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  ].join(' ')
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* 使用者區域 */}
          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border">
            {!isLoggedIn ? (
              <button
                onClick={handleLogin}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:bg-primary/90 hover:shadow-md transition-all"
              >
                登入
              </button>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted transition-colors"
                >
                  {userInfo.avatar ? (
                    <Image
                      src={userInfo.avatar}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                    {userInfo.name || '使用者'}
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl shadow-md border border-border py-1.5 z-50">
                    <NavLink
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>管理後台</span>
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>登出</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
       <main className="flex-1 pb-20 md:pb-0 page-enter">
         <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
           <Outlet />
         </div>
       </main>

      {/* 移動端底部 tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')
              }
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
