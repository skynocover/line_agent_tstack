import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { CalendarEvent } from '@/components/event-calendar/types';
import { client } from '@/utils/orpc';

interface UseTodosOptions {
  userId?: string;
  groupId?: string;
  getTimeRange: () => { startTime: string; endTime: string };
}

/**
 * 統一的待辦事項Hook - 使用 ORPC 客戶端配合手動 React Query
 */
export function useTodos({ userId, groupId, getTimeRange }: UseTodosOptions) {
  const queryClient = useQueryClient();
  const isGroupMode = !!groupId;
  const entityId = groupId || userId!;

  // 查詢鍵
  const eventsQueryKey = [isGroupMode ? 'groupEvents' : 'events', entityId, getTimeRange()];
  const expiredEventsQueryKey = ['expiredEvents', entityId];

  // 查詢事件
  const eventsQuery = useQuery({
    queryKey: eventsQueryKey,
    queryFn: async () => {
      const timeRange = getTimeRange();
      return isGroupMode
        ? await client.getGroupEvents({
            groupId: entityId,
            ...timeRange,
          })
        : await client.getEvents({
            userId: entityId,
            ...timeRange,
          });
    },
  });

  // 查詢過期未完成事件
  const expiredEventsQuery = useQuery({
    queryKey: expiredEventsQueryKey,
    queryFn: async () => {
      return isGroupMode
        ? await client.getGroupIncompleteExpiredEvents({
            groupId: entityId,
          })
        : await client.getIncompleteExpiredEvents({
            userId: entityId,
          });
    },
  });

  // 創建事件 mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      console.log('🚀 ~ mutationFn: ~ eventData:', eventData);
      return await client.createEvent(eventData);
    },
    onMutate: async (newEvent) => {
      // 取消所有相關的查詢以避免樂觀更新被覆蓋
      await queryClient.cancelQueries({ queryKey: eventsQueryKey });

      // 保存舊數據以便回滾
      const previousEvents = queryClient.getQueryData(eventsQueryKey);

      // 樂觀更新 - 添加新事件
      queryClient.setQueryData(eventsQueryKey, (old: any) => {
        if (!old?.data) return old;

        const optimisticEvent = {
          ...newEvent,
          id: Date.now(), // 臨時ID
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          ...old,
          data: [...old.data, optimisticEvent],
        };
      });

      return { previousEvents };
    },
    onError: (error: any, _variables, context) => {
      // 發生錯誤時回滾
      if (context?.previousEvents) {
        queryClient.setQueryData(eventsQueryKey, context.previousEvents);
      }
      toast.error(`創建${isGroupMode ? '群組' : '個人'}事件失敗`, {
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      queryClient.invalidateQueries({ queryKey: expiredEventsQueryKey });
      toast.success(`${isGroupMode ? '群組' : '個人'}事件創建成功`);
    },
  });

  // 更新事件 mutation
  const updateEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return await client.updateEvent(eventData);
    },
    onMutate: async (updatedEvent) => {
      // 取消所有相關的查詢以避免樂觀更新被覆蓋
      await queryClient.cancelQueries({ queryKey: eventsQueryKey });
      await queryClient.cancelQueries({ queryKey: expiredEventsQueryKey });

      // 保存舊數據以便回滾
      const previousEvents = queryClient.getQueryData(eventsQueryKey);
      const previousExpiredEvents = queryClient.getQueryData(expiredEventsQueryKey);

      // 樂觀更新 - 更新主要事件列表
      queryClient.setQueryData(eventsQueryKey, (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.map((event: any) =>
            event.id === updatedEvent.id
              ? { ...event, ...updatedEvent, updatedAt: new Date().toISOString() }
              : event,
          ),
        };
      });

      // 樂觀更新 - 更新過期事件列表
      queryClient.setQueryData(expiredEventsQueryKey, (old: any) => {
        if (!old?.data) return old;

        const updatedData = old.data.map((event: any) =>
          event.id === updatedEvent.id
            ? { ...event, ...updatedEvent, updatedAt: new Date().toISOString() }
            : event,
        );

        // 如果事件被標記為完成，從過期列表中移除
        const filteredData = updatedEvent.completed
          ? updatedData.filter((event: any) => event.id !== updatedEvent.id)
          : updatedData;

        return {
          ...old,
          data: filteredData,
          count: filteredData.length,
        };
      });

      return { previousEvents, previousExpiredEvents };
    },
    onError: (error: any, _variables, context) => {
      // 發生錯誤時回滾
      if (context?.previousEvents) {
        queryClient.setQueryData(eventsQueryKey, context.previousEvents);
      }
      if (context?.previousExpiredEvents) {
        queryClient.setQueryData(expiredEventsQueryKey, context.previousExpiredEvents);
      }
      toast.error(`更新${isGroupMode ? '群組' : '個人'}事件失敗`, {
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      queryClient.invalidateQueries({ queryKey: expiredEventsQueryKey });
      toast.success(`${isGroupMode ? '群組' : '個人'}事件更新成功`);
    },
  });

  // 刪除事件 mutation
  const deleteEventMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: number; userId: string }) => {
      return await client.deleteEvent({ id, userId });
    },
    onMutate: async ({ id }) => {
      // 取消所有相關的查詢以避免樂觀更新被覆蓋
      await queryClient.cancelQueries({ queryKey: eventsQueryKey });
      await queryClient.cancelQueries({ queryKey: expiredEventsQueryKey });

      // 保存舊數據以便回滾
      const previousEvents = queryClient.getQueryData(eventsQueryKey);
      const previousExpiredEvents = queryClient.getQueryData(expiredEventsQueryKey);

      // 樂觀更新 - 從主要事件列表移除事件
      queryClient.setQueryData(eventsQueryKey, (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.filter((event: any) => event.id !== id),
        };
      });

      // 樂觀更新 - 從過期事件列表移除事件
      queryClient.setQueryData(expiredEventsQueryKey, (old: any) => {
        if (!old?.data) return old;

        const filteredData = old.data.filter((event: any) => event.id !== id);

        return {
          ...old,
          data: filteredData,
          count: filteredData.length,
        };
      });

      return { previousEvents, previousExpiredEvents };
    },
    onError: (error: any, _variables, context) => {
      // 發生錯誤時回滾
      if (context?.previousEvents) {
        queryClient.setQueryData(eventsQueryKey, context.previousEvents);
      }
      if (context?.previousExpiredEvents) {
        queryClient.setQueryData(expiredEventsQueryKey, context.previousExpiredEvents);
      }
      toast.error(`刪除${isGroupMode ? '群組' : '個人'}事件失敗`, {
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      queryClient.invalidateQueries({ queryKey: expiredEventsQueryKey });
      toast.success(`${isGroupMode ? '群組' : '個人'}事件刪除成功`);
    },
  });

  // 事件處理函數
  const handleEventAdd = useCallback(
    async (event: Omit<CalendarEvent, 'id'>) => {
      const eventData = {
        title: event.title,
        description: event.description || undefined,
        start: event.start instanceof Date ? event.start.toISOString() : event.start,
        end: event.end instanceof Date ? event.end.toISOString() : event.end,
        allDay: event.allDay || undefined,
        color: event.color || undefined,
        label: event.label || undefined,
        location: event.location || undefined,
        completed: event.completed || undefined,
        userId: isGroupMode ? 'group-user' : entityId,
        groupId: isGroupMode ? entityId : undefined,
      };

      await createEventMutation.mutateAsync(eventData);
    },
    [createEventMutation, isGroupMode, entityId],
  );

  const handleEventUpdate = useCallback(
    async (event: CalendarEvent) => {
      const eventData = {
        id: event.id,
        title: event.title,
        description: event.description || undefined,
        start: event.start instanceof Date ? event.start.toISOString() : event.start,
        end: event.end instanceof Date ? event.end.toISOString() : event.end,
        allDay: event.allDay || undefined,
        color: event.color || undefined,
        label: event.label || undefined,
        location: event.location || undefined,
        completed: event.completed || undefined,
        userId: isGroupMode ? 'group-user' : entityId,
        groupId: isGroupMode ? entityId : undefined,
      };

      await updateEventMutation.mutateAsync(eventData);
    },
    [updateEventMutation, isGroupMode, entityId],
  );

  const handleEventDelete = useCallback(
    async (eventId: number) => {
      await deleteEventMutation.mutateAsync({
        id: eventId,
        userId: isGroupMode ? 'group-user' : entityId,
      });
    },
    [deleteEventMutation, isGroupMode, entityId],
  );

  return {
    // 查詢數據
    todos: eventsQuery.data?.data || [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,

    // 過期事件數據
    incompleteExpiredTodos: expiredEventsQuery.data?.data || [],
    isLoadingIncompleteExpiredTodos: expiredEventsQuery.isLoading,

    // 事件處理函數
    handleEventAdd,
    handleEventUpdate,
    handleEventDelete,

    // Mutation 狀態
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,

    // 手動重新獲取
    refetch: eventsQuery.refetch,
    refetchExpired: expiredEventsQuery.refetch,
  };
}

// 向後相容的別名
export const useGroupTodos = useTodos;
