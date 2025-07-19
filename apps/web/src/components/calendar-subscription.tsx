import { Apple, Calendar, Check, Copy, Globe, Mail, Plus, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface CalendarSubscriptionProps {
  userId?: string;
  groupId?: string;
  variant?: 'default' | 'compact';
}

// 檢測用戶平台和設備
const getPlatformInfo = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent);
  const isWindows = /Win32|Win64|Windows|WinCE/.test(userAgent);

  return { isMobile, isIOS, isAndroid, isMacOS, isWindows };
};

export const CalendarSubscription = ({
  userId,
  groupId,
  variant = 'default',
}: CalendarSubscriptionProps) => {
  const [copiedIcsUrl, setCopiedIcsUrl] = useState(false);

  // 判斷是否為群組模式
  const isGroupMode = !!groupId;
  const entityId = groupId || userId;

  if (!entityId) {
    throw new Error('必須提供 userId 或 groupId 其中之一');
  }

  // ICS URL - 根據模式生成不同路徑
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace('https://', 'webcal://');
  const icsUrl = isGroupMode ? `${apiBaseUrl}/ics/group/${groupId}` : `${apiBaseUrl}/ics/${userId}`;
  const platform = getPlatformInfo();

  // 文字配置
  const config = {
    title: isGroupMode ? '群組行事曆訂閱' : '行事曆訂閱',
    description: isGroupMode
      ? '一鍵同步群組行事曆到各種日曆應用程式'
      : '一鍵同步您的行事曆到各種日曆應用程式',
    yahooTitle: isGroupMode ? '群組行事曆' : '我的行事曆',
    tipTitle: isGroupMode ? '💡 群組行事曆提示：' : '💡 提示：',
  };

  // 各種日曆訂閱連結
  const calendarUrls = {
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsUrl)}`,
    apple: icsUrl,
    outlook: `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(icsUrl)}`,
  };

  // 日曆應用配置
  const calendarApps = [
    {
      id: 'google',
      name: '加入 Google 行事曆',
      icon: Calendar,
      color: 'bg-blue-500 hover:bg-blue-600',
      url: calendarUrls.google,
      openInNewTab: true,
      recommended: !platform.isIOS, // 非 iOS 設備推薦
    },
    {
      id: 'apple',
      name: '加入 Apple 行事曆',
      icon: Apple,
      color: 'bg-gray-800 hover:bg-gray-900',
      url: calendarUrls.apple,
      openInNewTab: false,
      recommended: platform.isIOS || platform.isMacOS, // iOS 或 macOS 推薦
    },
    {
      id: 'copy',
      name: '複製訂閱連結',
      icon: Copy,
      color: 'bg-gray-500 hover:bg-gray-600',
      url: icsUrl,
      openInNewTab: false,
      recommended: false,
    },
  ];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIcsUrl(true);
      setTimeout(() => setCopiedIcsUrl(false), 2000);
      toast.success('連結已複製到剪貼簿');
    } catch {
      toast.error('複製失敗，請手動複製');
    }
  };

  const handleCalendarClick = (app: (typeof calendarApps)[0]) => {
    if (app.id === 'copy') {
      copyToClipboard(app.url);
      return;
    }

    if (app.openInNewTab) {
      window.open(app.url, '_blank');
    } else {
      window.location.href = app.url;
    }
  };

  // 按推薦程度排序日曆應用
  const sortedApps = [...calendarApps].sort((a, b) => {
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    return 0;
  });

  // 完整版群組資訊區塊
  const FullGroupInfoBlock = () => {
    if (!isGroupMode) return null;

    return (
      <div className="rounded-lg bg-green-50 p-4">
        <h4 className="mb-2 font-medium text-green-800">群組資訊：</h4>
        <div className="space-y-2 text-green-700 text-sm">
          <div>
            <strong>群組 ID：</strong>
            <code className="ml-1 rounded bg-white px-2 py-1 text-xs">{groupId}</code>
          </div>
          <div>此行事曆包含群組內透過 LINE Bot 或網頁創建的所有事件</div>
          <div>群組成員都可以查看、訂閱和編輯此行事曆</div>
        </div>
      </div>
    );
  };

  // 提示訊息內容
  const getTipContent = () => {
    if (isGroupMode) {
      return (
        <ul className="mt-1 list-inside list-disc space-y-1">
          <li>此行事曆顯示群組內透過 LINE Bot 或網頁創建的所有事件</li>
          <li>群組成員都可以查看、訂閱，並直接在網頁上編輯事件</li>
          <li>訂閱後，群組行事曆會自動同步更新</li>
          <li>推薦的應用程式已根據您的設備類型標示</li>
        </ul>
      );
    }

    return (
      <ul className="mt-1 list-inside list-disc space-y-1">
        <li>推薦的應用程式已根據您的設備類型標示</li>
        <li>點擊按鈕會自動開啟對應的行事曆應用程式</li>
        <li>訂閱後，您的行事曆會自動同步更新</li>
      </ul>
    );
  };

  if (variant === 'compact') {
    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {sortedApps.map((app) => {
            const IconComponent = app.icon;
            return (
              <Button
                key={app.id}
                size="sm"
                onClick={() => handleCalendarClick(app)}
                className={`relative flex items-center justify-center gap-2 ${app.color}`}
              >
                <IconComponent className="h-4 w-4" />
                {app.name}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {config.title}
        </CardTitle>
        <CardDescription>
          {config.description}
          {platform.isMobile && (
            <span className="mt-1 block text-blue-600 text-sm">
              💡 在手機上可直接開啟對應應用程式
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 群組資訊區塊 (僅群組模式) */}
        <FullGroupInfoBlock />

        {/* 快速訂閱區塊 */}
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="mb-3">
            <h4 className="mb-2 font-medium">快速訂閱：</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {sortedApps.map((app) => {
                const IconComponent = app.icon;
                return (
                  <Button
                    key={app.id}
                    onClick={() => handleCalendarClick(app)}
                    className={`relative flex items-center justify-center gap-2 ${app.color}`}
                  >
                    {app.recommended && (
                      <Badge
                        variant="secondary"
                        className="-top-2 -right-2 absolute bg-green-100 px-1 py-0 text-green-700 text-xs"
                      >
                        推薦
                      </Badge>
                    )}
                    <IconComponent className="h-4 w-4" />
                    {app.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 提示訊息 */}
        <div className="rounded-lg bg-yellow-50 p-3">
          <div className="text-sm text-yellow-800">
            <strong>{config.tipTitle}</strong>
            {getTipContent()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
