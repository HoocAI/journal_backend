import type { PaginationParams, PaginatedResult } from '../types';

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Creates pagination parameters with defaults and validation
 */
export function createPaginationParams(
    page?: number,
    limit?: number
): PaginationParams {
    const validPage = Math.max(1, page ?? DEFAULT_PAGE);
    const validLimit = Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));

    return {
        page: validPage,
        limit: validLimit,
    };
}

/**
 * Calculates the offset for database queries based on pagination params
 */
export function calculateOffset(params: PaginationParams): number {
    return (params.page - 1) * params.limit;
}

/**
 * Creates a paginated result from data and total count
 */
export function createPaginatedResult<T>(
    data: T[],
    totalItems: number,
    params: PaginationParams
): PaginatedResult<T> {
    const totalPages = Math.ceil(totalItems / params.limit);

    return {
        data,
        pagination: {
            page: params.page,
            limit: params.limit,
            totalItems,
            totalPages,
            hasNextPage: params.page < totalPages,
            hasPreviousPage: params.page > 1,
        },
    };
}

/**
 * Validates pagination parameters and returns normalized values
 */
export function normalizePaginationParams(
    page: unknown,
    limit: unknown
): PaginationParams {
    const parsedPage = typeof page === 'number' ? page : parseInt(String(page), 10);
    const parsedLimit = typeof limit === 'number' ? limit : parseInt(String(limit), 10);

    return createPaginationParams(
        isNaN(parsedPage) ? undefined : parsedPage,
        isNaN(parsedLimit) ? undefined : parsedLimit
    );
}
