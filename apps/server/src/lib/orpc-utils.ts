import { z } from 'zod';

/**
 * 從 ORPC 錯誤中提取 ZodError 或創建通用驗證錯誤
 * 增強版本：更好地提取原始ZodError，減少log，提供更具體的錯誤信息
 */
export const extractZodErrorFromORPC = (error: Error): z.ZodError => {
  // 情況1: 直接是 ZodError
  if (error instanceof z.ZodError) {
    return error;
  }

  // 情況2: 檢查 cause 屬性（最常見的ORPC包裝）
  if ((error as any).cause instanceof z.ZodError) {
    return (error as any).cause;
  }

  // 情況3: 檢查 original 屬性（另一種ORPC包裝）
  if ((error as any).original instanceof z.ZodError) {
    return (error as any).original;
  }

  // 情況4: 檢查 data 屬性（ORPC 最常將ZodError包裝在這裡）
  if ((error as any).data) {
    const data = (error as any).data;

    // 檢查 data 是否為 ZodError
    if (data instanceof z.ZodError) {
      return data;
    }

    // 檢查 data.cause
    if (data.cause instanceof z.ZodError) {
      return data.cause;
    }

    // 檢查 data.issues （最常見的情況）
    if (data.issues && Array.isArray(data.issues)) {
      return new z.ZodError(data.issues);
    }

    // 檢查 data 內部的其他屬性
    if (typeof data === 'object') {
      for (const key of Object.keys(data)) {
        const value = data[key];
        if (value instanceof z.ZodError) {
          return value;
        }
        if (value?.issues && Array.isArray(value.issues)) {
          return new z.ZodError(value.issues);
        }
      }
    }
  }

  // 情況5: 檢查 details 屬性中的錯誤
  if ((error as any).details && Array.isArray((error as any).details)) {
    const details = (error as any).details;
    if (details.length > 0 && details[0].issues) {
      return new z.ZodError(details[0].issues);
    }
  }

  // 情況6: 檢查是否有issues屬性直接在錯誤上
  if ((error as any).issues && Array.isArray((error as any).issues)) {
    return new z.ZodError((error as any).issues);
  }

  // 如果都找不到，嘗試從錯誤堆棧中推斷是哪個欄位
  const errorDetails = analyzeORPCErrorForField(error);

  return new z.ZodError([
    {
      code: 'invalid_type',
      expected: 'string',
      received: 'undefined',
      path: [errorDetails.fieldName],
      message: errorDetails.message,
    },
  ]);
};

/**
 * 分析 ORPC 錯誤，嘗試推斷是哪個欄位出錯
 */
const analyzeORPCErrorForField = (error: Error): { fieldName: string; message: string } => {
  const errorObj = error as any;

  // 檢查常見的必填欄位
  const commonRequiredFields = [
    'userId',
    'groupId',
    'fileName',
    'fileType',
    'fileSize',
    'fileData',
  ];

  // 嘗試從錯誤堆棧或錯誤信息中匹配欄位名
  const errorString = JSON.stringify(errorObj).toLowerCase();

  for (const field of commonRequiredFields) {
    if (errorString.includes(field.toLowerCase())) {
      return {
        fieldName: field,
        message: `${field} 是必填欄位，不能為空或 undefined`,
      };
    }
  }

  // 如果找不到具體欄位，返回通用錯誤
  return {
    fieldName: '輸入參數',
    message: '缺少必填欄位或資料格式錯誤，請檢查所有輸入參數',
  };
};

/**
 * 檢查是否為 ORPC 驗證錯誤
 * 簡化判斷條件，只檢查最關鍵的特徵
 */
export const isORPCValidationError = (error: Error): boolean => {
  return (
    error.message === 'Input validation failed' ||
    error.name === 'ValidationError' ||
    error.constructor.name === 'ValidationError' ||
    error.constructor.name === 'ORPCError'
  );
};
