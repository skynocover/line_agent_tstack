import ical, { type ICalCalendarMethod } from 'ical-generator';
import type { calendarEvents } from '../db/schema';

export const generateICS = (
  events: (typeof calendarEvents.$inferSelect)[],
  entityId: string,
  displayName?: string,
): string => {
  const calendarName = displayName || entityId;
  const calendar = ical({
    name: `Calendar of ${calendarName}`,
    description: 'Daino Calendar Subscription',
    prodId: {
      company: 'Daino',
      product: 'Calendar',
    },
    method: 'PUBLISH' as ICalCalendarMethod,
    timezone: 'Asia/Taipei',
  });

  for (const event of events) {
    calendar.createEvent({
      id: String(event.id),
      start: new Date(event.start),
      end: new Date(event.end),
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      allDay: event.allDay || false,
      created: event.createdAt ? new Date(event.createdAt) : new Date(),
      lastModified: event.createdAt ? new Date(event.createdAt) : new Date(),
      timezone: 'Asia/Taipei',
    });
  }

  return calendar.toString();
};
