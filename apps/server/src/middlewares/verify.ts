import axios from 'axios';
import type { Context, Next } from 'hono';
import type { AppContext } from '../index';

// 共用的 LIFF 使用者資訊類型
interface LiffUser {
  userId: string;
  accessToken: string;
}

// 共用的 LIFF 驗證邏輯
const verifyLiffToken = async (accessToken: string): Promise<LiffUser> => {
  const response = await axios.get('https://api.line.me/oauth2/v2.1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status !== 200) {
    throw new Error('Invalid access token');
  }

  return {
    userId: response.data.sub,
    accessToken: accessToken,
  };
};

// 從 Authorization header 中提取 access token
const extractAccessToken = (authHeader: string | undefined): string => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Access token is required');
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

// LIFF Access Token 驗證中間件
const verifyLiffAccessToken = async (c: Context<AppContext>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = extractAccessToken(authHeader);
    const liffUser = await verifyLiffToken(accessToken);

    c.set('liffUser', liffUser);
    return await next();
  } catch (error) {
    console.error('LIFF token verification failed:', error);
    const message = error instanceof Error ? error.message : 'Invalid access token';
    return c.json({ error: message }, 401);
  }
};

// 驗證路由參數中的userId與登入用戶userId是否相同
const verifyUserIdMatch = async (c: Context<AppContext>, next: Next) => {
  const routeUserId = c.req.param('userId');
  const liffUser = c.get('liffUser');

  if (!liffUser || !liffUser.userId) {
    return c.json({ error: 'User not authenticated' }, 401);
  }

  if (routeUserId !== liffUser.userId) {
    return c.json({ error: 'Unauthorized: User ID mismatch' }, 403);
  }

  return await next();
};

// ORPC 專用的驗證中間件
const verifyOrpcAuth = async (c: Context<AppContext>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = extractAccessToken(authHeader);
    const liffUser = await verifyLiffToken(accessToken);

    c.set('liffUser', liffUser);
    return await next();
  } catch (error) {
    console.error('ORPC auth verification failed:', error);

    // 處理 Axios 特定錯誤
    if (axios.isAxiosError(error)) {
      const response = error.response;
      if (response?.status === 401) {
        return c.json({ error: 'Invalid access token' }, 401);
      }
      if (response?.status && response.status >= 500) {
        return c.json({ error: 'Authentication service unavailable' }, 503);
      }
    }

    // 處理自定義錯誤訊息
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return c.json({ error: message }, 401);
  }
};

// 可選的ORPC認證中間件（允許無認證訪問）
const verifyOrpcAuthOptional = async (c: Context<AppContext>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    // 如果沒有提供Authorization header，設定空的liffUser並繼續
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      c.set('liffUser', undefined);
      return await next();
    }

    const accessToken = extractAccessToken(authHeader);
    const liffUser = await verifyLiffToken(accessToken);

    c.set('liffUser', liffUser);
    return await next();
  } catch (error) {
    console.error('ORPC optional auth verification failed:', error);

    // 對於可選認證，如果驗證失敗，設定空的liffUser並繼續
    c.set('liffUser', undefined);
    return await next();
  }
};

export { verifyLiffAccessToken, verifyUserIdMatch, verifyOrpcAuth, verifyOrpcAuthOptional };
