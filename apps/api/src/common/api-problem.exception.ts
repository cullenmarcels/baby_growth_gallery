import { HttpException } from '@nestjs/common';

export interface FieldViolation {
  field: string;
  code: string;
}

export class ApiProblemException extends HttpException {
  constructor(status: number, detail: string, code: string, violations?: FieldViolation[]) {
    super({ detail, code, ...(violations ? { violations } : {}) }, status);
  }
}
