import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log the actual error for developers
    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${
        exception.message || 'Unknown Error'
      }`,
      exception.stack,
    );

    // Prepare a refined "Luxury" error message for the client
    let message = 'Something went wrong on our end. Please try again later.';
    let detail = null;

    if (exception instanceof HttpException) {
      const res = exception.getResponse() as any;
      message = typeof res === 'string' ? res : res.message || message;
    } else if (exception.code === 'P2002') {
      message = 'This information is already in our system.';
      status = HttpStatus.CONFLICT;
    } else if (exception.code?.startsWith('P')) {
      // General Prisma errors
      message = 'Our website is very busy right now. Please wait a moment and try again.';
      if (process.env.NODE_ENV !== 'production') detail = exception.message;
    }

    const isDev = process.env.NODE_ENV !== 'production';

    const payload: any = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
    };

    if (isDev) {
      payload.errorName = exception.name;
      payload.errorMessage = exception.message;
      payload.errorStack = exception.stack;
      payload.detail = detail || exception.message;
    }

    response.status(status).json(payload);
  }
}
