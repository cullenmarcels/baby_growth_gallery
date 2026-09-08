import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RequestWithId extends Request {
  id?: string;
}

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId: string;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = this.getDetail(exception, status);
    const traceId =
      request.id ??
      request.header('x-request-id') ??
      response.getHeader('x-request-id')?.toString() ??
      'unknown';

    const problem: ApiProblem = {
      type: `https://httpstatuses.com/${status}`,
      title: status === 503 ? 'Service Unavailable' : 'Request Failed',
      status,
      detail,
      instance: request.originalUrl,
      traceId,
    };

    response.status(status).type('application/problem+json').send(problem);
  }

  private getDetail(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const message = response.message;
        return Array.isArray(message) ? message.join('; ') : String(message);
      }
    }

    return status === 500 ? 'An unexpected error occurred.' : 'The request could not be completed.';
  }
}
