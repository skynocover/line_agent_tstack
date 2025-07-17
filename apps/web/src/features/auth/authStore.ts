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
  checkAuthWithoutLogin: () => Promise<void>;
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
        const currentState = get();

        set({ isLoading: true, error: null });

        try {
          // 先檢查 LIFF 登入狀態，而不是盲目相信本地狀態
          const result = await checkLoginStatus();

          if (result?.profile && result?.accessToken) {
            // 如果 LIFF 有登入狀態，更新本地狀態
            get().setAuth(result.profile, result.accessToken);
            return true;
          }

          // 如果 LIFF 沒有登入狀態，不自動登入，讓調用者決定如何處理
          set({ isLoading: false });
          return false;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '登入過程發生錯誤';
          console.error('Auth check failed:', error);

          get().setError(errorMessage);
          get().clearAuth();
          return false;
        }
      },

      checkAuthWithoutLogin: async () => {
        const currentState = get();

        try {
          // 直接檢查 LIFF 登入狀態，不依賴本地存儲
          const result = await checkLoginStatus();

          if (result?.profile && result?.accessToken) {
            // 如果 LIFF 有有效的登入狀態，更新本地狀態
            get().setAuth(result.profile, result.accessToken);
          } else {
            // 如果 LIFF 沒有登入狀態，清除本地可能過期的狀態
            if (currentState.profile || currentState.accessToken || currentState.isAuthenticated) {
              console.log('LIFF not logged in, clearing local auth state');
              get().clearAuth();
            }
          }
        } catch (error) {
          console.warn('Failed to check LIFF login status:', error);
          // 檢查失敗時，為了安全起見，清除本地認證狀態
          if (currentState.isAuthenticated || currentState.profile || currentState.accessToken) {
            console.log('LIFF check failed, clearing local auth state for safety');
            get().clearAuth();
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
          const errorMessage = error instanceof Error ? error.message : '登入過程發生錯誤';
          console.error('Login failed:', error);

          // 如果是需要重定向的錯誤，不視為錯誤狀態
          if (errorMessage === 'Login redirect required') {
            set({ isLoading: false });
            return;
          }

          get().setError(errorMessage);
          get().clearAuth();
        }
      },

      loginWithRedirect: async (fromPage: string) => {
        set({ isLoading: true, error: null });

        try {
          await handleLoginWithRedirect(fromPage);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '登入過程發生錯誤';
          console.error('Login with redirect failed:', error);

          // 如果是需要重定向的錯誤，不視為錯誤狀態
          if (errorMessage === 'Login redirect required') {
            set({ isLoading: false });
            return;
          }

          get().setError(errorMessage);
          get().clearAuth();
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          // 執行 LIFF 登出
          handleLogout();

          // 清除本地狀態
          get().clearAuth();

          // 如果在 LINE 內，可以選擇關閉視窗
          if (isInLineApp()) {
            // 給用戶一些時間看到登出成功的反饋
            setTimeout(() => {
              closeLiffWindow();
            }, 1000);
          }

          // 清除持久化儲存
          localStorage.removeItem('auth-storage');
        } catch (error) {
          console.error('Logout failed:', error);
          // 即使登出失敗，也要清除本地狀態
          get().clearAuth();
          localStorage.removeItem('auth-storage');
        }
      },

      refreshAuthState: async () => {
        await get().checkAuthWithoutLogin();
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

        // 先嘗試無需登入的狀態檢查
        await get().checkAuthWithoutLogin();

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
