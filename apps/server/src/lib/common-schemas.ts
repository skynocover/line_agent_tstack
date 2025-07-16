import { z } from 'zod';

// 通用分頁參數
export const PaginationSchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(10),
});

// 通用排序參數
export const SortSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// 檔案排序參數
export const FileSortSchema = z.object({
  sort: z.enum(['name', 'size', 'date', 'type']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// 時間範圍參數
export const TimeRangeSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

// 實體識別參數
export const EntityIdentifierSchema = z.object({
  entityId: z.string(), // userId 或 groupId
  entityType: z.enum(['user', 'group']),
});

// 事件基礎 Schema
export const BaseEventSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean().default(false),
  color: z.string().optional(),
  label: z.string().optional(),
  location: z.string().optional(),
  completed: z.boolean().default(false),
  messageId: z.string().optional(),
});

// 檔案基礎 Schema
export const BaseFileSchema = z.object({
  fileId: z.string(),
  fileName: z.string(),
});

// 用戶檔案查詢 Schema
export const UserFilesQuerySchema = z
  .object({
    userId: z.string(),
    filter: z.string().optional(),
  })
  .merge(PaginationSchema)
  .merge(FileSortSchema);

// 群組檔案查詢 Schema
export const GroupFilesQuerySchema = z
  .object({
    groupId: z.string(),
    filter: z.string().optional(),
  })
  .merge(PaginationSchema)
  .merge(FileSortSchema);

// 用戶事件查詢 Schema
export const UserEventsQuerySchema = z
  .object({
    userId: z.string(),
  })
  .merge(PaginationSchema)
  .merge(TimeRangeSchema);

// 群組事件查詢 Schema
export const GroupEventsQuerySchema = z
  .object({
    groupId: z.string(),
  })
  .merge(PaginationSchema)
  .merge(TimeRangeSchema);

// 通用檔案操作 Schema
export const FileOperationSchema = z.object({
  fileId: z.string(),
  fileName: z.string().optional(),
});

// 用戶檔案操作 Schema
export const UserFileOperationSchema = FileOperationSchema.extend({
  userId: z.string(),
});

// 群組檔案操作 Schema
export const GroupFileOperationSchema = FileOperationSchema.extend({
  groupId: z.string(),
});
