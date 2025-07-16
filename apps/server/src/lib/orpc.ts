import { ORPCError, os } from '@orpc/server';
import { z } from 'zod';
import type { Context } from './context';
import { ErrorHandler } from './enhanced-error-handler';
import { extractZodErrorFromORPC, isORPCValidationError } from './orpc-utils';

// 創建帶有錯誤處理的基礎過程
const basePublicProcedure = os.$context<Context>();

/**
 * 創建 ORPC 錯誤回應（統一的錯誤處理函數）
 */
function createORPCErrorResponse(zodError: z.ZodError, userMessage: string) {
  console.log('=== ORPC Validation Error ===');
  console.log('User Message:', userMessage);
  console.log(
    'Issues:',
    zodError.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  );

  // 使用 ORPCError 而不是普通的 Error，確保狀態碼正確映射
  const orpcError = new ORPCError('BAD_REQUEST', {
    message: userMessage,
    data: {
      type: 'validation',
      code: 'VALIDATION_ERROR',
      message: userMessage,
      userMessage: userMessage,
      issues: zodError.issues,
    },
  });

  return orpcError;
}

export const publicProcedure = basePublicProcedure.use(async ({ next, context }) => {
  try {
    return await next();
  } catch (error) {
    console.log('=== publicProcedure error handler ===');
    console.log('Error type:', error instanceof Error ? error.constructor.name : typeof error);

    // 檢查是否是 ORPC 的輸入驗證錯誤
    if (error instanceof Error && isORPCValidationError(error)) {
      const zodError = extractZodErrorFromORPC(error);
      const userMessage = zodError.issues[0]?.message || '輸入資料驗證錯誤';
      throw createORPCErrorResponse(zodError, userMessage);
    }

    // 直接處理 ZodError（如果直接拋出）
    if (error instanceof z.ZodError) {
      const userMessage = error.issues[0]?.message || '輸入資料驗證錯誤';
      throw createORPCErrorResponse(error, userMessage);
    }

    // 處理其他類型的錯誤（不要重複處理，直接拋出）
    console.log('=== Non-validation error, throwing directly ===');
    console.log('Message:', error instanceof Error ? error.message : String(error));

    throw error; // 直接拋出，讓上層處理
  }
});
