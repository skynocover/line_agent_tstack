import { addDays } from 'date-fns';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { EventDialog } from '@/components/event-calendar/event-dialog';
import { EventItem } from '@/components/event-calendar/event-item';
import type { CalendarEvent } from '@/components/event-calendar/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpiredTodoListProps {
  expiredTodos: CalendarEvent[];
  isLoading: boolean;
  onToggleComplete: (todo: CalendarEvent) => Promise<void>;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: number) => void;
}

const itemsPerPage = 5;

export function ExpiredTodoList({
  expiredTodos,
  isLoading,
  onToggleComplete,
  onEventUpdate,
  onEventDelete,
}: ExpiredTodoListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Pagination logic for expired todos
  const paginatedExpiredTodos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return expiredTodos.slice(startIndex, endIndex);
  }, [expiredTodos, currentPage]);

  const totalPages = Math.ceil(expiredTodos.length / itemsPerPage);

  const handlePostpone = useCallback(
    (todo: CalendarEvent, days: number) => {
      const updatedTodo = {
        ...todo,
        start: addDays(new Date(todo.start), days),
        end: addDays(new Date(todo.end), days),
      };
      onEventUpdate(updatedTodo);
    },
    [onEventUpdate],
  );

  const handleEventEdit = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  }, []);

  const handleEventSave = useCallback(
    (event: CalendarEvent) => {
      onEventUpdate(event);
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
    },
    [onEventUpdate],
  );

  const handleEventDelete = useCallback(
    (eventId: number) => {
      onEventDelete(eventId);
      setIsEventDialogOpen(false);
      setSelectedEvent(null);
    },
    [onEventDelete],
  );

  if (expiredTodos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 font-semibold text-destructive text-lg transition-opacity hover:opacity-80"
        >
          {isCollapsed ? <ChevronRightIcon size={16} /> : <ChevronDownIcon size={16} />}
          過期未完成項目 ({expiredTodos.length})
        </button>
      </div>

      {!isCollapsed &&
        (isLoading ? (
          <div className="py-4 text-center text-muted-foreground">載入中...</div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedExpiredTodos.map((todo: CalendarEvent) => (
                <div
                  key={todo.id}
                  className="cursor-pointer rounded-lg border p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <EventItem
                        event={todo}
                        view="agenda"
                        onToggleComplete={() => onToggleComplete(todo)}
                        showDate={true}
                        onClick={() => handleEventEdit(todo)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:flex-row">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostpone(todo, 1);
                        }}
                        className="h-auto flex-1 px-2 py-1 text-xs sm:flex-none"
                      >
                        延後1天
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostpone(todo, 3);
                        }}
                        className="h-auto flex-1 px-2 py-1 text-xs sm:flex-none"
                      >
                        延後3天
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostpone(todo, 7);
                        }}
                        className="h-auto flex-1 px-2 py-1 text-xs sm:flex-none"
                      >
                        延後1週
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon size={16} />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'h-8 w-8 p-0',
                        page === currentPage && 'bg-primary text-primary-foreground',
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRightIcon size={16} />
                </Button>
              </div>
            )}
          </>
        ))}

      {/* Event Dialog - keep this outside of collapse since it's a modal */}
      <EventDialog
        event={selectedEvent}
        isOpen={isEventDialogOpen}
        onClose={() => {
          setIsEventDialogOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />
    </div>
  );
}
