import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';

export type PageContextType = 'user' | 'group' | 'root';

export interface PageContext {
  type: PageContextType;
  contextId?: string; // userId for user context, groupId for group context
  currentPage?: 'files' | 'todo' | 'settings';
  requiresAuth: boolean;
}

/**
 * Hook to detect the current page context (user, group, or root)
 * and extract relevant information like contextId and current page type
 */
export function usePageContext(): PageContext {
  const location = useLocation();

  return useMemo((): PageContext => {
    const pathname = location.pathname;

    // Root page
    if (pathname === '/') {
      return {
        type: 'root',
        requiresAuth: false,
      };
    }

    // Group pages: /group/$groupId/...
    const groupMatch = pathname.match(/^\/group\/([^/]+)(?:\/(.+))?$/);
    if (groupMatch) {
      const [, groupId, page] = groupMatch;
      return {
        type: 'group',
        contextId: groupId,
        currentPage: page as 'files' | 'todo' | undefined,
        requiresAuth: false, // Group pages don't require authentication
      };
    }

    // User pages: /$userId/...
    const userMatch = pathname.match(/^\/([^/]+)(?:\/(.+))?$/);
    if (userMatch) {
      const [, userId, page] = userMatch;
      return {
        type: 'user',
        contextId: userId,
        currentPage: page as 'files' | 'todo' | 'settings' | undefined,
        requiresAuth: true, // User pages require authentication
      };
    }

    // Default fallback
    return {
      type: 'root',
      requiresAuth: false,
    };
  }, [location.pathname]);
}
