import { RiCalendarEventLine } from '@remixicon/react';
import { addDays, format, isToday } from 'date-fns';
import { useMemo } from 'react';

import { AgendaDaysToShow, EventItem, getAgendaEventsForDay } from '@/components/event-calendar';
import type { CalendarEvent } from '@/components/event-calendar/types';

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onToggleComplete?: (eventId: number) => void;
}

export function AgendaView({
  currentDate,
  events,
  onEventSelect,
  onToggleComplete,
}: AgendaViewProps) {
  // Show events for the next days based on constant
  const days = useMemo(() => {
    console.log('Agenda view updating with date:', currentDate.toISOString());
    return Array.from({ length: AgendaDaysToShow }, (_, i) => addDays(new Date(currentDate), i));
  }, [currentDate]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Agenda view event clicked:', event);
    onEventSelect(event);
  };

  // Check if there are any days with events
  const hasEvents = days.some((day) => getAgendaEventsForDay(events, day).length > 0);

  return (
    <div className="border-border/70 border-t ps-4">
      {!hasEvents ? (
        <div className="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
          <RiCalendarEventLine size={32} className="mb-2 text-muted-foreground/50" />
          <h3 className="font-medium text-lg">No events found</h3>
          <p className="text-muted-foreground">
            There are no events scheduled for this time period.
          </p>
        </div>
      ) : (
        days.map((day) => {
          const dayEvents = getAgendaEventsForDay(events, day);

          if (dayEvents.length === 0) return null;

          return (
            <div key={day.toString()} className="relative my-12 border-border/70 border-t">
              <span
                className="-top-3 absolute left-0 flex h-6 items-center bg-background pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs"
                data-today={isToday(day) || undefined}
              >
                {format(day, 'd MMM, EEEE')}
              </span>
              <div className="mt-6 space-y-2">
                {dayEvents.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    view="agenda"
                    onClick={(e) => handleEventClick(event, e)}
                    onToggleComplete={onToggleComplete}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
