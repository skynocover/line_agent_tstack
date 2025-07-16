// 結構化日誌系統
export interface LogContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
    error?: Error,
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: this.formatTimestamp(),
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    const logMessage = JSON.stringify(entry, null, 2);

    switch (entry.level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.output(this.createLogEntry('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    this.output(this.createLogEntry('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.output(this.createLogEntry('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.output(this.createLogEntry('error', message, context, error));
  }

  // 性能計時工具
  startTimer(operation: string, context?: LogContext): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.info(`Operation completed: ${operation}`, {
        ...context,
        operation,
        duration,
      });
    };
  }

  // HTTP 請求日誌
  httpRequest(method: string, path: string, context?: LogContext): void {
    this.info(`HTTP ${method} ${path}`, {
      ...context,
      method,
      path,
      type: 'http_request',
    });
  }

  // HTTP 響應日誌
  httpResponse(
    method: string,
    path: string,
    status: number,
    duration: number,
    context?: LogContext,
  ): void {
    this.info(`HTTP ${method} ${path} - ${status}`, {
      ...context,
      method,
      path,
      status,
      duration,
      type: 'http_response',
    });
  }

  // 數據庫操作日誌
  dbOperation(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB ${operation} on ${table}`, {
      ...context,
      operation,
      table,
      type: 'db_operation',
    });
  }

  // AI 操作日誌
  aiOperation(operation: string, model?: string, context?: LogContext): void {
    this.info(`AI ${operation}`, {
      ...context,
      operation,
      model,
      type: 'ai_operation',
    });
  }

  // LINE API 操作日誌
  lineApiOperation(operation: string, context?: LogContext): void {
    this.info(`LINE API ${operation}`, {
      ...context,
      operation,
      type: 'line_api',
    });
  }
}

// 導出單例 logger 實例
export const logger = new Logger();

// 為了向後兼容，也導出一些便利函數
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logError = (message: string, error?: Error, context?: LogContext) =>
  logger.error(message, error, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
