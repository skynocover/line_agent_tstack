// 移除檔名中的副檔名
export const removeFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return filename; // 沒有副檔名或檔名以點開頭
  }
  return filename.substring(0, lastDotIndex);
};

// 從 MIME type 獲取檔案類別
export const getFileCategoryFromMimeType = (mimeType: string): string => {
  const type = mimeType.toLowerCase();

  // 文件類型
  if (
    type.includes('pdf') ||
    type.includes('msword') ||
    type.includes('wordprocessingml') ||
    type.includes('ms-excel') ||
    type.includes('spreadsheetml') ||
    type.includes('text/') ||
    type.includes('rtf')
  ) {
    return 'document';
  }

  // 圖片類型
  if (type.startsWith('image/')) {
    return 'image';
  }

  // 音頻類型
  if (type.startsWith('audio/')) {
    return 'audio';
  }

  // 視頻類型
  if (type.startsWith('video/')) {
    return 'video';
  }

  // 壓縮檔類型
  if (
    type.includes('zip') ||
    type.includes('rar') ||
    type.includes('tar') ||
    type.includes('gzip') ||
    type.includes('7z')
  ) {
    return 'archive';
  }

  return 'other';
};

// 獲取檔案類型（保留向後兼容性，但建議使用 getFileCategoryFromMimeType）
export const getFileType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension || 'unknown';
};

// 獲取檔案類別（保留向後兼容性，但建議使用 getFileCategoryFromMimeType）
export const getFileCategory = (type: string): string => {
  const categories: Record<string, string> = {
    pdf: 'document',
    docx: 'document',
    xlsx: 'document',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    mp3: 'audio',
    wav: 'audio',
    mp4: 'video',
    mov: 'video',
    zip: 'archive',
    rar: 'archive',
  };
  return categories[type] || 'other';
};

// 格式化檔案大小
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / k ** i).toFixed(1)) + ' ' + sizes[i];
};
