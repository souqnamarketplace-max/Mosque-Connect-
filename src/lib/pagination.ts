import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** Parses page/pageSize from a URLSearchParams, clamping pageSize to a
 * sane max (100) so a caller can't request an unbounded amount of rows. */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  return parsed.success ? parsed.data : { page: 1, pageSize: 25 };
}

/** Returns the [from, to] row range for Supabase's .range(from, to), which
 * is inclusive on both ends. */
export function rangeFor({ page, pageSize }: PaginationParams): [number, number] {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return [from, to];
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function buildPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / params.pageSize)),
  };
}
