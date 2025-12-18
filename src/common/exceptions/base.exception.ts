import { HttpException } from '@nestjs/common';

export class BaseException extends HttpException {
  constructor(
    message: string,
    statusCode: number = 400,
    stack?: any,
  ) {
    super(
      {
        message,
        statusCode,
        stack,
      },
      statusCode,
    );
  }

  static badRequest(message = 'Bad request') {
    return new BaseException(message, 400);
  }

  static notFound(message = 'Not found') {
    return new BaseException(message, 404);
  }

  static unauthorized(message = 'Unauthorized') {
    return new BaseException(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new BaseException(message, 403);
  }

  static internal(message = 'Internal server error', stack?: any) {
    return new BaseException(message, 500, stack);
  }
}
