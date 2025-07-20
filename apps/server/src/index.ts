import { RPCHandler } from '@orpc/server/fetch';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { CalendarEventController } from './calendar-events/controller';
import type { Database } from './db';
import { createDb } from './db';
import { FileController } from './files/controller';
import { createContext } from './lib/context';
import { ErrorHandler } from './lib/enhanced-error-handler';
import { generateICS } from './lib/ics';
import { createLineApiService } from './lib/line-api';
import { logger } from './lib/logger';
import { verifyOrpcAuth, verifyOrpcAuthOptional } from './middlewares/verify';
import { appRouter } from './routers/index';
import type { EnvironmentBindings } from './types/env';
import { assertEnvironment } from './types/env';
import { handleWebhook } from './webhook/handler';

// 重新導出環境變數類型，保持向後兼容
export type Bindings = EnvironmentBindings;

// 可以在 c.get('') 中使用的變數
export type Variables = {
  db: Database;
  liffUser?: {
    userId: string;
    accessToken: string;
  };
};

export type AppContext = {
  Bindings: Bindings;
  Variables: Variables;
};

const app = new Hono<AppContext>();

app.use(honoLogger());

// 環境變數驗證中間件
app.use('*', async (c, next) => {
  try {
    assertEnvironment(c.env);
    await next();
  } catch (error) {
    console.error('Environment validation failed:', error);
    return c.json(
      {
        error: 'Server configuration error',
        message: 'Missing required environment variables',
      },
      500,
    );
  }
});

// 增強的全域錯誤處理中間件
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // 記錄請求開始
  logger.httpRequest(c.req.method, c.req.path, {
    requestId,
    userAgent: c.req.header('User-Agent'),
    ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
  });

  try {
    await next();

    // 記錄成功響應
    const duration = Date.now() - startTime;
    logger.httpResponse(c.req.method, c.req.path, c.res.status, duration, {
      requestId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    // 使用增強的錯誤處理
    const { statusCode, response } = ErrorHandler.handleAndRespond(error, requestId, {
      method: c.req.method,
      path: c.req.path,
      duration,
    });

    // 記錄錯誤響應
    logger.httpResponse(c.req.method, c.req.path, statusCode, duration, {
      requestId,
      error: true,
    });

    // 防止進程崩潰，返回結構化錯誤響應
    if (!c.finalized) {
      return c.json(response, statusCode as ContentfulStatusCode);
    }
  }
});

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      return c.env.CORS_ORIGIN || origin;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.use('*', async (c, next) => {
  c.set('db', createDb(c.env.DB));
  return await next();
});

// Apply ORPC authentication middleware conditionally
// 根據API方法決定認證策略
const AUTH_STRATEGY = {
  NONE: 'none', // 無需認證
  OPTIONAL: 'optional', // 可選認證
  REQUIRED: 'required', // 必須認證
} as const;

const API_AUTH_MAP: Record<string, (typeof AUTH_STRATEGY)[keyof typeof AUTH_STRATEGY]> = {
  // 群組相關API - 現在需要認證
  getGroupEvents: AUTH_STRATEGY.REQUIRED,
  getGroupFiles: AUTH_STRATEGY.REQUIRED,
  updateGroupFileName: AUTH_STRATEGY.REQUIRED,
  deleteGroupFile: AUTH_STRATEGY.REQUIRED,
  getGroupIncompleteExpiredEvents: AUTH_STRATEGY.REQUIRED,

  // 混合上下文API - 必須認證（統一處理）
  createEvent: AUTH_STRATEGY.REQUIRED,
  updateEvent: AUTH_STRATEGY.REQUIRED,
  deleteEvent: AUTH_STRATEGY.REQUIRED,

  // 檔案上傳 - 必須認證
  uploadFile: AUTH_STRATEGY.REQUIRED,
  uploadGroupFile: AUTH_STRATEGY.REQUIRED,

  // 默認 - 必須認證
};

app.use('/rpc/*', async (c, next) => {
  try {
    const url = new URL(c.req.url);
    const method = url.pathname.split('/').pop();

    if (!method) {
      return await verifyOrpcAuth(c, next);
    }

    const authStrategy = API_AUTH_MAP[method] || AUTH_STRATEGY.REQUIRED;

    switch (authStrategy) {
      case AUTH_STRATEGY.NONE:
        return await next();
      case AUTH_STRATEGY.OPTIONAL:
        return await verifyOrpcAuthOptional(c, next);
      default:
        return await verifyOrpcAuth(c, next);
    }
  } catch {
    // 如果URL解析失敗，使用必須認證
    return await verifyOrpcAuth(c, next);
  }
});

// RPC Handler for existing functionality
const handler = new RPCHandler(appRouter);
app.use('/rpc/*', async (c, next) => {
  try {
    const context = await createContext({ context: c });
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: '/rpc',
      context: context,
    });

    if (matched) {
      return c.newResponse(response.body, response);
    }
    await next();
  } catch (error) {
    console.error('ORPC handler error:', error);

    // 只處理系統級錯誤（createContext、handler.handle 本身的錯誤）
    // procedure 內部的錯誤已被 oRPC 處理並包裝成 HTTP 回應
    const { statusCode, response: errorResponse } = ErrorHandler.handleAndRespond(
      error,
      crypto.randomUUID(),
      {
        method: c.req.method,
        path: c.req.path,
        duration: 0,
      },
    );

    return c.json(errorResponse, statusCode as ContentfulStatusCode);
  }
});

app.get('/echo', (c) => {
  const { name } = c.req.query();
  return c.text(`Hello ${name}`);
});

// Shared ICS handler function
const handleICSRequest = async (
  c: Context<AppContext>,
  entityId: string,
  entityType: 'user' | 'group',
) => {
  const db = c.get('db');

  try {
    const calendarEventController = new CalendarEventController(db);

    // Fetch events based on entity type
    const events =
      entityType === 'user'
        ? await calendarEventController.getEventsByUserId(entityId)
        : await calendarEventController.getGroupEventsByGroupId(entityId);

    // Get display name from LINE API
    let displayName = entityType === 'user' ? entityId : `群組 ${entityId}`;
    try {
      const lineApiService = createLineApiService(c.env.LINE_ACCESS_TOKEN);
      displayName = await lineApiService.getDisplayName(entityId, entityType);
    } catch (error) {
      console.warn(`Failed to get ${entityType} display name, using ${entityType}Id:`, error);
    }

    const icsContent = generateICS(events, entityId, displayName);

    // Set response headers
    c.header('Content-Type', 'text/calendar; charset=utf-8');
    const safeFileName = displayName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    c.header('Content-Disposition', `inline; filename="${safeFileName}-calendar.ics"`);
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('X-Robots-Tag', 'noindex, nofollow');

    return c.text(icsContent);
  } catch (error) {
    console.error(`Error generating ${entityType} ICS:`, error);
    return c.json({ error: `Failed to generate ${entityType} ICS file` }, 500);
  }
};

app.get('/ics/:userId', async (c) => {
  const userId = c.req.param('userId');
  return handleICSRequest(c, userId, 'user');
});

app.get('/ics/group/:groupId', async (c) => {
  const groupId = c.req.param('groupId');
  return handleICSRequest(c, groupId, 'group');
});

// File storage route for local development only
app.get('/storage/*', async (c) => {
  if (c.env.ENV !== 'local') {
    return c.json({ error: 'File storage access not available in production' }, 404);
  }

  const actualPath = c.req.path.replace(/^\/storage\//, '');
  if (!actualPath) {
    return c.json({ error: 'Storage path required' }, 400);
  }

  try {
    const pathParts = actualPath.split('/');
    const db = c.get('db');
    const controller = new FileController(db, c.env.APP_STORAGE);

    // Handle group files: groups/groupId/fileId
    if (pathParts[0] === 'groups' && pathParts.length >= 3) {
      const groupId = pathParts[1];
      const fileId = pathParts[2];

      const file = await controller.getFile(fileId);
      if (!file || file.groupId !== groupId) {
        return c.json({ error: 'Group file not found' }, 404);
      }

      const fileContent = await controller.getGroupFileContent(groupId, fileId);
      if (!fileContent) {
        return c.json({ error: 'Group file content not found' }, 404);
      }

      c.header('Content-Type', file.mimeType);
      c.header('Content-Disposition', `inline; filename="${file.fileName}"`);

      return c.body(fileContent);
    }

    // Handle user files: users/userId/fileId (for backward compatibility)
    if (pathParts[0] === 'users' && pathParts.length >= 3) {
      const userId = pathParts[1];
      const fileId = pathParts[2];

      const file = await controller.getFile(fileId);
      if (!file || file.userId !== userId || file.groupId) {
        return c.json({ error: 'User file not found' }, 404);
      }

      const fileContent = await controller.getFileContent(userId, fileId);
      if (!fileContent) {
        return c.json({ error: 'User file content not found' }, 404);
      }

      c.header('Content-Type', file.mimeType);
      c.header('Content-Disposition', `inline; filename="${file.fileName}"`);

      return c.body(fileContent);
    }

    // Legacy support: userId/fileId
    if (pathParts.length >= 2) {
      const userId = pathParts[0];
      const fileId = pathParts[1];

      const file = await controller.getFile(fileId);
      if (!file || file.userId !== userId) {
        return c.json({ error: 'File not found' }, 404);
      }

      const fileContent = await controller.getFileContent(userId, fileId);
      if (!fileContent) {
        return c.json({ error: 'File content not found' }, 404);
      }

      c.header('Content-Type', file.mimeType);
      c.header('Content-Disposition', `inline; filename="${file.fileName}"`);

      return c.body(fileContent);
    }

    return c.json({ error: 'Invalid storage path' }, 400);
  } catch (error) {
    console.error('Error accessing storage:', error);
    return c.json({ error: 'Failed to access storage' }, 500);
  }
});

app.post('/webhook', async (c) => {
  const { events } = await c.req.json();

  try {
    // const response = await handleWebhook(events, c);
    // return c.text(response);
    const processingPromise = handleWebhook(events, c);
    c.executionCtx.waitUntil(processingPromise);

    const response = await processingPromise;
    return c.text(response);
  } catch (error) {
    console.error('🚀 ~ webhook error:', error);
    return c.text(`Error: ${error}`, 500);
  }
});

// 全域未處理的 Promise rejection 處理
// 在 Node.js 環境中
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // 不退出進程，只記錄錯誤
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // 在生產環境中可能需要重啟，但在開發環境中保持運行
  });
}

// 在 Workers 環境中
if (typeof addEventListener !== 'undefined') {
  addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    // 防止默認行為（通常是拋出錯誤）
    event.preventDefault();
  });
}

export default {
  fetch: app.fetch,
};
