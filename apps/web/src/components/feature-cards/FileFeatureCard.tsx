import { Link } from '@tanstack/react-router';
import { ArrowRight, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FileFeatureCardProps {
  isAuthenticated: boolean;
  userId?: string;
}

export const FileFeatureCard = ({ isAuthenticated, userId }: FileFeatureCardProps) => {
  const cardContent = (
    <Card
      className={`gap-3 border-amber-200 transition-shadow hover:shadow-lg ${
        isAuthenticated
          ? 'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-amber-300'
          : ''
      }`}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-700" />
            檔案 ➡️ 永久備份
          </div>
        </CardTitle>
        <CardDescription>上傳您的重要檔案，享受安全可靠的雲端儲存服務</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="mb-2 font-medium text-amber-800 text-sm">✨ 主要功能：</p>
          <div className="space-y-1 text-amber-700 text-xs">
            <p>☁️ 雲端安全儲存</p>
            <p>🔒 加密保護隱私</p>
            <p>📱 多裝置同步</p>
          </div>
        </div>
        <div className="mt-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 font-medium text-amber-700 text-sm">
              <span>點擊進入管理</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">💡 登入後即可使用</div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isAuthenticated && userId) {
    return (
      <Link to="/$userId/files" params={{ userId }} className="no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};
