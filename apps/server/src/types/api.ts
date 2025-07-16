import type { files } from '../db/schema';

export type File = typeof files.$inferSelect;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetUserFilesResponse {
  data: File[];
  pagination: PaginationResponse;
}

export interface ErrorResponse {
  error: string;
}
