import { createFileRoute, useParams } from '@tanstack/react-router';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useCallback } from 'react';
import { CalendarSubscription } from '@/components/calendar-subscription';
import { EventCalendar } from '@/components/event-calendar';
import { useCalendarContext } from '@/components/event-calendar/calendar-context';
import type { CalendarEvent } from '@/components/event-calendar/types';
import { ExpiredTodoList } from '@/features/todo/expiredtodo';
import { useTodos } from '@/features/todo/hooks';

export const Route = createFileRoute('/group/$groupId/todo')({
  component: RouteComponent,
});

function RouteComponent() {
  const { groupId } = useParams({ from: '/group/$groupId/todo' });
  const { currentDate, view } = useCalendarContext();

  const getTimeRange = useCallback(() => {
    let startTime: Date;
    let endTime: Date;

    switch (view) {
      case 'month':
        startTime = startOfMonth(currentDate);
        endTime = endOfMonth(currentDate);
        break;
      case 'week':
        startTime = startOfWeek(currentDate, { weekStartsOn: 0 });
        endTime = endOfWeek(currentDate, { weekStartsOn: 0 });
        break;
      case 'day':
        startTime = startOfDay(currentDate);
        endTime = endOfDay(currentDate);
        break;
      case 'agenda':
        startTime = startOfDay(currentDate);
        endTime = addDays(startTime, 30); // Show 30 days in agenda view
        break;
      default:
        startTime = startOfMonth(currentDate);
        endTime = endOfMonth(currentDate);
    }

    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }, [currentDate, view]);

  const {
    todos,
    isLoading,
    handleEventAdd,
    handleEventUpdate,
    handleEventDelete,
    incompleteExpiredTodos,
    isLoadingIncompleteExpiredTodos,
  } = useTodos({
    groupId,
    getTimeRange,
  });

  const handleToggleComplete = useCallback(
    async (todo: CalendarEvent) => {
      await handleEventUpdate({ ...todo, completed: true });
    },
    [handleEventUpdate],
  );

  return (
    <div className="container mx-auto space-y-6 py-4">
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        {/* Group Calendar Subscription Section */}
        <CalendarSubscription groupId={groupId} variant="compact" />

        {/* Expired Incomplete Todos Section */}
        <ExpiredTodoList
          expiredTodos={incompleteExpiredTodos}
          isLoading={isLoadingIncompleteExpiredTodos}
          onToggleComplete={handleToggleComplete}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
        />

        {/* Calendar Section */}
        <EventCalendar
          events={todos}
          onEventAdd={handleEventAdd}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
