import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiProblemDto } from '../health/health.dto.js';
import { AuthService } from './auth.service.js';
import {
  AccountSummaryDto,
  CsrfTokenResponseDto,
  PasswordChangeRequestDto,
  PasswordLoginRequestDto,
} from './auth.dto.js';
import { parseBody, passwordChangeSchema, passwordLoginSchema } from './auth.schemas.js';
import { AuthSessionService } from './session.service.js';

const problemResponse = {
  'application/problem+json': { schema: { $ref: getSchemaPath(ApiProblemDto) } },
};

@ApiTags('auth')
@ApiExtraModels(ApiProblemDto)
@ApiResponse({ status: 400, content: problemResponse })
@ApiResponse({ status: 401, content: problemResponse })
@ApiResponse({ status: 403, content: problemResponse })
@ApiResponse({ status: 429, content: problemResponse })
@ApiResponse({ status: 503, content: problemResponse })
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @Get('csrf')
  @ApiResponse({ status: 200, type: CsrfTokenResponseDto })
  csrf(@Req() request: Request): CsrfTokenResponseDto {
    return { csrfToken: request.csrfToken!() };
  }

  @Post('login/password')
  @HttpCode(200)
  @ApiBody({ type: PasswordLoginRequestDto })
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async loginPassword(@Body() body: unknown, @Req() request: Request): Promise<AccountSummaryDto> {
    const input = parseBody(passwordLoginSchema, body);
    const account = await this.auth.loginWithPassword(
      input.username,
      input.password,
      request.ip ?? 'unknown',
    );
    await this.sessions.establish(request, account, input.remember);
    return this.sessions.summaryForRequest(request, account);
  }

  @Get('session')
  @ApiCookieAuth()
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async session(@Req() request: Request): Promise<AccountSummaryDto> {
    return this.sessions.summaryForRequest(request, await this.sessions.current(request, true));
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiResponse({ status: 204 })
  async logout(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.sessions.logout(request, response);
    response.status(204).send();
  }

  @Post('password/change')
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiBody({ type: PasswordChangeRequestDto })
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async changePassword(@Body() body: unknown, @Req() request: Request): Promise<AccountSummaryDto> {
    const account = await this.sessions.current(request, true);
    const input = parseBody(passwordChangeSchema, body);
    const updated = await this.auth.changePassword(account, input, request.ip ?? 'unknown');
    await this.sessions.establish(request, updated, false);
    return this.sessions.summaryForRequest(request, updated);
  }
}
