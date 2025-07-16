import type { EventColor } from './types';

export const EventHeight = 24;

// Vertical gap between events in pixels - controls spacing in month view
export const EventGap = 4;

// Height of hour cells in week and day views - controls the scale of time display
export const WeekCellsHeight = 72;

// Number of days to show in the agenda view
export const AgendaDaysToShow = 30;

// Start and end hours for the week and day views
export const StartHour = 7; // Start at 7 AM
export const EndHour = 20; // End at 8 PM

// Default start and end times
export const DefaultStartHour = 10; // 10 AM
export const DefaultEndHour = 11; // 11 AM

export const etiquettes = [
  {
    id: 'my-events',
    name: 'My Events',
    color: 'emerald' as EventColor,
    isActive: true,
  },
  {
    id: 'marketing-team',
    name: 'Marketing Team',
    color: 'orange' as EventColor,
    isActive: true,
  },
  {
    id: 'interviews',
    name: 'Interviews',
    color: 'violet' as EventColor,
    isActive: true,
  },
  {
    id: 'events-planning',
    name: 'Events Planning',
    color: 'blue' as EventColor,
    isActive: true,
  },
  {
    id: 'holidays',
    name: 'Holidays',
    color: 'rose' as EventColor,
    isActive: true,
  },
];
