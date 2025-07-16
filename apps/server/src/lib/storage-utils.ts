/**
 * 儲存路徑工具函數
 * 統一處理檔案儲存路徑邏輯
 */

export interface FileInfo {
  fileId: string;
  userId: string;
  groupId?: string | null;
}

/**
 * 生成檔案的儲存路徑
 * @param file 檔案資訊
 * @returns 標準化的儲存路徑
 */
export const getStoragePath = (file: FileInfo): string => {
  if (file.groupId) {
    return `groups/${file.groupId}/${file.fileId}`;
  }
  return `users/${file.userId}/${file.fileId}`;
};

/**
 * 從儲存路徑解析檔案資訊
 * @param storagePath 儲存路徑
 * @returns 解析出的檔案資訊
 */
export const parseStoragePath = (
  storagePath: string,
): {
  entityType: 'user' | 'group';
  entityId: string;
  fileId: string;
} => {
  const parts = storagePath.split('/');

  if (parts.length >= 3) {
    const [entityType, entityId, fileId] = parts;

    if (entityType === 'groups') {
      return {
        entityType: 'group',
        entityId,
        fileId,
      };
    }

    if (entityType === 'users') {
      return {
        entityType: 'user',
        entityId,
        fileId,
      };
    }
  }

  throw new Error('Invalid storage path format');
};

/**
 * 檢查檔案路徑是否為群組檔案
 * @param storagePath 儲存路徑
 * @returns 是否為群組檔案
 */
export const isGroupFilePath = (storagePath: string): boolean => {
  return storagePath.startsWith('groups/');
};

/**
 * 檢查檔案路徑是否為用戶檔案
 * @param storagePath 儲存路徑
 * @returns 是否為用戶檔案
 */
export const isUserFilePath = (storagePath: string): boolean => {
  return storagePath.startsWith('users/');
};

/**
 * 生成ICS檔案名稱
 * @param entityType 實體類型
 * @param entityId 實體ID
 * @returns ICS檔案名稱
 */
export const getIcsFileName = (entityType: 'user' | 'group', entityId: string): string => {
  if (entityType === 'group') {
    return `group-${entityId}-calendar.ics`;
  }
  return 'calendar.ics';
};

/**
 * 生成行事曆標題
 * @param entityType 實體類型
 * @param entityId 實體ID
 * @returns 行事曆標題
 */
export const getCalendarTitle = (entityType: 'user' | 'group', entityId: string): string => {
  if (entityType === 'group') {
    return `Calendar of group-${entityId}`;
  }
  return `Calendar of ${entityId}`;
};
