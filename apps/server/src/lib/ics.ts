import ical, { type ICalCalendarMethod } from 'ical-generator';
import type { calendarEvents } from '../db/schema';

export const generateICS = (
  events: (typeof calendarEvents.$inferSelect)[],
  entityId: string,
  displayName?: string,
): string => {
  const calendarName = displayName || entityId;

  // 設置日曆級別的時區
  const calendar = ical({
    name: `Calendar of ${calendarName}`,
    description: 'Daino Calendar Subscription',
    prodId: {
      company: 'Daino',
      product: 'Calendar',
    },
    method: 'PUBLISH' as ICalCalendarMethod,
    timezone: 'Asia/Taipei', // 設置默認時區
  });

  for (const event of events) {
    // 數據庫中存儲的是 UTC 時間戳
    // ical-generator 的 timezone 參數不會自動轉換時間，只是標識時區
    // 所以我們需要手動將 UTC 時間轉換為台北時間
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    // 手動將 UTC 時間轉換為台北時間 (UTC+8)
    const taipeiOffset = 8 * 60 * 60 * 1000; // 8小時的毫秒數
    const taipeiStartDate = new Date(startDate.getTime() + taipeiOffset);
    const taipeiEndDate = new Date(endDate.getTime() + taipeiOffset);

    calendar.createEvent({
      id: String(event.id),
      start: taipeiStartDate,
      end: taipeiEndDate,
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      allDay: event.allDay || false,
      created: event.createdAt ? new Date(event.createdAt) : new Date(),
      lastModified: event.createdAt ? new Date(event.createdAt) : new Date(),
    });
  }

  return calendar.toString();
};
