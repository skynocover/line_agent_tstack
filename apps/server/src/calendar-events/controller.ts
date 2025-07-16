import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db';
import type { NewCalendarEvent } from '../db/schema';
import { calendarEvents } from '../db/schema';

export class CalendarEventController {
  constructor(private db: Database) {}

  async getUserEvents(
    userId: string,
    page: number,
    limit: number,
    sort?: string,
    order?: 'asc' | 'desc',
    filter?: string,
    startTime?: string,
    endTime?: string,
  ) {
    const offset = (page - 1) * limit;

    const query = this.db.query.calendarEvents.findMany({
      where: (events, { eq, and, like, gte, lte }) => {
        const conditions = [
          eq(events.userId, userId),
          isNull(events.groupId), // 只顯示個人事件 (沒有群組ID)
        ];

        if (filter) {
          conditions.push(like(events.title, `%${filter}%`));
        }

        if (startTime) {
          conditions.push(gte(events.start, new Date(startTime)));
        }

        if (endTime) {
          conditions.push(lte(events.end, new Date(endTime)));
        }

        return and(...conditions);
      },
      limit,
      offset,
      orderBy: (events, { asc, desc }) => {
        if (sort === 'title') {
          return order === 'desc' ? [desc(events.title)] : [asc(events.title)];
        }
        if (sort === 'start') {
          return order === 'desc' ? [desc(events.start)] : [asc(events.start)];
        }
        if (sort === 'end') {
          return order === 'desc' ? [desc(events.end)] : [asc(events.end)];
        }
        return [desc(events.createdAt)];
      },
    });

    const userEvents = await query;

    const totalCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), isNull(calendarEvents.groupId)))
      .then((result) => result[0].count);

    return {
      data: userEvents,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getEvent(eventId: number): Promise<typeof calendarEvents.$inferSelect | undefined> {
    return await this.db.query.calendarEvents.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
    });
  }

  async createEvent(eventData: NewCalendarEvent): Promise<typeof calendarEvents.$inferSelect> {
    const [event] = await this.db
      .insert(calendarEvents)
      .values({
        ...eventData,
        start: new Date(eventData.start || ''),
        end: new Date(eventData.end || ''),
      })
      .returning();

    return event;
  }

  async updateEvent(
    eventId: number,
    userId: string,
    eventData: Partial<NewCalendarEvent>,
  ): Promise<typeof calendarEvents.$inferSelect | null> {
    const event = await this.getEvent(eventId);
    if (!event || event.userId !== userId || event.groupId) {
      return null; // 不允許更新群組事件
    }

    const [updatedEvent] = await this.db
      .update(calendarEvents)
      .set({
        ...eventData,
        start: new Date(eventData.start || ''),
        end: new Date(eventData.end || ''),
        createdAt: undefined,
      })
      .where(eq(calendarEvents.id, eventId))
      .returning();

    return updatedEvent;
  }

  async deleteEvent(eventId: number, userId: string): Promise<boolean> {
    const event = await this.getEvent(eventId);
    if (!event || event.userId !== userId || event.groupId) {
      return false; // 不允許刪除群組事件
    }

    await this.db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));

    return true;
  }

  async getIncompleteExpiredEvents(
    userId: string,
  ): Promise<(typeof calendarEvents.$inferSelect)[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 設定為今天凌晨

    return await this.db.query.calendarEvents.findMany({
      where: (events, { eq, and, lt }) =>
        and(
          eq(events.userId, userId),
          eq(events.completed, false),
          isNull(events.groupId), // 只處理個人事件
          lt(events.end, today),
        ),
      orderBy: (events, { asc }) => [asc(events.end)],
    });
  }

  async getGroupIncompleteExpiredEvents(
    groupId: string,
  ): Promise<(typeof calendarEvents.$inferSelect)[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 設定為今天凌晨

    return await this.db.query.calendarEvents.findMany({
      where: (events, { eq, and, lt }) =>
        and(eq(events.groupId, groupId), eq(events.completed, false), lt(events.end, today)),
      orderBy: (events, { asc }) => [asc(events.end)],
    });
  }

  async getEventsByUserId(userId: string): Promise<(typeof calendarEvents.$inferSelect)[]> {
    return await this.db.query.calendarEvents.findMany({
      where: (events, { eq, and }) => and(eq(events.userId, userId), isNull(events.groupId)), // 只取得個人事件
      orderBy: (events, { asc }) => [asc(events.start)],
    });
  }

  // 群組事件相關方法
  async getGroupEvents(
    groupId: string,
    page: number,
    limit: number,
    sort?: string,
    order?: 'asc' | 'desc',
    filter?: string,
    startTime?: string,
    endTime?: string,
  ) {
    const offset = (page - 1) * limit;

    const query = this.db.query.calendarEvents.findMany({
      where: (events, { eq, and, like, gte, lte }) => {
        const conditions = [
          eq(events.groupId, groupId), // 只顯示該群組的事件
        ];

        if (filter) {
          conditions.push(like(events.title, `%${filter}%`));
        }

        if (startTime) {
          conditions.push(gte(events.start, new Date(startTime)));
        }

        if (endTime) {
          conditions.push(lte(events.end, new Date(endTime)));
        }

        return and(...conditions);
      },
      limit,
      offset,
      orderBy: (events, { asc, desc }) => {
        if (sort === 'title') {
          return order === 'desc' ? [desc(events.title)] : [asc(events.title)];
        }
        if (sort === 'start') {
          return order === 'desc' ? [desc(events.start)] : [asc(events.start)];
        }
        if (sort === 'end') {
          return order === 'desc' ? [desc(events.end)] : [asc(events.end)];
        }
        return [desc(events.createdAt)];
      },
    });

    const groupEvents = await query;

    const totalCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(calendarEvents)
      .where(eq(calendarEvents.groupId, groupId))
      .then((result) => result[0].count);

    return {
      data: groupEvents,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getGroupEventsByGroupId(groupId: string): Promise<(typeof calendarEvents.$inferSelect)[]> {
    return await this.db.query.calendarEvents.findMany({
      where: (events, { eq }) => eq(events.groupId, groupId),
      orderBy: (events, { asc }) => [asc(events.start)],
    });
  }

  async updateGroupEvent(
    eventId: number,
    groupId: string,
    eventData: Partial<NewCalendarEvent>,
  ): Promise<typeof calendarEvents.$inferSelect | null> {
    const event = await this.getEvent(eventId);
    if (!event || event.groupId !== groupId || !event.groupId) {
      return null; // 只允許更新對應群組的群組事件
    }

    const [updatedEvent] = await this.db
      .update(calendarEvents)
      .set({
        ...eventData,
        start: new Date(eventData.start || ''),
        end: new Date(eventData.end || ''),
        createdAt: undefined,
      })
      .where(eq(calendarEvents.id, eventId))
      .returning();

    return updatedEvent;
  }

  async deleteGroupEvent(eventId: number, groupId: string): Promise<boolean> {
    const event = await this.getEvent(eventId);
    if (!event || event.groupId !== groupId || !event.groupId) {
      return false; // 只允許刪除對應群組的群組事件
    }

    await this.db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));

    return true;
  }
}
