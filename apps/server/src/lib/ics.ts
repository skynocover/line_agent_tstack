import ical, { ICalCalendarMethod, ICalEventClass, ICalEventTransparency } from 'ical-generator';
import type { calendarEvents } from '../db/schema';

export const generateICS = (
  events: (typeof calendarEvents.$inferSelect)[],
  entityId: string,
  displayName?: string,
): string => {
  const calendarName = displayName || entityId;

  // 設置日曆，使用更明確的設定以確保相容性
  const calendar = ical({
    name: `Calendar of ${calendarName}`,
    description: 'Daino Calendar Subscription',
    prodId: {
      company: 'Daino',
      product: 'Calendar',
      language: 'EN',
    },
    method: ICalCalendarMethod.PUBLISH,
    timezone: 'Asia/Taipei',
    x: [{ key: 'X-WR-TIMEZONE', value: 'Asia/Taipei' }],
  });

  for (const event of events) {
    // 數據庫中存儲的是 UTC 時間戳
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
      timezone: 'Asia/Taipei',
      transparency: ICalEventTransparency.TRANSPARENT,
      class: ICalEventClass.PUBLIC,
      floating: false, // 時間是絕對的
    });
  }

  return calendar.toString();
};
