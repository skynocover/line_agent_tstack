// web/src/features/auth/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ILiffProfile } from '@/features/line/liff';
import {
  checkLoginStatus,
  closeLiffWindow,
  handleLogin,
  handleLoginWithRedirect,
  handleLogout,
  isInLineApp,
} from '@/features/line/liff';
import {
  clearAuthStorage,
  isRedirectError,
  normalizeAuthError,
  shouldClearAuthOnError,
} from './utils';

interface AuthState {
  profile: ILiffProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (profile: ILiffProfile, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth methods
  checkAuth: () => Promise<boolean>;
  syncWithLiff: () => Promise<void>;
  autoLoginInLineApp: (pageId?: string) => Promise<void>;
  login: () => Promise<void>;
  loginWithRedirect: (fromPage: string) => Promise<void>;
  logout: () => Promise<void>;

  // Utility methods
  refreshAuthState: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAuth: (profile, accessToken) => {
        set({
          profile,
          accessToken,
          isAuthenticated: true,
          error: null,
          isLoading: false,
        });
      },

      clearAuth: () => {
        set({
          profile: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      checkAuth: async () => {
        set({ isLoading: true, error: null });

        try {
          const result = await checkLoginStatus();

          if (result?.profile && result?.accessToken) {
            get().setAuth(result.profile, result.accessToken);
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          const err = error instanceof Error ? error : new Error('登入過程發生錯誤');
          console.error('Auth check failed:', err);

          if (shouldClearAuthOnError(err)) {
            get().clearAuth();
          }

          get().setError(normalizeAuthError(err));
          return false;
        }
      },

      syncWithLiff: async () => {
        const currentState = get();

        try {
          const result = await checkLoginStatus();

          if (result?.profile && result?.accessToken) {
            // 只有在狀態實際不同時才更新
            if (
              !currentState.isAuthenticated ||
              currentState.profile?.userId !== result.profile.userId ||
              currentState.accessToken !== result.accessToken
            ) {
              get().setAuth(result.profile, result.accessToken);
            }
          } else if (currentState.isAuthenticated) {
            // 只有在本地狀態顯示已認證時才清除
            console.log('LIFF not logged in, clearing local auth state');
            get().clearAuth();
            clearAuthStorage();
          }
        } catch (error) {
          console.warn('Failed to check LIFF login status:', error);
          // 檢查失敗時，為了安全起見，清除本地認證狀態
          if (currentState.isAuthenticated) {
            console.log('LIFF check failed, clearing local auth state for safety');
            get().clearAuth();
            clearAuthStorage();
          }
        }
      },

      login: async () => {
        set({ isLoading: true, error: null });

        try {
          const result = await handleLogin();

          if (result?.profile && result?.accessToken) {
            get().setAuth(result.profile, result.accessToken);
          } else {
            throw new Error('登入失敗：無法獲取用戶資訊');
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error('登入過程發生錯誤');
          console.error('Login failed:', err);

          // 如果是重定向錯誤，不視為錯誤狀態
          if (isRedirectError(err)) {
            set({ isLoading: false });
            return;
          }

          get().setError(normalizeAuthError(err));
          if (shouldClearAuthOnError(err)) {
            get().clearAuth();
          }
        }
      },

      loginWithRedirect: async (fromPage: string) => {
        set({ isLoading: true, error: null });

        try {
          await handleLoginWithRedirect(fromPage);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('登入過程發生錯誤');
          console.error('Login with redirect failed:', err);

          // 如果是重定向錯誤，不視為錯誤狀態
          if (isRedirectError(err)) {
            set({ isLoading: false });
            return;
          }

          get().setError(normalizeAuthError(err));
          if (shouldClearAuthOnError(err)) {
            get().clearAuth();
          }
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          // 立即清除本地狀態，避免 UI 狀態不一致
          get().clearAuth();
          clearAuthStorage();

          // 執行 LIFF 登出
          handleLogout();

          // 稍微等待一下，讓 LIFF 登出完成
          await new Promise((resolve) => setTimeout(resolve, 100));

          // 強制同步 LIFF 狀態
          await get().syncWithLiff();

          // 如果在 LINE 內，可以選擇關閉視窗
          if (isInLineApp()) {
            // 給用戶一些時間看到登出成功的反饋
            setTimeout(() => {
              closeLiffWindow();
            }, 1000);
          }
        } catch (error) {
          console.error('Logout failed:', error);
          // 即使登出失敗，也要確保本地狀態已清除
          get().clearAuth();
          clearAuthStorage();
        }
      },

      refreshAuthState: async () => {
        await get().syncWithLiff();
      },

      autoLoginInLineApp: async (pageId = 'home') => {
        // 只在 LINE 內建瀏覽器中執行自動登入
        if (!isInLineApp()) {
          return;
        }

        const currentState = get();

        // 如果已經有有效的認證資訊，不需要重複登入
        if (currentState.isAuthenticated && currentState.profile && currentState.accessToken) {
          return;
        }

        // 先嘗試同步 LIFF 狀態
        await get().syncWithLiff();

        // 檢查完後如果仍未認證，則執行自動登入
        const updatedState = get();
        if (!updatedState.isAuthenticated) {
          try {
            await get().loginWithRedirect(pageId);
          } catch (error) {
            console.warn('Auto login in LINE app failed:', error);
            // 自動登入失敗不視為錯誤，用戶可以手動登入
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      // 只持久化必要的資料
      partialize: (state) => ({
        profile: state.profile,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // 從儲存恢復時的處理
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 恢復後重置暫時狀態
          state.isLoading = false;
          state.error = null;
        }
      },
    },
  ),
);
