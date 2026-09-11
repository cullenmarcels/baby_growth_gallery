import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiProblemDto } from '../health/health.dto.js';
import { AuthService } from './auth.service.js';
import {
  AccountSummaryDto,
  CodeLoginRequestDto,
  CsrfTokenResponseDto,
  PasswordLoginRequestDto,
  PasswordResetRequestDto,
  RegisterRequestDto,
  VerificationChallengeRequestDto,
  VerificationChallengeResponseDto,
} from './auth.dto.js';
import {
  codeLoginSchema,
  parseBody,
  passwordLoginSchema,
  passwordResetSchema,
  registerSchema,
  verificationChallengeSchema,
} from './auth.schemas.js';
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
  @ApiOperation({ summary: 'Create or reuse an anonymous session and return its CSRF token' })
  @ApiResponse({ status: 200, type: CsrfTokenResponseDto })
  csrf(@Req() request: Request): CsrfTokenResponseDto {
    return { csrfToken: request.csrfToken!() };
  }

  @Post('verification-challenges')
  @HttpCode(202)
  @ApiBody({ type: VerificationChallengeRequestDto })
  @ApiResponse({ status: 202, type: VerificationChallengeResponseDto })
  async createChallenge(
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<VerificationChallengeResponseDto> {
    const input = parseBody(verificationChallengeSchema, body);
    return this.auth.createChallenge(input.phone, input.purpose, request.ip ?? 'unknown');
  }

  @Post('register')
  @ApiBody({ type: RegisterRequestDto })
  @ApiResponse({ status: 201, type: AccountSummaryDto })
  async register(@Body() body: unknown, @Req() request: Request): Promise<AccountSummaryDto> {
    const input = parseBody(registerSchema, body);
    const account = await this.auth.register(input);
    await this.sessions.establish(request, account, 'register', false);
    return this.sessions.summaryForRequest(request, account);
  }

  @Post('login/password')
  @HttpCode(200)
  @ApiBody({ type: PasswordLoginRequestDto })
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async loginPassword(@Body() body: unknown, @Req() request: Request): Promise<AccountSummaryDto> {
    const input = parseBody(passwordLoginSchema, body);
    const account = await this.auth.loginWithPassword(
      input.phone,
      input.password,
      request.ip ?? 'unknown',
    );
    await this.sessions.establish(request, account, 'password', input.remember);
    return this.sessions.summaryForRequest(request, account);
  }

  @Post('login/code')
  @HttpCode(200)
  @ApiBody({ type: CodeLoginRequestDto })
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async loginCode(@Body() body: unknown, @Req() request: Request): Promise<AccountSummaryDto> {
    const input = parseBody(codeLoginSchema, body);
    const account = await this.auth.loginWithCode(input);
    await this.sessions.establish(request, account, 'code', input.remember);
    return this.sessions.summaryForRequest(request, account);
  }

  @Get('session')
  @ApiCookieAuth()
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async session(@Req() request: Request): Promise<AccountSummaryDto> {
    return this.sessions.summaryForRequest(request, await this.sessions.current(request));
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiResponse({ status: 204 })
  async logout(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.sessions.logout(request, response);
    response.status(204).send();
  }

  @Post('password/reset')
  @HttpCode(204)
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiResponse({ status: 204 })
  async resetPassword(
    @Body() body: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const input = parseBody(passwordResetSchema, body);
    await this.auth.resetPassword(input);
    await this.sessions.logout(request, response);
    response.status(204).send();
  }
}
