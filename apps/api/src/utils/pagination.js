import { z } from 'zod';

export const MAX_PAGE_SIZE = 50;

// Query schema for every list endpoint: ?page=1&pageSize=20
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export const toRange = ({ page, pageSize }) => ({
  from: (page - 1) * pageSize,
  to: page * pageSize - 1, // inclusive, as used by Supabase .range()
});

export const paginationMeta = ({ page, pageSize }, total) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});
