import { createRootRoute, Link, Outlet, useNavigate, useSearch } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ChevronRight, LogIn, LogOut, Menu, MessageSquareMore } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { CalendarProvider } from '@/components/event-calendar/calendar-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/features/auth';
import { getPageIdentifier } from '@/features/auth/utils';
import { isInLineApp } from '@/features/line/liff';
import { usePageContext } from '@/hooks/usePageContext';
import {
  filterNavigationItems,
  generateNavigationItems,
  getLinkProps,
  type NavigationItem,
} from '@/utils/navigation';

const RootComponent = () => {
  const { profile, isAuthenticated, isLoading, logout, refreshAuthState, autoLoginInLineApp } =
    useAuthStore();

  const search = useSearch({ from: '__root__' }) as { to?: string };
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Get current page context
  const pageContext = usePageContext();

  // 回報表單網址
  const reportFormUrl = import.meta.env.VITE_REPORT_FORM;

  const handleReportClick = () => {
    if (reportFormUrl) {
      window.open(reportFormUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // 處理帶有 'to' 參數的 URL 重定向
  useEffect(() => {
    if (search.to && profile?.userId) {
      const targetPath = `/${profile.userId}/${search.to}`;
      navigate({ to: targetPath });
    }
  }, [search.to, profile?.userId, navigate]);

  // 在應用程式載入時檢查認證狀態
  useEffect(() => {
    // 根據是否在 LINE 內決定認證策略
    if (isInLineApp()) {
      // 在 LINE 內建瀏覽器中，執行自動登入
      const pageId = getPageIdentifier(window.location.pathname);
      autoLoginInLineApp(pageId);
    } else {
      // 在外部瀏覽器中，僅刷新認證狀態，不自動登入
      refreshAuthState();
    }
  }, [refreshAuthState, autoLoginInLineApp]);

  // 處理登出
  const handleLogout = async () => {
    await logout();
    setIsSheetOpen(false);
    navigate({ to: '/' });
  };

  // 生成基於當前上下文的導航項目
  const allNavigationItems = generateNavigationItems(pageContext, isAuthenticated);
  const navigationItems = filterNavigationItems(allNavigationItems, isAuthenticated);

  // 渲染導航項目
  const renderNavItem = (item: NavigationItem, isMobile = false) => {
    const IconComponent = item.icon;
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
      green: 'bg-green-100 text-green-600 group-hover:bg-green-200',
      amber: 'bg-amber-100 text-amber-700 group-hover:bg-amber-200',
      purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
      gray: 'bg-gray-100 text-gray-600 group-hover:bg-gray-200',
    };

    // Get the appropriate link props based on the navigation item
    const linkProps = getLinkProps(item);

    if (isMobile) {
      return (
        <Link
          key={item.label}
          {...linkProps}
          className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => setIsSheetOpen(false)}
        >
          <div
            className={`rounded-md p-2 ${colorClasses[item.color as keyof typeof colorClasses]}`}
          >
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{item.label}</div>
            <div className="text-muted-foreground text-sm">{item.description}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      );
    }

    return (
      <Link
        key={item.label}
        {...linkProps}
        className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
      >
        <IconComponent className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="mt-4 flex flex-col gap-2">
                {navigationItems.map((item) => renderNavItem(item, true))}

                {/* 回報表單選項 */}
                {reportFormUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      handleReportClick();
                      setIsSheetOpen(false);
                    }}
                    className="group flex items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="rounded-md bg-orange-100 p-2 text-orange-600 group-hover:bg-orange-200">
                      <MessageSquareMore className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">問題回報</div>
                      <div className="text-muted-foreground text-sm">回報問題或提供建議</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Desktop Navigation */}
          <nav className="ml-6 hidden gap-2 md:flex">
            {navigationItems.map((item) => renderNavItem(item, false))}
          </nav>

          {/* User Profile */}
          <div className="mr-4 ml-auto flex items-center gap-4">
            {/* 回報表單按鈕 */}
            {reportFormUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReportClick}
                title="問題回報與建議"
                className="text-muted-foreground hover:text-foreground"
              >
                <MessageSquareMore className="mr-1 h-4 w-4" />
                回報
              </Button>
            )}

            {isAuthenticated && profile ? (
              <>
                <div className="hidden flex-col items-end md:flex">
                  <span className="font-medium text-sm">{profile.displayName}</span>
                  <span className="text-muted-foreground text-xs">ID: {profile.userId}</span>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.pictureUrl} alt={profile.displayName} />
                  <AvatarFallback>{profile.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Logout"
                  disabled={isLoading}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    try {
                      // 使用帶有重定向的登入，首頁使用 'home' 作為頁面標識符
                      await useAuthStore.getState().loginWithRedirect('home');
                    } catch (error) {
                      console.error('Login failed:', error);
                    }
                  }}
                  disabled={isLoading}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      登入中...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      LINE 登入
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="py-2">
        <CalendarProvider>
          <Outlet />
        </CalendarProvider>
      </main>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
