import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { differenceInMinutes, format, getMinutes } from 'date-fns';
import { useMemo } from 'react';

import {
  type CalendarEvent,
  getBorderRadiusClasses,
  getEventColorClasses,
} from '@/components/event-calendar';
import { cn } from '@/lib/utils';

// Using date-fns format with custom formatting:
// 'h' - hours (1-12)
// 'a' - am/pm
// ':mm' - minutes with leading zero (only if the token 'mm' is present)
const formatTimeWithOptionalMinutes = (date: Date) => {
  return format(date, getMinutes(date) === 0 ? 'ha' : 'h:mma').toLowerCase();
};

// Format date with time, optionally showing date
const formatDateTime = (date: Date, showDate = false) => {
  if (showDate) {
    const dateStr = format(date, 'M/d');
    const timeStr = formatTimeWithOptionalMinutes(date);
    return `${dateStr} ${timeStr}`;
  }
  return formatTimeWithOptionalMinutes(date);
};

// Format date range for all day events
const formatAllDayDateRange = (startDate: Date, endDate: Date) => {
  const start = format(startDate, 'M/d');
  const end = format(endDate, 'M/d');

  if (start === end) {
    return `All day (${start})`;
  }
  return `All day (${start} - ${end})`;
};

interface EventWrapperProps {
  event: CalendarEvent;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
  dndListeners?: any;
  dndAttributes?: any;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

// Shared wrapper component for event styling
function EventWrapper({
  event,
  isFirstDay = true,
  isLastDay = true,
  isDragging,
  onClick,
  className,
  children,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventWrapperProps) {
  return (
    <button
      className={cn(
        'flex h-full w-full select-none overflow-hidden px-1 text-left font-medium outline-none backdrop-blur-md transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-dragging:cursor-grabbing data-past-event:line-through data-dragging:shadow-lg sm:px-2',
        getEventColorClasses(event.color || 'blue'),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className,
      )}
      data-dragging={isDragging || undefined}
      data-past-event={event.completed || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  );
}

interface EventItemProps {
  event: CalendarEvent;
  view: 'month' | 'week' | 'day' | 'agenda';
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  showTime?: boolean;
  showDate?: boolean;
  currentTime?: Date; // For updating time during drag
  isFirstDay?: boolean;
  isLastDay?: boolean;
  children?: React.ReactNode;
  className?: string;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onToggleComplete?: (eventId: number) => void;
}

export function EventItem({
  event,
  view,
  isDragging,
  onClick,
  showTime,
  showDate = false,
  currentTime,
  isFirstDay = true,
  isLastDay = true,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
  onToggleComplete,
}: EventItemProps) {
  const eventColor = event.color;

  // Use the provided currentTime (for dragging) or the event's actual time
  const displayStart = useMemo(() => {
    return currentTime || new Date(event.start);
  }, [currentTime, event.start]);

  const displayEnd = useMemo(() => {
    return currentTime
      ? new Date(
          new Date(currentTime).getTime() +
            (new Date(event.end).getTime() - new Date(event.start).getTime()),
        )
      : new Date(event.end);
  }, [currentTime, event.start, event.end]);

  // Calculate event duration in minutes
  const durationMinutes = useMemo(() => {
    return differenceInMinutes(displayEnd, displayStart);
  }, [displayStart, displayEnd]);

  const getEventTime = () => {
    if (event.allDay) return formatAllDayDateRange(displayStart, displayEnd);

    // For short events (less than 45 minutes), only show start time
    if (durationMinutes < 45) {
      return formatDateTime(displayStart, showDate);
    }

    // For longer events, show both start and end time
    return `${formatDateTime(displayStart, showDate)} - ${formatDateTime(displayEnd, showDate)}`;
  };

  if (view === 'month') {
    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          'mt-[var(--event-gap)] h-[var(--event-height)] items-center text-[10px] sm:text-[13px]',
          className,
        )}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {children || (
          <span className="truncate">
            {event.allDay ? (
              <>
                <span className="truncate font-normal uppercase opacity-70 sm:text-xs">
                  {formatAllDayDateRange(displayStart, displayEnd)}{' '}
                </span>
                {event.title}
              </>
            ) : (
              <>
                <span className="truncate font-normal uppercase opacity-70 sm:text-xs">
                  {formatDateTime(displayStart, showDate)}{' '}
                </span>
                {event.title}
              </>
            )}
          </span>
        )}
      </EventWrapper>
    );
  }

  if (view === 'week' || view === 'day') {
    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          'py-1',
          durationMinutes < 45 ? 'items-center' : 'flex-col',
          view === 'week' ? 'text-[10px] sm:text-[13px]' : 'text-[13px]',
          className,
        )}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {durationMinutes < 45 ? (
          <div className="truncate">
            {event.title}{' '}
            {showTime && (
              <span className="opacity-70">{formatDateTime(displayStart, showDate)}</span>
            )}
          </div>
        ) : (
          <>
            <div className="truncate font-medium">{event.title}</div>
            {showTime && (
              <div className="truncate font-normal uppercase opacity-70 sm:text-xs">
                {getEventTime()}
              </div>
            )}
          </>
        )}
      </EventWrapper>
    );
  }

  // Agenda view - kept separate since it's significantly different
  return (
    <button
      className={cn(
        'flex w-full flex-col gap-1 rounded p-2 text-left outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-past-event:line-through data-past-event:opacity-90',
        getEventColorClasses(eventColor || 'blue'),
        className,
      )}
      data-past-event={event.completed || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="flex items-center gap-2">
        {onToggleComplete && (
          <input
            type="checkbox"
            checked={event.completed || false}
            onChange={(e) => {
              e.stopPropagation();
              if (event.id) {
                onToggleComplete(event.id);
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="font-medium text-sm">{event.title}</div>
        <div className="text-xs opacity-70">
          {event.allDay ? (
            <span>{formatAllDayDateRange(displayStart, displayEnd)}</span>
          ) : (
            <span className="uppercase">
              {formatDateTime(displayStart, showDate)} - {formatDateTime(displayEnd, showDate)}
            </span>
          )}
        </div>
      </div>

      {event.description && !event.completed && (
        <div className="my-1 text-xs opacity-90">{event.description}</div>
      )}
    </button>
  );
}
