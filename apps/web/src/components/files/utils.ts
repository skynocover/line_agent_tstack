import { Archive, File, FileText, ImageIcon, Music, Video } from 'lucide-react';
import { createElement } from 'react';

/**
 * 檔案相關工具函數
 * 統一檔案處理邏輯，避免重複代碼
 */

// 檔案類別定義
export type FileCategory = 'document' | 'image' | 'audio' | 'video' | 'archive' | 'other';

// 檔案類別顏色映射
export const FILE_TYPE_COLORS: Record<FileCategory, string> = {
  document: 'text-blue-600',
  image: 'text-green-600',
  audio: 'text-purple-600',
  video: 'text-red-600',
  archive: 'text-orange-600',
  other: 'text-gray-600',
};

/**
 * 根據檔案類別取得對應的圖示組件
 */
export const getFileIcon = (category: FileCategory) => {
  const iconClass = 'h-5 w-5';
  const colorClass = FILE_TYPE_COLORS[category];
  const className = `${iconClass} ${colorClass}`;

  switch (category) {
    case 'document':
      return createElement(FileText, { className });
    case 'image':
      return createElement(ImageIcon, { className });
    case 'audio':
      return createElement(Music, { className });
    case 'video':
      return createElement(Video, { className });
    case 'archive':
      return createElement(Archive, { className });
    default:
      return createElement(File, { className });
  }
};

/**
 * 根據檔案類別取得對應的顏色類別
 */
export const getFileTypeColor = (category: FileCategory): string => {
  return FILE_TYPE_COLORS[category];
};

/**
 * 格式化檔案大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / k ** i + Number.EPSILON) * 100) / 100} ${sizes[i]}`;
};

/**
 * 格式化日期
 */
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 取得檔案的存取URL
 */
export const getFileUrl = (
  file: { fileId: string; groupId?: string | null; userId: string },
  baseUrl?: string,
): string => {
  const base = baseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

  if (file.groupId) {
    return `${base}/storage/groups/${file.groupId}/${file.fileId}`;
  }
  return `${base}/storage/users/${file.userId}/${file.fileId}`;
};

/**
 * 檔案排序選項
 */
export const FILE_SORT_OPTIONS = [
  { value: 'name', label: '名稱' },
  { value: 'type', label: '類型' },
  { value: 'size', label: '大小' },
  { value: 'date', label: '日期' },
] as const;

/**
 * 排序方向選項
 */
export const SORT_ORDER_OPTIONS = [
  { value: 'asc', label: '升序' },
  { value: 'desc', label: '降序' },
] as const;
