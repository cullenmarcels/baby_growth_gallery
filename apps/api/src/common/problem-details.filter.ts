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
  code?: string;
  violations?: Array<{ field: string; code: string }>;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const metadata = this.getMetadata(exception, status);
    const traceId =
      request.id ??
      request.header('x-request-id') ??
      response.getHeader('x-request-id')?.toString() ??
      'unknown';

    const problem: ApiProblem = {
      type: `https://httpstatuses.com/${status}`,
      title: status === 503 ? 'Service Unavailable' : 'Request Failed',
      status,
      detail: metadata.detail,
      instance: request.originalUrl,
      traceId,
      ...(metadata.code ? { code: metadata.code } : {}),
      ...(metadata.violations ? { violations: metadata.violations } : {}),
    };

    if (status === 500) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Unhandled request failure',
          errorType: exception instanceof Error ? exception.name : 'UnknownError',
          traceId,
          instance: request.originalUrl,
        }),
      );
    }

    response.status(status).type('application/problem+json').send(problem);
  }

  private getMetadata(
    exception: unknown,
    status: number,
  ): { detail: string; code?: string; violations?: Array<{ field: string; code: string }> } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return { detail: response };
      if (typeof response === 'object' && response !== null) {
        const record = response as Record<string, unknown>;
        const detailValue = record.detail ?? record.message;
        const detail = Array.isArray(detailValue)
          ? detailValue.join('; ')
          : typeof detailValue === 'string'
            ? detailValue
            : 'The request could not be completed.';
        const code = typeof record.code === 'string' ? record.code : undefined;
        const violations = Array.isArray(record.violations)
          ? (record.violations as Array<{ field: string; code: string }>)
          : undefined;
        return { detail, ...(code ? { code } : {}), ...(violations ? { violations } : {}) };
      }
    }

    return {
      detail:
        status === 500 ? 'An unexpected error occurred.' : 'The request could not be completed.',
    };
  }
}
