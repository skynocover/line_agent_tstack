import { Link } from '@tanstack/react-router';
import { ArrowRight, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TodoFeatureCardProps {
  isAuthenticated: boolean;
  userId?: string;
}

export const TodoFeatureCard = ({ isAuthenticated, userId }: TodoFeatureCardProps) => {
  const cardContent = (
    <Card
      className={`gap-3 border-purple-200 transition-shadow hover:shadow-lg ${
        isAuthenticated
          ? 'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-purple-300'
          : ''
      }`}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-purple-600" />
            文字 ➡️ 待辦事項
          </div>
        </CardTitle>
        <CardDescription>只需要傳送文字訊息，AI 就會自動為您建立待辦事項</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
          <p className="mb-2 font-medium text-purple-700 text-sm">💡 使用範例：</p>
          <div className="space-y-1 text-purple-600 text-xs">
            <p>「下週二早上十點會議」</p>
            <p>「明天下午2點和小明討論專案」</p>
            <p>「25號繳電費」</p>
          </div>
        </div>
        <div className="mt-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 font-medium text-purple-600 text-sm">
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
      <Link to="/$userId/todo" params={{ userId }} className="no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};
