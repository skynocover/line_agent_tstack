// 認證相關的工具函數，避免重複邏輯

/**
 * 根據當前路徑生成頁面標識符
 * 用於登入重定向和頁面識別
 */
export const getPageIdentifier = (pathname: string): string => {
  // 個人頁面路由 /:userId/files -> files
  const personalMatch = pathname.match(/^\/[^/]+\/(files|todo|settings)$/);
  if (personalMatch) {
    return personalMatch[1];
  }

  // 群組頁面路由 /group/:groupId/files -> group-:groupId-files
  const groupMatch = pathname.match(/^\/group\/([^/]+)\/(files|todo)$/);
  if (groupMatch) {
    return `group-${groupMatch[1]}-${groupMatch[2]}`;
  }

  // 其他路由或首頁
  return 'home';
};

/**
 * 清理認證存儲的統一方法
 * 確保所有相關的本地存儲都被清理
 */
export const clearAuthStorage = (): void => {
  localStorage.removeItem('auth-storage');
};

/**
 * 處理認證錯誤的統一方法
 * 根據錯誤類型決定是否需要清理狀態
 */
export const shouldClearAuthOnError = (error: Error): boolean => {
  const errorMessage = error.message.toLowerCase();

  // 不需要清理狀態的錯誤類型
  const nonClearingErrors = ['login redirect required', 'network error'];

  return !nonClearingErrors.some((msg) => errorMessage.includes(msg));
};

/**
 * 標準化錯誤消息
 * 將技術性錯誤轉換為用戶友好的消息
 */
export const normalizeAuthError = (error: Error): string => {
  const errorMessage = error.message;

  // 特定錯誤的用戶友好消息
  const errorMap: Record<string, string> = {
    'Login redirect required': '正在重定向至登入頁面',
    'Failed to get access token': '無法獲取存取權杖，請重新登入',
    'VITE_LIFF_ID is not configured': '系統配置錯誤，請聯繫管理員',
    'Network error': '網路錯誤，請檢查網路連線',
  };

  return errorMap[errorMessage] || '登入過程發生錯誤';
};

/**
 * 檢查是否為重定向錯誤
 * 這類錯誤不應該顯示為錯誤狀態
 */
export const isRedirectError = (error: Error): boolean => {
  return error.message === 'Login redirect required';
};
