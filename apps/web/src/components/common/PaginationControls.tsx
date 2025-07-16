import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginationControlsProps {
  pagination: PaginationInfo;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const PaginationControls = ({
  pagination,
  currentPage,
  onPageChange,
  className = '',
}: PaginationControlsProps) => {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { totalPages } = pagination;
  const startItem = (currentPage - 1) * pagination.limit + 1;
  const endItem = Math.min(currentPage * pagination.limit, pagination.total);

  // 計算要顯示的頁碼
  const getVisiblePages = () => {
    const visiblePages: number[] = [];
    const maxVisible = 5; // 最多顯示5個頁碼

    if (totalPages <= maxVisible) {
      // 如果總頁數少於等於最大顯示數，顯示全部
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      // 複雜邏輯：當前頁前後各顯示2頁
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);

      for (let i = start; i <= end; i++) {
        visiblePages.push(i);
      }

      // 如果開始頁不是1，加入1和省略號
      if (start > 1) {
        visiblePages.unshift(-1); // -1 代表省略號
        visiblePages.unshift(1);
      }

      // 如果結束頁不是最後一頁，加入省略號和最後一頁
      if (end < totalPages) {
        visiblePages.push(-2); // -2 代表省略號
        visiblePages.push(totalPages);
      }
    }

    return visiblePages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={`mt-6 flex items-center justify-between ${className}`}>
      {/* 資訊文字 */}
      <div className="text-muted-foreground text-sm">
        顯示第 {startItem} - {endItem} 項，共 {pagination.total} 項
      </div>

      {/* 分頁控制 */}
      <div className="flex items-center gap-2">
        {/* 上一頁按鈕 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-10 px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">上一頁</span>
        </Button>

        {/* 頁碼按鈕 */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === -1 || page === -2) {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            return (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                className="h-10 w-10"
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* 下一頁按鈕 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-10 px-3"
        >
          <span className="mr-1 hidden sm:inline">下一頁</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
