// db/schema.ts
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 定義檔案表
export const files = sqliteTable(
  'files',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fileId: text('file_id').notNull().unique(),
    userId: text('user_id').notNull(),
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    groupId: text('group_id'), // 群組 ID (如果是群組檔案)
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [index('user_idx').on(table.userId), index('group_files_idx').on(table.groupId)],
);

// 定義使用者表
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// 定義訊息表
export const messages = sqliteTable(
  'messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    messageId: text('message_id').notNull().unique(),
    userId: text('user_id').notNull(),
    content: text('content').notNull(),
    messageType: text('message_type').notNull().default('text'), // text, image, video, audio, file
    quotedMessageId: text('quoted_message_id'), // 被引用的訊息 ID
    groupId: text('group_id'), // 群組 ID (如果是群組訊息)
    eventId: integer('event_id'), // 關聯到 calendar_events 表的 id
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [
    index('user_messages_idx').on(table.userId),
    index('event_message_idx').on(table.eventId),
    index('quoted_message_idx').on(table.quotedMessageId),
    index('group_messages_idx').on(table.groupId),
  ],
);

// 定義行事曆事件表
export const calendarEvents = sqliteTable(
  'calendar_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    start: integer('start', { mode: 'timestamp' }).notNull(),
    end: integer('end', { mode: 'timestamp' }).notNull(),
    allDay: integer('all_day', { mode: 'boolean' }).default(false),
    color: text('color'),
    label: text('label'),
    location: text('location'),
    completed: integer('completed', { mode: 'boolean' }).default(false),
    userId: text('user_id').notNull(),
    messageId: text('message_id').unique(),
    groupId: text('group_id'), // 群組 ID (如果是群組事件)
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => [
    index('user_events_idx').on(table.userId),
    index('group_events_idx').on(table.groupId),
  ],
);

export type Newfile = typeof files.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;
