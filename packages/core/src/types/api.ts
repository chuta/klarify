// Canonical API response envelopes — CLAUDE.md §15.

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: PaginationMeta;
}

export interface ApiError {
  readonly success: false;
  readonly error: string;
  readonly code: string;
  readonly details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Citation {
  readonly regulation: string;
  readonly section: string;
  readonly url?: string;
}
