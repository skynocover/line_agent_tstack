import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/features/line/liff';
import type { AppRouter } from '../../../server/src/routers/index';

// Query client with enhanced error handling
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Handle 401 errors globally
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Import authStore dynamically to avoid circular dependency
        import('@/features/auth/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().clearAuth();
          toast.error('登入已過期，請重新登入', {
            action: {
              label: '重新登入',
              onClick: () => {
                useAuthStore.getState().login();
              },
            },
          });
        });
        return;
      }

      // 一般錯誤處理
      toast.error(`Error: ${error.message}`, {
        action: {
          label: 'retry',
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

// Create RPC link with auth headers
export const link = new RPCLink({
  url: `${import.meta.env.VITE_API_BASE_URL}/rpc`,
  headers: () => getAuthHeaders(),
  fetch: async (url, options) => {
    const response = await fetch(url, options);

    // Handle 401 responses globally
    if (response.status === 401) {
      // Import authStore dynamically to avoid circular dependency
      const { useAuthStore } = await import('@/features/auth/authStore');
      useAuthStore.getState().clearAuth();

      // Create a more specific error message
      throw new Error('認證已過期 (401)');
    }

    // Handle server errors (500, 502, 503, etc.)
    if (response.status >= 500) {
      // Try to get the error message from the response
      let errorMessage = `伺服器錯誤 (${response.status})`;
      try {
        const errorData = await response.clone().json();

        // 檢查是否為 oRPC 錯誤格式
        if (errorData.json && errorData.json.data && errorData.json.data.type === 'validation') {
          // 優先使用 userMessage，然後是 message
          errorMessage =
            errorData.json.data.userMessage || errorData.json.data.message || errorMessage;
        } else if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.userMessage) {
            errorMessage = errorData.error.userMessage;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If we can't parse the error response, use the default message
        console.warn('Unable to parse error response:', e);
      }

      throw new Error(errorMessage);
    }

    // Handle client errors (400, 403, 404, etc.)
    if (response.status >= 400 && response.status < 500) {
      let errorMessage = `請求錯誤 (${response.status})`;
      try {
        const errorData = await response.clone().json();

        // 檢查是否為 oRPC 錯誤格式
        if (errorData.json && errorData.json.data && errorData.json.data.type === 'validation') {
          // 優先使用 userMessage，然後是 message
          errorMessage =
            errorData.json.data.userMessage || errorData.json.data.message || errorMessage;
        } else if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.userMessage) {
            errorMessage = errorData.error.userMessage;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If we can't parse the error response, use the default message
        console.warn('Unable to parse error response:', e);
      }

      throw new Error(errorMessage);
    }

    return response;
  },
});

// Create ORPC client
export const client: RouterClient<AppRouter> = createORPCClient(link);
