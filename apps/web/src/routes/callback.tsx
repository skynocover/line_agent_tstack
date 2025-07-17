import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { z } from 'zod';
import { useAuthStore } from '@/features/auth/authStore';
import { initLiff } from '@/features/line/liff';

const CallbackPage = () => {
  const navigate = useNavigate();
  const { setAuth, setError, setLoading } = useAuthStore();
  const search = Route.useSearch();

  useEffect(() => {
    const handleCallback = async () => {
      setLoading(true);

      try {
        // 初始化 LIFF
        await initLiff();

        // 檢查是否已登入
        const liff = await import('@line/liff');
        const liffInstance = liff.default;

        if (liffInstance.isLoggedIn()) {
          // 獲取用戶資訊
          const profile = await liffInstance.getProfile();
          const accessToken = liffInstance.getAccessToken();

          if (profile && accessToken) {
            setAuth(profile, accessToken);

            // 根據 from 參數決定重定向位置
            const redirectPath = getRedirectPath(search.from, profile.userId);
            navigate({ to: redirectPath });
          } else {
            throw new Error('無法獲取用戶資訊');
          }
        } else {
          throw new Error('用戶未登入');
        }
      } catch (error) {
        console.error('Callback handling failed:', error);
        setError(error instanceof Error ? error.message : '登入失敗');
        // 登入失敗時重定向到首頁
        navigate({ to: '/' });
      }
    };

    handleCallback();
  }, [search.from, navigate, setAuth, setError, setLoading]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-gray-600">正在處理登入...</p>
      </div>
    </div>
  );
};

// 根據 from 參數和用戶 ID 決定重定向路徑
const getRedirectPath = (from: string | undefined, userId: string): string => {
  if (!from || from === 'home') {
    return '/';
  }

  // 個人頁面路由映射
  const personalRoutes: Record<string, string> = {
    files: `/${userId}/files`,
    todo: `/${userId}/todo`,
    settings: `/${userId}/settings`,
  };

  // 群組頁面路由映射 (需要從 from 參數中提取 groupId)
  const groupRouteMatch = from.match(/^group-(.+)-(files|todo)$/);
  if (groupRouteMatch) {
    const [, groupId, page] = groupRouteMatch;
    return `/group/${groupId}/${page}`;
  }

  // 如果是個人頁面
  if (personalRoutes[from]) {
    return personalRoutes[from];
  }

  // 默認回到首頁
  return '/';
};

export const Route = createFileRoute('/callback')({
  component: CallbackPage,
  validateSearch: z.object({
    from: z.string().optional(),
  }),
});
