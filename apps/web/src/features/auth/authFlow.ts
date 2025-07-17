import { isInLineApp } from '@/features/line/liff';
import { useAuthStore } from './authStore';
import { getPageIdentifier } from './utils';

/**
 * 統一的認證流程管理
 * 根據不同環境和需求提供統一的認證入口
 */
export class AuthFlow {
  private static instance: AuthFlow;

  private constructor() {}

  static getInstance(): AuthFlow {
    if (!AuthFlow.instance) {
      AuthFlow.instance = new AuthFlow();
    }
    return AuthFlow.instance;
  }

  /**
   * 應用啟動時的認證初始化
   * 根據環境決定是否自動登入
   */
  async initializeAuth(pathname: string = window.location.pathname): Promise<void> {
    const authStore = useAuthStore.getState();

    if (isInLineApp()) {
      // 在 LINE 內建瀏覽器中，執行自動登入
      const pageId = getPageIdentifier(pathname);
      await authStore.autoLoginInLineApp(pageId);
    } else {
      // 在外部瀏覽器中，僅同步認證狀態
      await authStore.refreshAuthState();
    }
  }

  /**
   * 手動觸發登入流程
   * 支援重定向和普通登入
   */
  async triggerLogin(fromPage?: string): Promise<void> {
    const authStore = useAuthStore.getState();

    if (fromPage) {
      await authStore.loginWithRedirect(fromPage);
    } else {
      await authStore.login();
    }
  }

  /**
   * 檢查是否需要認證
   * 用於路由守衛
   */
  async requireAuth(requiredUserId?: string): Promise<boolean> {
    const authStore = useAuthStore.getState();

    // 先同步 LIFF 狀態
    await authStore.syncWithLiff();

    const { isAuthenticated, profile } = authStore;

    // 檢查基本認證
    if (!isAuthenticated || !profile) {
      return false;
    }

    // 檢查用戶 ID 匹配
    if (requiredUserId && profile.userId !== requiredUserId) {
      return false;
    }

    return true;
  }

  /**
   * 執行登出流程
   */
  async logout(): Promise<void> {
    const authStore = useAuthStore.getState();
    await authStore.logout();
  }

  /**
   * 獲取當前認證狀態
   */
  getAuthState() {
    return useAuthStore.getState();
  }
}
