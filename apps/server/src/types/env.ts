// 環境變數嚴格類型定義
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

// 必需的環境變數
export interface RequiredBindings {
  LINE_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
  GOOGLE_AI_API_KEY: string;
  DB: D1Database;
  APP_STORAGE: R2Bucket;
  ENV: 'local' | 'production' | 'development';
}

// 可選的環境變數
export interface OptionalBindings {
  LINE_BOT_USER_ID?: string;
  CORS_ORIGIN?: string;
  FRONTEND_URL?: string;
}

// 完整的環境變數類型
export type EnvironmentBindings = RequiredBindings & OptionalBindings;

// 環境變數驗證函數
export function validateEnvironment(env: any): env is EnvironmentBindings {
  const requiredKeys: (keyof RequiredBindings)[] = [
    'LINE_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'GOOGLE_AI_API_KEY',
    'DB',
    'APP_STORAGE',
  ];

  for (const key of requiredKeys) {
    if (!env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      return false;
    }
  }

  return true;
}

// 環境變數類型守護函數
export function assertEnvironment(env: any): asserts env is EnvironmentBindings {
  if (!validateEnvironment(env)) {
    throw new Error('Environment validation failed');
  }
}
