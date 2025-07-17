import liff from '@line/liff';
import { useAuthStore } from '../auth/authStore';

const liffId = import.meta.env.VITE_LIFF_ID;

interface ILiffProfile {
  displayName: string;
  userId: string;
  pictureUrl?: string;
}

// LIFF 初始化狀態管理
let isLiffInitialized = false;
let liffInitPromise: Promise<void> | null = null;

// 初始化 LIFF
const initLiff = async (): Promise<void> => {
  // 如果已經初始化，直接返回
  if (isLiffInitialized) {
    return;
  }

  // 如果正在初始化，等待現有的初始化完成
  if (liffInitPromise) {
    return liffInitPromise;
  }

  if (!liffId) {
    throw new Error('VITE_LIFF_ID is not configured');
  }

  liffInitPromise = liff.init({ liffId }).then(() => {
    isLiffInitialized = true;
    liffInitPromise = null;
  });

  try {
    await liffInitPromise;
  } catch (error) {
    liffInitPromise = null;
    console.error('LIFF initialization failed:', error);
    throw error;
  }
};

// 檢查是否在 LINE 環境中
const isInLineApp = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  // 如果 LIFF 已經初始化，使用官方 API
  if (isLiffInitialized) {
    return liff.isInClient();
  }

  // 如果 LIFF 未初始化，透過 User Agent 檢測
  // LINE 內建瀏覽器的 User Agent 通常包含 "Line" 字串
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('line');
};

// 處理登入
const handleLogin = async (
  redirectUri?: string,
): Promise<{ profile: ILiffProfile; accessToken: string }> => {
  try {
    await initLiff();

    if (!liff.isLoggedIn()) {
      // 如果在 LINE 內，直接登入；如果在外部瀏覽器，會跳轉到 LINE 登入頁面
      if (redirectUri) {
        liff.login({ redirectUri });
      } else {
        liff.login();
      }
      // 在外部瀏覽器中，這行代碼不會執行到，因為會跳轉到 LINE
      throw new Error('Login redirect required');
    }

    const profile = await liff.getProfile();
    const accessToken = liff.getAccessToken();

    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    return { profile, accessToken };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// 檢查登入狀態（不觸發登入）
const checkLoginStatus = async (): Promise<{
  profile: ILiffProfile;
  accessToken: string;
} | null> => {
  try {
    await initLiff();

    if (!liff.isLoggedIn()) {
      return null;
    }

    const profile = await liff.getProfile();
    const accessToken = liff.getAccessToken();

    if (!accessToken) {
      return null;
    }

    return { profile, accessToken };
  } catch (error) {
    console.error('Check login status failed:', error);
    return null;
  }
};

// 登出
const handleLogout = (): void => {
  try {
    if (isLiffInitialized && liff.isLoggedIn()) {
      liff.logout();
    }
  } catch (error) {
    console.error('LIFF logout failed:', error);
    // 即使 LIFF 登出失敗，也繼續執行本地清理
  }
};

// 關閉 LIFF 視窗（僅在 LINE 內有效）
const closeLiffWindow = () => {
  if (isLiffInitialized && liff.isInClient()) {
    liff.closeWindow();
  }
};

// 獲取認證標頭
const getAuthHeaders = () => {
  const accessToken = useAuthStore.getState().accessToken;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

// 獲取 LIFF 環境資訊
const getLiffContext = () => {
  if (!isLiffInitialized) {
    return null;
  }

  return {
    isInClient: liff.isInClient(),
    isLoggedIn: liff.isLoggedIn(),
    language: liff.getLanguage(),
    version: liff.getVersion(),
    lineVersion: liff.getLineVersion(),
    isApiAvailable: liff.isApiAvailable('shareTargetPicker'),
  };
};

// 處理帶有重定向的登入
const handleLoginWithRedirect = async (fromPage: string): Promise<void> => {
  try {
    await initLiff();

    if (!liff.isLoggedIn()) {
      const redirectUri = `${window.location.origin}/callback?from=${fromPage}`;
      liff.login({ redirectUri });
      throw new Error('Login redirect required');
    }
  } catch (error) {
    console.error('Login with redirect failed:', error);
    throw error;
  }
};

export {
  initLiff,
  handleLogin,
  handleLoginWithRedirect,
  handleLogout,
  checkLoginStatus,
  closeLiffWindow,
  getAuthHeaders,
  getLiffContext,
  isInLineApp,
};

export type { ILiffProfile };
