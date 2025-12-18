import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { ApiError } from '../responses/api-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : 500;

    const errResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as
            | { message: string | string[]; [key: string]: any }
            | string)
        : { message: 'Internal server error', stack: exception.stack };

    const message =
      typeof errResponse === 'string'
        ? errResponse
        : Array.isArray(errResponse.message)
        ? errResponse.message.join(', ')
        : errResponse.message || 'Error occurred';

    const errorBody = new ApiError(
      status,
      message,
    );

    return response.status(status).json(errorBody);
  }
}