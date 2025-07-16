import { createFileRoute } from '@tanstack/react-router';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  File,
  FileText,
  ImageIcon,
  MoreVertical,
  Music,
  Pencil,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProtectedRoute } from '@/features/auth';
import { useFiles } from '@/features/files/hooks';
import {
  formatFileSize,
  getFileCategoryFromMimeType,
  removeFileExtension,
} from '@/features/files/utils';

// 根據檔案類型返回對應圖示
const getFileIcon = (category: string) => {
  switch (category) {
    case 'document':
      return <FileText className="h-5 w-5 text-blue-600" />;
    case 'image':
      return <ImageIcon className="h-5 w-5 text-green-600" />;
    case 'video':
      return <Video className="h-5 w-5 text-red-600" />;
    case 'audio':
      return <Music className="h-5 w-5 text-purple-600" />;
    case 'archive':
      return <Archive className="h-5 w-5 text-orange-600" />;
    default:
      return <File className="h-5 w-5 text-gray-600" />;
  }
};

// 根據檔案類型返回顏色
const getFileTypeColor = (type: string) => {
  const colors: { [key: string]: string } = {
    pdf: 'bg-red-100 text-red-800',
    jpg: 'bg-green-100 text-green-800',
    jpeg: 'bg-green-100 text-green-800',
    png: 'bg-green-100 text-green-800',
    mp3: 'bg-purple-100 text-purple-800',
    mp4: 'bg-red-100 text-red-800',
    zip: 'bg-orange-100 text-orange-800',
    xlsx: 'bg-blue-100 text-blue-800',
    docx: 'bg-blue-100 text-blue-800',
  };
  return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

// 基於 MIME type 獲取檔案類型顏色
const getFileColorFromMimeType = (mimeType: string) => {
  const type = mimeType.toLowerCase();

  if (type.includes('pdf')) return 'bg-red-100 text-red-800';
  if (type.startsWith('image/')) return 'bg-green-100 text-green-800';
  if (type.startsWith('audio/')) return 'bg-purple-100 text-purple-800';
  if (type.startsWith('video/')) return 'bg-red-100 text-red-800';
  if (type.includes('zip') || type.includes('rar') || type.includes('archive'))
    return 'bg-orange-100 text-orange-800';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'bg-blue-100 text-blue-800';
  if (type.includes('word') || type.includes('document') || type.includes('text/'))
    return 'bg-blue-100 text-blue-800';

  return 'bg-gray-100 text-gray-800';
};

// 從 MIME type 獲取簡潔的類型名稱
const getSimpleTypeFromMimeType = (mimeType: string) => {
  const type = mimeType.toLowerCase();

  if (type.includes('pdf')) return 'PDF';
  if (type.includes('jpeg') || type.includes('jpg')) return 'JPG';
  if (type.includes('png')) return 'PNG';
  if (type.includes('gif')) return 'GIF';
  if (type.includes('mp3')) return 'MP3';
  if (type.includes('mp4')) return 'MP4';
  if (type.includes('zip')) return 'ZIP';
  if (type.includes('rar')) return 'RAR';
  if (type.includes('word')) return 'DOC';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'XLS';
  if (type.startsWith('text/')) return 'TXT';
  if (type.startsWith('image/')) return 'IMG';
  if (type.startsWith('audio/')) return 'AUDIO';
  if (type.startsWith('video/')) return 'VIDEO';

  // 嘗試從 MIME type 本身提取
  const subtype = type.split('/')[1];
  if (subtype) return subtype.toUpperCase();

  return 'FILE';
};

const pageSize = 10;
// 使用統一的 storage URL 結構
const storageBaseUrl = import.meta.env.VITE_FILE_BASE_URL;

const FilesPageContent = () => {
  const { userId } = Route.useParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [sort, setSort] = useState<'name' | 'type' | 'size' | 'date'>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [editingFile, setEditingFile] = useState<{ fileId: string; fileName: string } | null>(null);
  const [deletingFile, setDeletingFile] = useState<{ fileId: string; fileName: string } | null>(
    null,
  );
  const [newFileName, setNewFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add debounce effect
  useEffect(() => {
    if (isComposing) return;

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, isComposing]);

  const {
    files,
    pagination,
    isLoading,
    error,
    handleDeleteFile,
    handleUpdateFileName,
    handleUploadFiles,
    isUploading,
  } = useFiles({
    userId,
    page,
    limit: pageSize,
    sort,
    order,
    filter: debouncedSearchTerm,
  });

  const handleSortChange = (newSort: 'name' | 'type' | 'size' | 'date') => {
    if (sort === newSort) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(newSort);
      setOrder('asc');
    }
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleRename = (file: { fileId: string; fileName: string }) => {
    setEditingFile(file);
    setNewFileName(file.fileName);
  };

  const handleDelete = (file: { fileId: string; fileName: string }) => {
    setDeletingFile(file);
  };

  const handleRenameSubmit = async () => {
    if (!editingFile || !newFileName.trim()) return;

    try {
      await handleUpdateFileName(editingFile.fileId, newFileName.trim());
      setEditingFile(null);
      setNewFileName('');
      toast.success('檔案名稱更新成功');
    } catch {
      toast.error('檔案名稱更新失敗');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFile) return;

    try {
      await handleDeleteFile(deletingFile.fileId);
      setDeletingFile(null);
      toast.success('檔案刪除成功');
    } catch {
      toast.error('檔案刪除失敗');
    }
  };

  const handleCopyLink = (fileId: string) => {
    const link = `${storageBaseUrl}/${userId}/${fileId}`;
    navigator.clipboard.writeText(link);
    toast.success('檔案連結已複製到剪貼簿');
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      await handleUploadFiles(Array.from(files));
    } catch (error) {
      console.error('Upload error:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    try {
      await handleUploadFiles(Array.from(files));
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  // Mobile File Card Component
  const MobileFileCard = ({ file }: { file: any }) => {
    const category = getFileCategoryFromMimeType(file.mimeType);
    const displayName = removeFileExtension(file.fileName);

    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {getFileIcon(category)}
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="mb-1 w-full cursor-pointer truncate text-left font-medium text-gray-900 hover:text-blue-600 hover:underline"
                  title={file.fileName}
                  onClick={() =>
                    window.open(`${storageBaseUrl}/${userId}/${file.fileId}`, '_blank')
                  }
                >
                  {displayName}
                </button>
                <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm">
                  <Badge
                    variant="secondary"
                    className={`${getFileColorFromMimeType(file.mimeType)} text-xs`}
                  >
                    {getSimpleTypeFromMimeType(file.mimeType)}
                  </Badge>
                  <span>{formatFileSize(file.fileSize)}</span>
                </div>
                <div className="mt-1 text-gray-400 text-xs">
                  {new Date(file.createdAt || '').toLocaleString('zh-TW')}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() =>
                    window.open(`${storageBaseUrl}/${userId}/${file.fileId}`, '_blank')
                  }
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  下載檔案
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCopyLink(file.fileId)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  複製連結
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRename({ fileId: file.fileId, fileName: file.fileName })}
                  className="flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  重新命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete({ fileId: file.fileId, fileName: file.fileName })}
                  className="flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  刪除檔案
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>載入檔案時發生錯誤：{typeof error === 'string' ? error : '未知錯誤'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <section
        className={`mx-auto max-w-7xl transition-all duration-200 ${
          isDragOver ? 'rounded-lg border-2 border-blue-300 border-dashed bg-blue-50 p-4' : ''
        }`}
        aria-label="檔案拖放上傳區域"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragOver && (
          <div className="mb-4 text-center text-blue-600">
            <Upload className="mx-auto mb-2 h-8 w-8" />
            <p className="font-medium text-lg">拖放檔案到這裡上傳</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="font-bold text-2xl text-gray-900 sm:text-3xl">檔案管理</h1>
              <p className="mt-1 text-gray-600 text-sm sm:text-base">管理您上傳的檔案</p>
            </div>

            <Button
              onClick={handleUploadClick}
              className="flex w-full items-center gap-2 sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              上傳檔案
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Search and Sort */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
            <Input
              placeholder="搜尋檔案名稱..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              className="h-12 pr-10 pl-10 sm:h-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 transform p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mobile Sort Options */}
          <div className="block sm:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { key: 'name', label: '名稱' },
                { key: 'type', label: '類型' },
                { key: 'size', label: '大小' },
                { key: 'date', label: '時間' },
              ].map((sortOption) => (
                <Button
                  key={sortOption.key}
                  variant={sort === sortOption.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSortChange(sortOption.key as any)}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  {sortOption.label}
                  {sort === sortOption.key && (
                    <span className="text-xs">{order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Files Display */}
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
              <span className="ml-3">載入中...</span>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <File className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <p className="mb-2 font-medium text-lg">
              {searchTerm ? '沒有找到符合條件的檔案' : '還沒有上傳任何檔案'}
            </p>
            <p className="text-sm">{!searchTerm && '點擊上方的「上傳檔案」按鈕開始使用'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden rounded-lg border bg-white shadow-sm sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-gray-50"
                      onClick={() => handleSortChange('name')}
                    >
                      <div className="flex items-center gap-1">
                        檔案名稱
                        {sort === 'name' && (
                          <span className="text-xs">{order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-gray-50"
                      onClick={() => handleSortChange('type')}
                    >
                      <div className="flex items-center gap-1">
                        類型
                        {sort === 'type' && (
                          <span className="text-xs">{order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-gray-50"
                      onClick={() => handleSortChange('size')}
                    >
                      <div className="flex items-center gap-1">
                        大小
                        {sort === 'size' && (
                          <span className="text-xs">{order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-gray-50"
                      onClick={() => handleSortChange('date')}
                    >
                      <div className="flex items-center gap-1">
                        上傳時間
                        {sort === 'date' && (
                          <span className="text-xs">{order === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file: any) => {
                    const category = getFileCategoryFromMimeType(file.mimeType);
                    const displayName = removeFileExtension(file.fileName);

                    return (
                      <TableRow key={file.fileId} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getFileIcon(category)}
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                className="max-w-xs cursor-pointer truncate text-left font-medium text-gray-900 hover:text-blue-600 hover:underline"
                                title={file.fileName}
                                onClick={() =>
                                  window.open(
                                    `${storageBaseUrl}/${userId}/${file.fileId}`,
                                    '_blank',
                                  )
                                }
                              >
                                {displayName}
                              </button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getFileColorFromMimeType(file.mimeType)}
                          >
                            {getSimpleTypeFromMimeType(file.mimeType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatFileSize(file.fileSize)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(file.createdAt || '').toLocaleString('zh-TW')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(`${storageBaseUrl}/${userId}/${file.fileId}`, '_blank')
                              }
                              title="下載檔案"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(file.fileId)}
                              title="複製連結"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRename({ fileId: file.fileId, fileName: file.fileName })
                              }
                              title="重新命名"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete({ fileId: file.fileId, fileName: file.fileName })
                              }
                              title="刪除檔案"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="block space-y-3 sm:hidden">
              {files.map((file: any) => (
                <MobileFileCard key={file.fileId} file={file} />
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="h-10 px-3"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">上一頁</span>
            </Button>

            <div className="flex items-center gap-1 sm:gap-2">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="h-10 w-10 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.totalPages}
              className="h-10 px-3"
            >
              <span className="hidden sm:inline">下一頁</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="fixed right-4 bottom-4 left-4 z-50 rounded-lg border bg-white p-4 shadow-lg sm:left-auto">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <div className="h-4 w-4 animate-spin rounded-full border-blue-600 border-b-2" />
              <span className="text-sm">檔案上傳中...</span>
            </div>
          </div>
        )}

        {/* Rename Dialog */}
        <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle>重新命名檔案</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="fileName" className="font-medium text-gray-700 text-sm">
                  檔案名稱
                </label>
                <Input
                  id="fileName"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="請輸入新的檔案名稱"
                  className="mt-1 h-12 sm:h-10"
                />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setEditingFile(null)}
                className="w-full sm:w-auto"
              >
                取消
              </Button>
              <Button
                onClick={handleRenameSubmit}
                disabled={!newFileName.trim()}
                className="w-full sm:w-auto"
              >
                確認
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingFile} onOpenChange={() => setDeletingFile(null)}>
          <AlertDialogContent className="mx-4 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除檔案</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                您確定要刪除檔案「{deletingFile?.fileName}」嗎？此操作無法復原。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <AlertDialogCancel className="w-full sm:w-auto">取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
              >
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
};

const FilesPage = () => {
  const { userId } = Route.useParams();

  return (
    <ProtectedRoute
      requiredUserId={userId}
      redirectTo="/files"
      showErrorToast={true}
      autoLogin={true}
    >
      <FilesPageContent />
    </ProtectedRoute>
  );
};

export const Route = createFileRoute('/$userId/files')({
  component: FilesPage,
  validateSearch: z.object({
    sort: z.enum(['name', 'type', 'size', 'date']).optional().default('name'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
    page: z.coerce.number().min(1).optional().default(1),
    filter: z.string().optional(),
  }),
});
