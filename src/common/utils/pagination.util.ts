export class PaginationUtil {
  static validate(page: number, limit: number): void {
    if (page < 1 || limit < 1) {
      throw new Error('Page and limit must be greater than 0');
    }
  }

  static getMeta(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }
}
