import ical, { type ICalCalendarMethod } from 'ical-generator';
import type { calendarEvents } from '../db/schema';

export const generateICS = (
  events: (typeof calendarEvents.$inferSelect)[],
  entityId: string,
  displayName?: string,
): string => {
  const calendarName = displayName || entityId;

  // 不設置日曆級別的時區，直接使用 UTC 時間
  const calendar = ical({
    name: `Calendar of ${calendarName}`,
    description: 'Daino Calendar Subscription',
    prodId: {
      company: 'Daino',
      product: 'Calendar',
    },
    method: 'PUBLISH' as ICalCalendarMethod,
  });

  for (const event of events) {
    // 數據庫中存儲的是 UTC 時間戳，直接使用 Date 對象
    // 並在事件級別設置時區
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    calendar.createEvent({
      id: String(event.id),
      start: startDate,
      end: endDate,
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      allDay: event.allDay || false,
      created: event.createdAt ? new Date(event.createdAt) : new Date(),
      lastModified: event.createdAt ? new Date(event.createdAt) : new Date(),
      timezone: 'Asia/Taipei', // 在事件級別設置時區
    });
  }

  return calendar.toString();
};
