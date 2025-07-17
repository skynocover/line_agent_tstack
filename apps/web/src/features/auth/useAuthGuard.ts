import { useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from './authStore';
import { getPageIdentifier } from './utils';

interface UseAuthGuardOptions {
  /** 需要匹配的用戶 ID */
  requiredUserId?: string;
  /** 認證失敗時的重定向路徑 */
  redirectTo?: string;
  /** 是否顯示錯誤提示 */
  showErrorToast?: boolean;
  /** 是否自動嘗試登入 */
  autoLogin?: boolean;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const { requiredUserId, redirectTo = '/', showErrorToast = true, autoLogin = false } = options;

  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isAuthenticated, checkAuth, syncWithLiff, loginWithRedirect } = useAuthStore();

  useEffect(() => {
    const handleAuthCheck = async () => {
      // 如果需要自動登入，嘗試認證
      if (autoLogin && !isAuthenticated) {
        try {
          const success = await checkAuth();
          if (!success || !profile) {
            // 使用帶有重定向的登入
            const pageId = getPageIdentifier(location.pathname);
            await loginWithRedirect(pageId);
            return;
          }
        } catch (error) {
          // 登入失敗或需要重定向，不做額外處理
          return;
        }
      }

      // 如果不需要自動登入，但也沒有認證，同步 LIFF 狀態
      if (!autoLogin && !isAuthenticated) {
        syncWithLiff();
        if (!useAuthStore.getState().isAuthenticated) {
          if (showErrorToast) {
            toast.error('請先登入 LINE 帳號');
          }
          navigate({ to: redirectTo });
          return;
        }
      }

      // 檢查用戶 ID 是否匹配
      if (requiredUserId && profile && profile.userId !== requiredUserId) {
        navigate({
          to: `/${profile.userId}${
            redirectTo.startsWith('/') ? redirectTo.substring(1) : redirectTo
          }`,
        });
        return;
      }
    };

    handleAuthCheck();
  }, [
    profile,
    isAuthenticated,
    requiredUserId,
    redirectTo,
    showErrorToast,
    autoLogin,
    navigate,
    checkAuth,
    syncWithLiff,
    loginWithRedirect,
    location.pathname,
  ]);

  return {
    isAuthenticated,
    profile,
    isLoading: !isAuthenticated && !profile, // 簡單的載入狀態
  };
};
