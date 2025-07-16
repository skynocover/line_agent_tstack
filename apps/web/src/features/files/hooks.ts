import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/authStore';
import { client } from '@/utils/orpc';

interface UseFilesOptions {
  userId?: string;
  groupId?: string;
  filter?: string;
  page?: number;
  limit?: number;
  sort?: 'name' | 'size' | 'date' | 'type';
  order?: 'asc' | 'desc';
}

/**
 * 統一的檔案管理Hook - 使用 ORPC 客戶端配合手動 React Query
 */
export function useFiles({
  userId,
  groupId,
  filter,
  page = 1,
  limit = 20,
  sort = 'date',
  order = 'desc',
}: UseFilesOptions) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const isGroupMode = !!groupId;
  const entityId = groupId || userId || '';

  // 查詢鍵
  const filesQueryKey = [
    isGroupMode ? 'groupFiles' : 'files',
    entityId,
    { filter, page, limit, sort, order },
  ];

  // 查詢檔案
  const filesQuery = useQuery({
    queryKey: filesQueryKey,
    queryFn: async () => {
      return isGroupMode
        ? await client.getGroupFiles({
            groupId: entityId,
            filter,
            page,
            limit,
            sort,
            order,
          })
        : await client.getFiles({
            userId: entityId,
            filter,
            page,
            limit,
            sort,
            order,
          });
    },
  });

  // 更新檔案名稱 mutation
  const updateFileNameMutation = useMutation({
    mutationFn: async ({ fileId, fileName }: { fileId: string; fileName: string }) => {
      return isGroupMode
        ? await client.updateGroupFileName({
            fileId,
            fileName,
            groupId: entityId,
          })
        : await client.updateFileName({
            fileId,
            fileName,
            userId: entityId,
          });
    },
    onMutate: async ({ fileId, fileName }) => {
      // 取消所有相關的查詢以避免樂觀更新被覆蓋
      await queryClient.cancelQueries({ queryKey: filesQueryKey });

      // 保存舊數據以便回滾
      const previousFiles = queryClient.getQueryData(filesQueryKey);

      // 樂觀更新 - 更新檔案名稱
      queryClient.setQueryData(filesQueryKey, (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.map((file: any) =>
            file.id === fileId
              ? { ...file, name: fileName, updatedAt: new Date().toISOString() }
              : file,
          ),
        };
      });

      return { previousFiles };
    },
    onError: (error: any, _variables, context) => {
      // 發生錯誤時回滾
      if (context?.previousFiles) {
        queryClient.setQueryData(filesQueryKey, context.previousFiles);
      }
      toast.error(`更新${isGroupMode ? '群組' : ''}檔案名稱失敗`, {
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKey });
      toast.success(`${isGroupMode ? '群組' : ''}檔案名稱更新成功`);
    },
  });

  // 刪除檔案 mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return isGroupMode
        ? await client.deleteGroupFile({
            fileId,
            groupId: entityId,
          })
        : await client.deleteFile({
            fileId,
            userId: entityId,
          });
    },
    onMutate: async (fileId) => {
      // 取消所有相關的查詢以避免樂觀更新被覆蓋
      await queryClient.cancelQueries({ queryKey: filesQueryKey });

      // 保存舊數據以便回滾
      const previousFiles = queryClient.getQueryData(filesQueryKey);

      // 樂觀更新 - 移除檔案
      queryClient.setQueryData(filesQueryKey, (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.filter((file: any) => file.id !== fileId),
        };
      });

      return { previousFiles };
    },
    onError: (error: any, _variables, context) => {
      // 發生錯誤時回滾
      if (context?.previousFiles) {
        queryClient.setQueryData(filesQueryKey, context.previousFiles);
      }
      toast.error(`刪除${isGroupMode ? '群組' : ''}檔案失敗`, {
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesQueryKey });
      toast.success(`${isGroupMode ? '群組' : ''}檔案刪除成功`);
    },
  });

  // 上傳檔案 mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadPromises = files.map(async (file) => {
        // 檢查檔案大小限制 (50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`檔案 ${file.name} 超過大小限制 (50MB)`);
        }

        // 將檔案轉換為 base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (!result) {
              reject(new Error('Failed to read file'));
              return;
            }
            resolve(result);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        // 驗證必要的欄位
        const fileName = file.name || 'unknown';
        const fileType = file.type || 'application/octet-stream';
        const fileSize = file.size;

        console.log('Uploading file:', { fileName, fileType, fileSize, isGroupMode });

        if (isGroupMode) {
          return await client.uploadGroupFile({
            groupId: entityId,
            userId: userId!,
            fileName,
            fileType,
            fileSize,
            fileData,
          });
        }
        return await client.uploadFile({
          userId: entityId,
          fileName,
          fileType,
          fileSize,
          fileData,
        });
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: filesQueryKey });
      toast.success(`成功上傳 ${data.length} 個檔案`);
    },
    onError: (error: any) => {
      console.log('error', error);
      const message = error.message || '檔案上傳失敗';
      toast.error('檔案上傳失敗', {
        description: message,
      });
    },
  });

  // 處理函數
  const handleUpdateFileName = useCallback(
    async (fileId: string, fileName: string) => {
      await updateFileNameMutation.mutateAsync({ fileId, fileName });
    },
    [updateFileNameMutation],
  );

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      await deleteFileMutation.mutateAsync(fileId);
    },
    [deleteFileMutation],
  );

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      await uploadFileMutation.mutateAsync(files);
    },
    [uploadFileMutation],
  );

  return {
    // 查詢數據
    files: filesQuery.data?.data || [],
    pagination: filesQuery.data?.pagination,
    isLoading: filesQuery.isLoading,
    error: filesQuery.error,

    // 處理函數
    handleUpdateFileName,
    handleDeleteFile,
    handleUploadFiles,

    // Mutation 狀態
    isUpdatingFileName: updateFileNameMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    isUploading: uploadFileMutation.isPending,

    // 手動重新獲取
    refetch: filesQuery.refetch,
  };
}

// 向後相容的別名
export const useGroupFiles = useFiles;
