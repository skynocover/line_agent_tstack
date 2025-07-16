import { createFileRoute } from '@tanstack/react-router';
import { Check, Copy, ExternalLink, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FileFeatureCard, TodoFeatureCard } from '@/components/feature-cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/features/auth';

const HomePage = () => {
  const { profile } = useAuthStore();
  const lineOaId = import.meta.env.VITE_LINEOA_ID;
  const lineUrl = `https://line.me/R/ti/p/@${lineOaId || '640uxald'}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    lineUrl,
  )}`;

  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      toast.success('連結已複製到剪貼簿');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      toast.error('複製失敗，請手動複製');
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {/* Hero Section */}
      <div className="mb-6 text-center">
        <h1 className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-bold text-4xl text-transparent">
          🤖 數位管家
        </h1>
        <p className="mb-6 text-muted-foreground text-xl">您的智能生活助手，讓日常管理更簡單！</p>
      </div>

      {/* Features Section */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <TodoFeatureCard isAuthenticated={!!profile} userId={profile?.userId} />
        <FileFeatureCard isAuthenticated={!!profile} userId={profile?.userId} />
      </div>

      {/* LINE Friend Section */}
      <Card className="mb-8">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            加入 LINE 好友開始使用
          </CardTitle>
          <CardDescription>掃描 QR Code 或點擊連結，立即體驗數位管家服務</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
            <div className="space-y-4">
              <img
                src={qrCodeUrl}
                alt="LINE 好友 QR Code"
                className="mx-auto h-48 w-48 rounded-lg border-2 border-gray-200 shadow-sm"
              />
              <p className="text-muted-foreground text-sm">掃描 QR Code 加好友</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <h3 className="font-semibold">如何開始使用：</h3>
                <ol className="list-inside list-decimal space-y-1 text-muted-foreground text-sm">
                  <li>點擊下方按鈕或掃描 QR Code</li>
                  <li>加入 LINE 好友</li>
                  <li>傳送訊息開始對話</li>
                  <li>享受智能助手服務</li>
                </ol>
              </div>

              {/* LINE URL with copy function */}
              <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                <p className="font-medium text-gray-700 text-sm">LINE 連結：</p>
                <div className="flex items-center gap-2 rounded border bg-white p-2">
                  <code className="flex-1 break-all text-gray-600 text-xs">{lineUrl}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(lineUrl)}
                    className="h-8 w-8 shrink-0 p-0"
                  >
                    {copiedUrl ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <a href={lineUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button size="lg" className="bg-green-500 hover:bg-green-600">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  加入 LINE 好友
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-muted-foreground text-sm">
        {profile ? (
          <p>🎉 您已成功登入！現在可使用所有功能</p>
        ) : (
          <p>💡 提示：登入後可使用完整功能，包括檔案管理和待辦事項同步</p>
        )}
      </div>
    </div>
  );
};

export const Route = createFileRoute('/')({
  component: HomePage,
});
