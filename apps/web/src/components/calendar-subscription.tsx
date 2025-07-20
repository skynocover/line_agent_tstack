import { Apple, Calendar, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';

interface CalendarSubscriptionProps {
  userId?: string;
  groupId?: string;
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

// 生成6位隨機英文數字字符串
const generateRandomToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const CalendarSubscription = ({ userId, groupId }: CalendarSubscriptionProps) => {
  // 判斷是否為群組模式
  const isGroupMode = !!groupId;
  const entityId = groupId || userId;

  if (!entityId) {
    throw new Error('必須提供 userId 或 groupId 其中之一');
  }

  // ICS URL - 根據模式生成不同路徑，並添加隨機token
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace('https://', 'webcal://');
  const randomToken = generateRandomToken();
  const icsUrl = isGroupMode
    ? `${apiBaseUrl}/ics/group/${groupId}?token=${randomToken}`
    : `${apiBaseUrl}/ics/${userId}?token=${randomToken}`;
  const platform = getPlatformInfo();

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
};
