import { and, asc, desc, eq, like, lt } from 'drizzle-orm';

/**
 * 分頁參數介面
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filter?: string;
}

/**
 * 時間範圍參數介面
 */
export interface TimeRangeParams {
  startTime?: string;
  endTime?: string;
}

/**
 * 查詢條件構建器
 */
export class QueryBuilder {
  private conditions: any[] = [];

  /**
   * 添加等值條件
   */
  whereEqual(field: any, value: any) {
    if (value !== undefined && value !== null) {
      this.conditions.push(eq(field, value));
    }
    return this;
  }

  /**
   * 添加小於條件
   */
  whereLessThan(field: any, value: any) {
    if (value !== undefined && value !== null) {
      this.conditions.push(lt(field, value));
    }
    return this;
  }

  /**
   * 添加模糊搜尋條件
   */
  wherelike(field: any, value?: string) {
    if (value && value.trim()) {
      this.conditions.push(like(field, `%${value}%`));
    }
    return this;
  }

  /**
   * 添加時間範圍條件
   */
  whereTimeRange(startField: any, endField: any, timeRange: TimeRangeParams) {
    if (timeRange.startTime) {
      this.conditions.push(eq(startField, new Date(timeRange.startTime)));
    }
    if (timeRange.endTime) {
      this.conditions.push(lt(endField, new Date(timeRange.endTime)));
    }
    return this;
  }

  /**
   * 獲取所有條件
   */
  getConditions() {
    return this.conditions.length > 0 ? and(...this.conditions) : undefined;
  }
}

/**
 * 構建分頁查詢
 */
export const buildPaginatedQuery = <T>(
  baseQuery: any,
  params: PaginationParams,
  sortMappings: Record<string, any>,
) => {
  const offset = (params.page - 1) * params.limit;

  // 應用分頁
  let query = baseQuery.limit(params.limit).offset(offset);

  // 應用排序
  if (params.sort && sortMappings[params.sort]) {
    const sortField = sortMappings[params.sort];
    query = query.orderBy(params.order === 'desc' ? desc(sortField) : asc(sortField));
  }

  return query;
};

/**
 * 計算分頁資訊
 */
export const calculatePagination = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * 通用的檔案排序映射
 */
export const FILE_SORT_MAPPINGS = {
  name: 'fileName',
  size: 'fileSize',
  date: 'createdAt',
  type: 'mimeType',
} as const;

/**
 * 通用的事件排序映射
 */
export const EVENT_SORT_MAPPINGS = {
  title: 'title',
  start: 'start',
  end: 'end',
  date: 'createdAt',
} as const;
