import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { messages, type NewMessage } from '../db/schema';

export class MessageController {
  constructor(private db: Database) {}

  async createMessage(messageData: NewMessage): Promise<number> {
    const result = await this.db
      .insert(messages)
      .values(messageData)
      .returning({ id: messages.id });
    return result[0].id;
  }

  async getMessageById(id: number) {
    const result = await this.db.select().from(messages).where(eq(messages.id, id));
    return result[0] || null;
  }

  async getMessagesByUserId(userId: string) {
    return await this.db.select().from(messages).where(eq(messages.userId, userId));
  }

  async getMessagesByEventId(eventId: number) {
    return await this.db.select().from(messages).where(eq(messages.eventId, eventId));
  }

  async updateMessageEventId(messageId: number, eventId: number) {
    await this.db.update(messages).set({ eventId }).where(eq(messages.id, messageId));
  }

  // 根據 messageId 查詢訊息
  async getMessageByMessageId(messageId: string) {
    const result = await this.db.select().from(messages).where(eq(messages.messageId, messageId));
    return result[0] || null;
  }

  // 查詢被引用的訊息內容
  async getQuotedMessage(quotedMessageId: string) {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.messageId, quotedMessageId));
    return result[0] || null;
  }

  // 取得群組中的近期訊息（用於上下文）
  async getRecentGroupMessages(groupId: string, limit = 10) {
    return await this.db
      .select()
      .from(messages)
      .where(eq(messages.groupId, groupId))
      .orderBy(messages.createdAt)
      .limit(limit);
  }

  // 取得使用者的近期訊息（用於上下文）
  async getRecentUserMessages(userId: string, limit = 10) {
    return await this.db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(messages.createdAt)
      .limit(limit);
  }
}
