export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarEvent {
  id?: number;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean | null;
  color: string | null;
  label: string | null;
  location: string | null;
  completed: boolean | null;
  createdAt: Date | null;
}

export type EventColor = 'blue' | 'orange' | 'violet' | 'rose' | 'emerald';
