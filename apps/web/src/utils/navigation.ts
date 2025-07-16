import { CheckSquare, FileText, Home, Settings } from 'lucide-react';
import type { PageContext } from '@/hooks/usePageContext';

export interface NavigationItem {
  to: string;
  icon: typeof Home;
  label: string;
  description: string;
  color: 'blue' | 'green' | 'amber' | 'purple' | 'gray';
  requireAuth: boolean;
  params?: Record<string, string>;
}

/**
 * Generate navigation items based on the current page context
 */
export function generateNavigationItems(
  context: PageContext,
  isAuthenticated: boolean,
): NavigationItem[] {
  const baseItems: NavigationItem[] = [
    {
      to: '/',
      icon: Home,
      label: '首頁',
      description: '回到主頁面',
      color: 'blue',
      requireAuth: false,
    },
  ];

  // For user context, add user-specific navigation
  if (context.type === 'user' && context.contextId) {
    const userItems: NavigationItem[] = [
      {
        to: '/$userId/files',
        icon: FileText,
        label: '檔案管理',
        description: '管理您的檔案',
        color: 'amber',
        requireAuth: true,
        params: { userId: context.contextId },
      },
      {
        to: '/$userId/todo',
        icon: CheckSquare,
        label: '待辦清單',
        description: '管理您的任務',
        color: 'purple',
        requireAuth: true,
        params: { userId: context.contextId },
      },
      {
        to: '/$userId/settings',
        icon: Settings,
        label: '設定',
        description: '管理系統設定',
        color: 'gray',
        requireAuth: true,
        params: { userId: context.contextId },
      },
    ];

    return [...baseItems, ...userItems];
  }

  // For group context, add group-specific navigation
  if (context.type === 'group' && context.contextId) {
    const groupItems: NavigationItem[] = [
      {
        to: '/group/$groupId/files',
        icon: FileText,
        label: '群組檔案',
        description: '管理群組檔案',
        color: 'amber',
        requireAuth: false,
        params: { groupId: context.contextId },
      },
      {
        to: '/group/$groupId/todo',
        icon: CheckSquare,
        label: '群組行事曆',
        description: '管理群組事件',
        color: 'purple',
        requireAuth: false,
        params: { groupId: context.contextId },
      },
    ];

    return [...baseItems, ...groupItems];
  }

  // For root context, only show home
  return baseItems;
}

/**
 * Filter navigation items based on authentication status
 */
export function filterNavigationItems(
  items: NavigationItem[],
  isAuthenticated: boolean,
): NavigationItem[] {
  return items.filter((item) => {
    if (!item.requireAuth) return true;
    return isAuthenticated;
  });
}

/**
 * Get link props for TanStack Router Link component
 */
export function getLinkProps(item: NavigationItem) {
  if (item.params) {
    return {
      to: item.to,
      params: item.params,
    };
  }

  return {
    to: item.to,
  };
}
