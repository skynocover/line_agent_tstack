/**
 * 認證相關工具函數
 * 統一處理用戶認證邏輯，避免重複代碼
 */

// 檢查用戶認證和ID匹配
export const checkUserAuth = (context: any, userId: string): void => {
  if (!context.liffUser || context.liffUser.userId !== userId) {
    throw new Error('Unauthorized: User ID mismatch');
  }
};

// 檢查群組事件的條件認證
export const checkGroupEventAuth = (
  context: any,
  input: { groupId?: string; userId: string },
): void => {
  const isGroupEvent = input.groupId || false;

  if (!isGroupEvent) {
    // 個人事件需要驗證用戶權限
    checkUserAuth(context, input.userId);
  }
  // 群組事件不需要認證
};

// 高階函數：為需要用戶認證的處理器添加認證檢查
export const withUserAuth = <T extends { userId: string }>(
  handler: (input: T, context: any) => Promise<any>,
) => {
  return async ({ input, context }: { input: T; context: any }) => {
    console.log('withUserAuth', input.userId, context.liffUser.userId);
    checkUserAuth(context, input.userId);
    return await handler(input, context);
  };
};

// 高階函數：為混合上下文（用戶/群組）事件添加條件認證
export const withConditionalAuth = <T extends { groupId?: string; userId: string }>(
  handler: (input: T, context: any) => Promise<any>,
) => {
  return async ({ input, context }: { input: T; context: any }) => {
    checkGroupEventAuth(context, input);
    return await handler(input, context);
  };
};

// 檢查實體存在性（用於確認事件或檔案所有權）
export const checkEntityAccess = async (
  getEntityFn: () => Promise<any>,
  requiredFields: Record<string, any>,
): Promise<any> => {
  const entity = await getEntityFn();

  if (!entity) {
    throw new Error('Entity not found');
  }

  // 檢查必要欄位
  for (const [field, value] of Object.entries(requiredFields)) {
    if (entity[field] !== value) {
      throw new Error(`Unauthorized: ${field} mismatch`);
    }
  }

  return entity;
};
