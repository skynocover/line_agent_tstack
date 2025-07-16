import { z } from 'zod';
import type { calendarEvents } from '@/db/schema';
import { CalendarEventController } from '../calendar-events/controller';
import { FileController } from '../files/controller';
import { withConditionalAuth, withUserAuth } from '../lib/auth-helpers';
import {
  BaseEventSchema,
  GroupEventsQuerySchema,
  GroupFileOperationSchema,
  GroupFilesQuerySchema,
  UserEventsQuerySchema,
  UserFileOperationSchema,
  UserFilesQuerySchema,
} from '../lib/common-schemas';
import { parseError } from '../lib/enhanced-error-handler';
import { publicProcedure } from '../lib/orpc';

// 完整事件 Schema（包含ID和實體資訊）
const CalendarEventSchema = BaseEventSchema.extend({
  id: z.number().optional(),
  userId: z.string(),
  groupId: z.string().optional(),
});

const CreateEventSchema = CalendarEventSchema.omit({ id: true });
const UpdateEventSchema = CalendarEventSchema.partial().extend({
  id: z.number(),
  userId: z.string(),
});

const DeleteEventSchema = z.object({
  id: z.number(),
  userId: z.string(),
});

const GetIncompleteExpiredEventsSchema = z.object({
  userId: z.string(),
});

const GetGroupIncompleteExpiredEventsSchema = z.object({
  groupId: z.string(),
});

const GetFileSchema = z.object({
  fileId: z.string(),
});

// 保留原有的Schema定義以確保向後兼容
const DeleteFileSchema = UserFileOperationSchema.pick({ fileId: true, userId: true });
const UpdateFileNameSchema = UserFileOperationSchema.extend({ fileName: z.string() });
const UpdateGroupFileNameSchema = GroupFileOperationSchema.extend({ fileName: z.string() });
const DeleteGroupFileSchema = GroupFileOperationSchema.pick({ fileId: true, groupId: true });

// 檔案上傳 Schema
const UploadFileSchema = z.object({
  userId: z
    .string({
      required_error: 'User ID is required',
      invalid_type_error: 'User ID must be a string',
    })
    .min(1, 'User ID cannot be empty'),
  fileName: z
    .string({
      required_error: 'File name is required',
      invalid_type_error: 'File name must be a string',
    })
    .min(1, 'File name cannot be empty')
    .max(255, 'File name too long'),
  fileType: z
    .string({
      required_error: 'File type is required',
      invalid_type_error: 'File type must be a string',
    })
    .min(1, 'File type cannot be empty'),
  fileSize: z
    .number({
      required_error: 'File size is required',
      invalid_type_error: 'File size must be a number',
    })
    .min(1, 'File size must be greater than 0')
    .max(50 * 1024 * 1024, 'File size too large (max 50MB)'),
  fileData: z
    .string({
      required_error: 'File data is required',
      invalid_type_error: 'File data must be a string',
    })
    .min(1, 'File data cannot be empty'),
});

const UploadGroupFileSchema = z.object({
  groupId: z
    .string({
      required_error: 'Group ID is required',
      invalid_type_error: 'Group ID must be a string',
    })
    .min(1, 'Group ID cannot be empty'),
  userId: z
    .string({
      required_error: 'User ID is required',
      invalid_type_error: 'User ID must be a string',
    })
    .min(1, 'User ID cannot be empty'), // 上傳者ID
  fileName: z
    .string({
      required_error: 'File name is required',
      invalid_type_error: 'File name must be a string',
    })
    .min(1, 'File name cannot be empty')
    .max(255, 'File name too long'),
  fileType: z
    .string({
      required_error: 'File type is required',
      invalid_type_error: 'File type must be a string',
    })
    .min(1, 'File type cannot be empty'),
  fileSize: z
    .number({
      required_error: 'File size is required',
      invalid_type_error: 'File size must be a number',
    })
    .min(1, 'File size must be greater than 0')
    .max(50 * 1024 * 1024, 'File size too large (max 50MB)'),
  fileData: z
    .string({
      required_error: 'File data is required',
      invalid_type_error: 'File data must be a string',
    })
    .min(1, 'File data cannot be empty'),
});

export const appRouter = {
  healthCheck: publicProcedure.handler((o) => {
    return 'OK';
  }),

  // Calendar Events
  getEvents: publicProcedure.input(UserEventsQuerySchema).handler(
    withUserAuth(async (input, context) => {
      try {
        const controller = new CalendarEventController(context.db);
        return await controller.getUserEvents(
          input.userId,
          input.page,
          input.limit,
          'start',
          'asc',
          undefined,
          input.startTime,
          input.endTime,
        );
      } catch (error) {
        const errorInfo = parseError(error, 'fetch events');
        const enhancedError = new Error(errorInfo.message);
        (enhancedError as any).code = errorInfo.code;
        throw enhancedError;
      }
    }),
  ),

  createEvent: publicProcedure.input(CreateEventSchema).handler(
    withConditionalAuth(async (input, context) => {
      try {
        const controller = new CalendarEventController(context.db);
        const eventData = {
          ...input,
          start: new Date(input.start),
          end: new Date(input.end),
        };
        return await controller.createEvent(eventData);
      } catch (error) {
        const errorInfo = parseError(error, 'create event');
        const enhancedError = new Error(errorInfo.message);
        (enhancedError as any).code = errorInfo.code;
        throw enhancedError;
      }
    }),
  ),

  updateEvent: publicProcedure.input(UpdateEventSchema).handler(async ({ input, context }) => {
    const controller = new CalendarEventController(context.db);

    // 檢查是否為群組事件
    const existingEvent = await controller.getEvent(input.id);
    const isGroupEvent = existingEvent?.groupId || false;

    if (!isGroupEvent) {
      // 個人事件需要驗證用戶權限
      if (!context.liffUser || context.liffUser.userId !== input.userId) {
        throw new Error('Unauthorized: User ID mismatch');
      }
    }

    try {
      const updateData = {
        ...input,
        start: input.start ? new Date(input.start) : undefined,
        end: input.end ? new Date(input.end) : undefined,
      };

      let result: typeof calendarEvents.$inferSelect | null;
      if (isGroupEvent && existingEvent) {
        // 群組事件使用群組更新方法
        result = await controller.updateGroupEvent(input.id, existingEvent.groupId!, updateData);
      } else {
        // 個人事件使用原有方法
        result = await controller.updateEvent(input.id, input.userId, updateData);
      }

      if (!result) {
        throw new Error('Event not found or unauthorized');
      }
      return result;
    } catch (error) {
      throw new Error('Failed to update event');
    }
  }),

  deleteEvent: publicProcedure.input(DeleteEventSchema).handler(async ({ input, context }) => {
    const controller = new CalendarEventController(context.db);

    // 檢查是否為群組事件
    const existingEvent = await controller.getEvent(input.id);
    const isGroupEvent = existingEvent?.groupId || false;

    if (!isGroupEvent) {
      // 個人事件需要驗證用戶權限
      if (!context.liffUser || context.liffUser.userId !== input.userId) {
        throw new Error('Unauthorized: User ID mismatch');
      }
    }

    try {
      let result: boolean;
      if (isGroupEvent && existingEvent) {
        // 群組事件使用群組刪除方法
        result = await controller.deleteGroupEvent(input.id, existingEvent.groupId!);
      } else {
        // 個人事件使用原有方法
        result = await controller.deleteEvent(input.id, input.userId);
      }

      if (!result) {
        throw new Error('Event not found or unauthorized');
      }
      return { success: true };
    } catch (error) {
      throw new Error('Failed to delete event');
    }
  }),

  getIncompleteExpiredEvents: publicProcedure
    .input(GetIncompleteExpiredEventsSchema)
    .handler(async ({ input, context }) => {
      // 驗證用戶權限
      if (!context.liffUser || context.liffUser.userId !== input.userId) {
        console.log('getIncompleteExpiredEvents', context.liffUser, input.userId);
        throw new Error('Unauthorized: User ID mismatch');
      }

      const controller = new CalendarEventController(context.db);

      try {
        const data = await controller.getIncompleteExpiredEvents(input.userId);
        return {
          data,
          count: data.length,
        };
      } catch (error) {
        throw new Error('Failed to fetch incomplete expired events');
      }
    }),

  // File Operations
  getFiles: publicProcedure.input(UserFilesQuerySchema).handler(async ({ input, context }) => {
    // 驗證用戶權限
    if (!context.liffUser || context.liffUser.userId !== input.userId) {
      throw new Error('Unauthorized: User ID mismatch');
    }

    const controller = new FileController(context.db, context.env.APP_STORAGE);

    try {
      return await controller.getUserFiles(
        input.userId,
        input.page,
        input.limit,
        input.sort,
        input.order,
        input.filter,
      );
    } catch {
      throw new Error('Failed to fetch files');
    }
  }),

  getFile: publicProcedure.input(GetFileSchema).handler(async ({ input, context }) => {
    const controller = new FileController(context.db, context.env.APP_STORAGE);

    try {
      const file = await controller.getFile(input.fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // 驗證用戶權限 - 檢查文件所有者
      if (!context.liffUser || context.liffUser.userId !== file.userId) {
        throw new Error('Unauthorized: File access denied');
      }

      return file;
    } catch {
      throw new Error('Failed to fetch file');
    }
  }),

  deleteFile: publicProcedure.input(DeleteFileSchema).handler(async ({ input, context }) => {
    // 驗證用戶權限
    if (!context.liffUser || context.liffUser.userId !== input.userId) {
      throw new Error('Unauthorized: User ID mismatch');
    }

    const controller = new FileController(context.db, context.env.APP_STORAGE);

    try {
      const result = await controller.deleteFile(input.fileId, input.userId);
      if (!result) {
        throw new Error('File not found or unauthorized');
      }
      return { success: true };
    } catch (error) {
      throw new Error('Failed to delete file');
    }
  }),

  updateFileName: publicProcedure
    .input(UpdateFileNameSchema)
    .handler(async ({ input, context }) => {
      // 驗證用戶權限
      if (!context.liffUser || context.liffUser.userId !== input.userId) {
        throw new Error('Unauthorized: User ID mismatch');
      }

      const controller = new FileController(context.db, context.env.APP_STORAGE);

      try {
        const result = await controller.updateFileName(input.fileId, input.userId, input.fileName);
        if (!result) {
          throw new Error('File not found or unauthorized');
        }
        return result;
      } catch {
        throw new Error('Failed to update file name');
      }
    }),

  // 上傳個人檔案
  uploadFile: publicProcedure.input(UploadFileSchema).handler(async ({ input, context }) => {
    // 驗證用戶權限
    if (!context.liffUser || context.liffUser.userId !== input.userId) {
      throw new Error('Unauthorized: User ID mismatch');
    }

    const controller = new FileController(context.db, context.env.APP_STORAGE);

    // 驗證 base64 格式
    if (!input.fileData || !input.fileData.includes(',')) {
      throw new Error('Invalid file data format');
    }

    // 將 base64 轉換為 ArrayBuffer
    const base64Data = input.fileData.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data');
    }

    let arrayBuffer: ArrayBuffer;
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } catch {
      throw new Error('Failed to decode base64 data');
    }

    // 驗證檔案大小
    if (arrayBuffer.byteLength !== input.fileSize) {
      console.warn(`File size mismatch: expected ${input.fileSize}, got ${arrayBuffer.byteLength}`);
    }

    const fileId = crypto.randomUUID();
    const fileData = {
      fileId,
      userId: input.userId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.fileType,
    };

    const newFile = await controller.createFile(fileData, arrayBuffer);
    return newFile;
  }),

  // Group Files Operations
  getGroupFiles: publicProcedure
    .input(GroupFilesQuerySchema)
    .handler(async ({ input, context }) => {
      const controller = new FileController(context.db, context.env.APP_STORAGE);

      try {
        return await controller.getGroupFiles(
          input.groupId,
          input.page,
          input.limit,
          input.sort,
          input.order,
          input.filter,
        );
      } catch (error) {
        throw new Error('Failed to fetch group files');
      }
    }),

  updateGroupFileName: publicProcedure
    .input(UpdateGroupFileNameSchema)
    .handler(async ({ input, context }) => {
      const controller = new FileController(context.db, context.env.APP_STORAGE);

      try {
        const result = await controller.updateGroupFileName(
          input.fileId,
          input.groupId,
          input.fileName,
        );
        if (!result) {
          throw new Error('File not found or unauthorized');
        }
        return result;
      } catch (error) {
        throw new Error('Failed to update group file name');
      }
    }),

  deleteGroupFile: publicProcedure
    .input(DeleteGroupFileSchema)
    .handler(async ({ input, context }) => {
      const controller = new FileController(context.db, context.env.APP_STORAGE);

      try {
        const result = await controller.deleteGroupFile(input.fileId, input.groupId);
        if (!result) {
          throw new Error('File not found or unauthorized');
        }
        return { success: true };
      } catch (error) {
        throw new Error('Failed to delete group file');
      }
    }),

  // 上傳群組檔案
  uploadGroupFile: publicProcedure
    .input(UploadGroupFileSchema)
    .handler(async ({ input, context }) => {
      // 驗證用戶已登入
      if (!context.liffUser) {
        throw new Error('Authentication required');
      }

      const controller = new FileController(context.db, context.env.APP_STORAGE);

      // 驗證 base64 格式
      if (!input.fileData || !input.fileData.includes(',')) {
        throw new Error('Invalid file data format');
      }

      // 將 base64 轉換為 ArrayBuffer
      const base64Data = input.fileData.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid base64 data');
      }

      let arrayBuffer: ArrayBuffer;
      try {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } catch (error) {
        throw new Error('Failed to decode base64 data');
      }

      // 驗證檔案大小
      if (arrayBuffer.byteLength !== input.fileSize) {
        console.warn(
          `File size mismatch: expected ${input.fileSize}, got ${arrayBuffer.byteLength}`,
        );
      }

      const fileId = crypto.randomUUID();
      const fileData = {
        fileId,
        userId: input.userId,
        groupId: input.groupId,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.fileType,
      };

      const newFile = await controller.createFile(fileData, arrayBuffer);
      return newFile;
    }),

  // Group Events Operations
  getGroupEvents: publicProcedure
    .input(GroupEventsQuerySchema)
    .handler(async ({ input, context }) => {
      const controller = new CalendarEventController(context.db);

      try {
        return await controller.getGroupEvents(
          input.groupId,
          input.page,
          input.limit,
          'start',
          'asc',
          undefined,
          input.startTime,
          input.endTime,
        );
      } catch (error) {
        throw new Error('Failed to fetch group events');
      }
    }),

  getGroupIncompleteExpiredEvents: publicProcedure
    .input(GetGroupIncompleteExpiredEventsSchema)
    .handler(async ({ input, context }) => {
      const controller = new CalendarEventController(context.db);

      try {
        const data = await controller.getGroupIncompleteExpiredEvents(input.groupId);
        return {
          data,
          count: data.length,
        };
      } catch (error) {
        throw new Error('Failed to fetch group incomplete expired events');
      }
    }),
} as const;
export type AppRouter = typeof appRouter;
