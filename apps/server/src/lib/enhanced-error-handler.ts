// 增強的錯誤處理系統
import { z } from 'zod';
import { type LogContext, logger } from './logger';

// 錯誤類型枚舉
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_API = 'external_api',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  AI_SERVICE = 'ai_service',
  INTERNAL = 'internal',
}

// 錯誤嚴重程度
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 標準化錯誤響應接口
export interface ErrorResponse {
  error: {
    type: ErrorType;
    code: string;
    message: string;
    userMessage: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId?: string;
  };
}

// 自定義應用錯誤類
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    type: ErrorType,
    code: string,
    message: string,
    userMessage: string,
    statusCode = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: Record<string, any>,
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // 確保堆棧跟踪正確
    Error.captureStackTrace(this, AppError);
  }

  // 創建錯誤響應
  toResponse(requestId?: string): ErrorResponse {
    return {
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        userMessage: this.userMessage,
        details: this.details,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }
}

// 預定義的錯誤創建函數
export const ErrorFactory = {
  // 驗證錯誤
  validation(
    code: string,
    message: string,
    userMessage: string,
    details?: Record<string, any>,
  ): AppError {
    return new AppError(
      ErrorType.VALIDATION,
      code,
      message,
      userMessage,
      400,
      ErrorSeverity.LOW,
      details,
    );
  },

  // 身份驗證錯誤
  authentication(code: string, message: string, userMessage = '身份驗證失敗'): AppError {
    return new AppError(
      ErrorType.AUTHENTICATION,
      code,
      message,
      userMessage,
      401,
      ErrorSeverity.MEDIUM,
    );
  },

  // 授權錯誤
  authorization(code: string, message: string, userMessage = '沒有權限執行此操作'): AppError {
    return new AppError(
      ErrorType.AUTHORIZATION,
      code,
      message,
      userMessage,
      403,
      ErrorSeverity.MEDIUM,
    );
  },

  // 資源未找到錯誤
  notFound(code: string, message: string, userMessage = '請求的資源不存在'): AppError {
    return new AppError(ErrorType.NOT_FOUND, code, message, userMessage, 404, ErrorSeverity.LOW);
  },

  // 衝突錯誤
  conflict(
    code: string,
    message: string,
    userMessage: string,
    details?: Record<string, any>,
  ): AppError {
    return new AppError(
      ErrorType.CONFLICT,
      code,
      message,
      userMessage,
      409,
      ErrorSeverity.MEDIUM,
      details,
    );
  },

  // 外部 API 錯誤
  externalApi(
    code: string,
    message: string,
    userMessage = '外部服務暫時不可用',
    details?: Record<string, any>,
  ): AppError {
    return new AppError(
      ErrorType.EXTERNAL_API,
      code,
      message,
      userMessage,
      502,
      ErrorSeverity.HIGH,
      details,
    );
  },

  // 數據庫錯誤
  database(
    code: string,
    message: string,
    userMessage = '數據操作失敗',
    details?: Record<string, any>,
  ): AppError {
    return new AppError(
      ErrorType.DATABASE,
      code,
      message,
      userMessage,
      500,
      ErrorSeverity.HIGH,
      details,
    );
  },

  // AI 服務錯誤
  aiService(
    code: string,
    message: string,
    userMessage = 'AI 服務暫時不可用',
    details?: Record<string, any>,
  ): AppError {
    return new AppError(
      ErrorType.AI_SERVICE,
      code,
      message,
      userMessage,
      503,
      ErrorSeverity.MEDIUM,
      details,
    );
  },

  // 內部錯誤
  internal(
    code: string,
    message: string,
    userMessage = '服務器內部錯誤',
    details?: Record<string, any>,
  ): AppError {
    return new AppError(
      ErrorType.INTERNAL,
      code,
      message,
      userMessage,
      500,
      ErrorSeverity.CRITICAL,
      details,
    );
  },
};

// 錯誤處理中間件
export class ErrorHandler {
  static handle(error: unknown, context?: LogContext): AppError {
    const logContext = {
      ...context,
      errorHandler: true,
    };

    // 如果已經是 AppError，直接返回
    if (error instanceof AppError) {
      logger.error(`AppError: ${error.message}`, error, {
        ...logContext,
        errorType: error.type,
        errorCode: error.code,
        severity: error.severity,
      });
      return error;
    }

    // 處理 Zod 驗證錯誤
    if (error instanceof z.ZodError) {
      return ErrorHandler.handleZodError(error, logContext);
    }

    // 處理標準 Error
    if (error instanceof Error) {
      return ErrorHandler.handleStandardError(error, logContext);
    }

    // 處理非 Error 類型
    logger.error('Unknown error type', undefined, {
      ...logContext,
      errorValue: error,
      errorType: typeof error,
    });

    return ErrorFactory.internal(
      'UNKNOWN_ERROR',
      `Unknown error: ${JSON.stringify(error)}`,
      '發生了未知錯誤',
    );
  }

  // 處理 Zod 驗證錯誤的統一邏輯（簡化版本，減少重複log）
  private static handleZodError(error: z.ZodError, logContext: any): AppError {
    // 只在非 ORPC 環境下記錄詳細 log（因為 ORPC 已經記錄過了）
    const shouldLog = !logContext?.skipLogging;

    if (shouldLog) {
      logger.error('Zod Validation Error', error, {
        ...logContext,
        issues: error.issues,
      });
    }

    const firstIssue = error.issues[0];
    const fieldPath = firstIssue?.path.join('.') || '未知欄位';
    const fieldName = fieldPath || '未知欄位';

    // 優先使用zod的自定義錯誤訊息
    let userMessage = '輸入資料格式錯誤';
    if (firstIssue?.message && firstIssue.message !== 'Invalid input') {
      userMessage = firstIssue.message;
    } else {
      userMessage = ErrorHandler.getZodErrorUserMessage(firstIssue, fieldName);
    }

    // 收集所有欄位的錯誤訊息
    const allErrors = error.issues.map((issue) => {
      const path = issue.path.join('.') || '未知欄位';
      if (issue.message && issue.message !== 'Invalid input') {
        return `${path}: ${issue.message}`;
      }
      return `${path}: ${ErrorHandler.getZodErrorUserMessage(issue, path)}`;
    });

    return ErrorFactory.validation(
      'VALIDATION_ERROR',
      `Zod validation failed: ${allErrors.join(', ')}`,
      userMessage,
      {
        field: fieldName,
        issues: error.issues,
        allErrors,
      },
    );
  }

  // 處理標準 Error 的統一邏輯
  private static handleStandardError(error: Error, logContext: any): AppError {
    logger.error(`Unhandled Error: ${error.message}`, error, logContext);

    // 檢查是否已經是處理過的 publicProcedure 錯誤
    if ((error as any).statusCode && (error as any).code) {
      console.log('=== Found already processed error from publicProcedure ===');
      console.log('Status code:', (error as any).statusCode);
      console.log('Error code:', (error as any).code);
      console.log('Details:', (error as any).details);

      // 檢查是否有保留的 ZodError
      if ((error as any).zodError) {
        console.log('Found preserved ZodError, processing...');
        return ErrorHandler.handleZodError((error as any).zodError, logContext);
      }

      // 根據狀態碼創建對應的 AppError
      const statusCode = (error as any).statusCode;
      const code = (error as any).code;
      const details = (error as any).details;

      if (statusCode === 400) {
        return ErrorFactory.validation(code, error.message, error.message, details);
      }
      if (statusCode === 401) {
        return ErrorFactory.authentication(code, error.message, error.message);
      }
      if (statusCode === 403) {
        return ErrorFactory.authorization(code, error.message, error.message);
      }
      if (statusCode === 404) {
        return ErrorFactory.notFound(code, error.message, error.message);
      }
      if (statusCode === 409) {
        return ErrorFactory.conflict(code, error.message, error.message, details);
      }
      return ErrorFactory.internal(code, error.message, error.message, details);
    }

    // ORPC 驗證錯誤已經在 publicProcedure 中處理，這裡不應該再遇到
    // 如果遇到，說明是系統級錯誤，按一般錯誤處理

    // 檢查是否為 Axios 錯誤
    if (ErrorHandler.isAxiosError(error)) {
      return ErrorHandler.handleAxiosError(error);
    }

    // 檢查是否為 D1 資料庫錯誤
    if (ErrorHandler.isD1DatabaseError(error)) {
      return ErrorHandler.handleD1DatabaseError(error);
    }

    // 根據錯誤消息內容判斷錯誤類型
    if (error.name === 'ValidationError') {
      return ErrorFactory.validation('VALIDATION_ERROR', error.message, '輸入數據無效');
    }

    if (error.message.includes('token')) {
      return ErrorFactory.authentication('AUTH_TOKEN_ERROR', error.message, '身份驗證失敗');
    }

    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return ErrorFactory.authorization('PERMISSION_ERROR', error.message, '沒有權限執行此操作');
    }

    if (error.message.includes('not found')) {
      return ErrorFactory.notFound('RESOURCE_NOT_FOUND', error.message, '請求的資源不存在');
    }

    // 默認為內部錯誤
    return ErrorFactory.internal('INTERNAL_ERROR', error.message, '服務器內部錯誤');
  }

  // 生成 Zod 錯誤的用戶友好消息
  private static getZodErrorUserMessage(issue: any, fieldName: string): string {
    switch (issue.code) {
      case 'invalid_type': {
        const expected = issue.expected;
        return `欄位「${fieldName}」的資料類型錯誤，期望為 ${expected}`;
      }
      case 'invalid_string': {
        const validation = issue.validation;
        if (validation === 'email') {
          return `欄位「${fieldName}」必須是有效的電子郵件地址`;
        }
        if (validation === 'url') {
          return `欄位「${fieldName}」必須是有效的網址`;
        }
        if (validation === 'uuid') {
          return `欄位「${fieldName}」必須是有效的UUID格式`;
        }
        return `欄位「${fieldName}」格式錯誤`;
      }
      case 'too_small': {
        const minimum = issue.minimum;
        return `欄位「${fieldName}」的值太小，最小值為 ${minimum}`;
      }
      case 'too_big': {
        const maximum = issue.maximum;
        return `欄位「${fieldName}」的值太大，最大值為 ${maximum}`;
      }
      case 'invalid_enum_value': {
        const options = issue.options;
        return `欄位「${fieldName}」的值無效，可選值為：${options?.join('、')}`;
      }
      case 'invalid_date':
        return `欄位「${fieldName}」必須是有效的日期格式`;
      case 'custom':
        return `欄位「${fieldName}」${issue.message}`;
      default:
        if (issue.message.toLowerCase().includes('required')) {
          return `必填欄位「${fieldName}」不能為空`;
        }
        return `欄位「${fieldName}」驗證失敗`;
    }
  }

  // 檢查是否為 Axios 錯誤
  private static isAxiosError(error: Error): boolean {
    return 'response' in error && error.response !== null && typeof error.response === 'object';
  }

  // 處理 Axios 錯誤
  private static handleAxiosError(error: any): AppError {
    const responseData = error.response?.data;
    const statusCode = error.response?.status;
    const errorMessage = responseData?.message || responseData?.error || error.message;

    // LINE API 特定錯誤處理
    if (typeof errorMessage === 'string') {
      if (errorMessage.includes('Invalid reply token')) {
        return ErrorFactory.externalApi(
          'INVALID_REPLY_TOKEN',
          'Reply token 已過期',
          '訊息已過期，無法回覆',
        );
      }
      if (errorMessage.includes('Too Many Requests')) {
        return ErrorFactory.externalApi(
          'RATE_LIMIT',
          'API 請求頻率過高',
          '請求過於頻繁，請稍後再試',
        );
      }
      if (errorMessage.includes('Invalid access token')) {
        return ErrorFactory.authentication('INVALID_ACCESS_TOKEN', 'Access token 無效', '認證失敗');
      }
    }

    // HTTP 狀態碼分類
    if (statusCode >= 400 && statusCode < 500) {
      return ErrorFactory.externalApi(
        `HTTP_${statusCode}`,
        `客戶端錯誤 (${statusCode}): ${errorMessage}`,
        '請求格式錯誤',
      );
    }

    if (statusCode >= 500) {
      return ErrorFactory.externalApi(
        `HTTP_${statusCode}`,
        `伺服器錯誤 (${statusCode})`,
        '外部服務暫時不可用',
      );
    }

    return ErrorFactory.externalApi(
      'NETWORK_ERROR',
      `網路請求失敗: ${errorMessage}`,
      '網路連線失敗',
    );
  }

  // 檢查是否為 D1 資料庫錯誤
  private static isD1DatabaseError(error: Error): boolean {
    const errorText = error.message + (error.stack || '');
    return (
      errorText.includes('D1_ERROR') ||
      errorText.includes('DrizzleQueryError') ||
      errorText.includes('UNIQUE constraint failed') ||
      errorText.includes('FOREIGN KEY constraint failed') ||
      errorText.includes('NOT NULL constraint failed') ||
      errorText.includes('CHECK constraint failed')
    );
  }

  // 處理 D1 資料庫錯誤
  private static handleD1DatabaseError(error: Error): AppError {
    const errorText = error.message + (error.stack || '');

    if (errorText.includes('UNIQUE constraint failed')) {
      let userMessage = '資料重複';
      if (errorText.includes('message_id')) {
        userMessage = '此訊息已經處理過，請勿重複提交';
      } else if (errorText.includes('user_id')) {
        userMessage = '用戶ID重複';
      }

      return ErrorFactory.conflict(
        'UNIQUE_CONSTRAINT',
        `D1 唯一約束錯誤: ${error.message}`,
        userMessage,
      );
    }

    if (errorText.includes('FOREIGN KEY constraint failed')) {
      return ErrorFactory.database(
        'FOREIGN_KEY_CONSTRAINT',
        `D1 外鍵約束錯誤: ${error.message}`,
        '資料關聯錯誤',
      );
    }

    if (errorText.includes('NOT NULL constraint failed')) {
      return ErrorFactory.database(
        'NOT_NULL_CONSTRAINT',
        `D1 非空約束錯誤: ${error.message}`,
        '必要資料缺失',
      );
    }

    if (errorText.includes('CHECK constraint failed')) {
      return ErrorFactory.database(
        'CHECK_CONSTRAINT',
        `D1 檢查約束錯誤: ${error.message}`,
        '資料格式錯誤',
      );
    }

    return ErrorFactory.database(
      'DATABASE_ERROR',
      `D1 資料庫錯誤: ${error.message}`,
      '數據操作失敗',
    );
  }

  // 記錄並返回適當的響應
  static handleAndRespond(
    error: unknown,
    requestId?: string,
    context?: LogContext,
  ): {
    statusCode: number;
    response: ErrorResponse;
  } {
    const appError = ErrorHandler.handle(error, context);

    return {
      statusCode: appError.statusCode,
      response: appError.toResponse(requestId),
    };
  }

  // 創建統一的路由錯誤處理器
  static createRouteHandler<T>(
    handler: (c: any, input?: T) => Promise<any>,
    errorMessage = 'Operation failed',
  ) {
    return async (c: any, input?: T) => {
      try {
        return await handler(c, input);
      } catch (error) {
        const { statusCode, response } = ErrorHandler.handleAndRespond(
          error,
          c.get?.('requestId'),
          { operation: errorMessage },
        );
        return c.json(response, statusCode);
      }
    };
  }
}

// 便利函數，用於包裝異步操作
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context?: LogContext,
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const appError = ErrorHandler.handle(error, context);
    return { data: null, error: appError };
  }
}

// 用於向後兼容的函數別名
export const parseError = (error: unknown, context?: string) => {
  const appError = ErrorHandler.handle(error, { operation: context });
  return {
    type: appError.type,
    code: appError.code,
    message: appError.message,
    userMessage: appError.userMessage,
    shouldReply: true, // 保持向後兼容
  };
};

// 統一錯誤代碼常量
export const ERROR_CODES = {
  // 驗證錯誤
  VALIDATION: {
    ZOD_ERROR: 'ZOD_VALIDATION_ERROR',
    INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
    MISSING_REQUIRED: 'VALIDATION_MISSING_REQUIRED',
    INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  },
  // 認證錯誤
  AUTH: {
    INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  },
  // 數據庫錯誤
  DATABASE: {
    UNIQUE_CONSTRAINT: 'UNIQUE_CONSTRAINT',
    FOREIGN_KEY_CONSTRAINT: 'FOREIGN_KEY_CONSTRAINT',
    NOT_NULL_CONSTRAINT: 'NOT_NULL_CONSTRAINT',
    CHECK_CONSTRAINT: 'CHECK_CONSTRAINT',
  },
  // 外部API錯誤
  EXTERNAL_API: {
    INVALID_REPLY_TOKEN: 'INVALID_REPLY_TOKEN',
    RATE_LIMIT: 'RATE_LIMIT',
    INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
  },
};

// 向後兼容的工具函數
export const createRouteHandler = ErrorHandler.createRouteHandler;
