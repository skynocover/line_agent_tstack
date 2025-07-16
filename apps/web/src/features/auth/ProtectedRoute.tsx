import type { ReactNode } from 'react';
import { useAuthGuard } from './useAuthGuard';

interface ProtectedRouteProps {
  children: ReactNode;
  /** 需要匹配的用戶 ID */
  requiredUserId?: string;
  /** 認證失敗時的重定向路徑 */
  redirectTo?: string;
  /** 是否顯示錯誤提示 */
  showErrorToast?: boolean;
  /** 是否自動嘗試登入 */
  autoLogin?: boolean;
  /** 載入中時顯示的組件 */
  loadingComponent?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserId,
  redirectTo = '/',
  showErrorToast = true,
  autoLogin = true,
  loadingComponent = (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-32 w-32 animate-spin rounded-full border-blue-600 border-b-2" />
    </div>
  ),
}) => {
  const { isAuthenticated, profile, isLoading } = useAuthGuard({
    requiredUserId,
    redirectTo,
    showErrorToast,
    autoLogin,
  });

  // 顯示載入狀態
  if (isLoading || (autoLogin && !isAuthenticated && !profile)) {
    return <>{loadingComponent}</>;
  }

  // 如果需要認證但未認證，返回空（交由 useAuthGuard 處理重定向）
  if (autoLogin && !isAuthenticated) {
    return null;
  }

  // 渲染受保護的內容
  return <>{children}</>;
};
