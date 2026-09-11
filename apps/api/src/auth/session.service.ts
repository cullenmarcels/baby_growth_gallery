import { Inject, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Account } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { AuthService } from './auth.service.js';

export type AuthMethod = 'password' | 'code' | 'register';

@Injectable()
export class AuthSessionService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async establish(
    request: Request,
    account: Account,
    method: AuthMethod,
    remember: boolean,
  ): Promise<void> {
    await this.regenerate(request);
    const now = Date.now();
    const idleTimeoutMs = remember ? 7 * 86_400_000 : 12 * 3_600_000;
    const absoluteTimeoutMs = remember ? 30 * 86_400_000 : 24 * 3_600_000;
    request.session.accountId = account.id;
    request.session.authVersion = account.authVersion;
    request.session.authMethod = method;
    request.session.issuedAt = now;
    request.session.lastSeenAt = now;
    request.session.absoluteExpiresAt = now + absoluteTimeoutMs;
    request.session.idleTimeoutMs = idleTimeoutMs;
    request.session.cookie.maxAge = idleTimeoutMs;
    const activeFamilyId = await this.findFallbackFamily(account.id);
    if (activeFamilyId) request.session.activeFamilyId = activeFamilyId;
    await this.save(request);
  }

  async current(request: Request): Promise<Account> {
    const session = request.session;
    const now = Date.now();
    if (
      !session.accountId ||
      session.authVersion === undefined ||
      session.lastSeenAt === undefined ||
      session.absoluteExpiresAt === undefined ||
      session.idleTimeoutMs === undefined ||
      now > session.absoluteExpiresAt ||
      now - session.lastSeenAt > session.idleTimeoutMs
    ) {
      await this.destroy(request);
      throw this.unauthorized();
    }

    const account = await this.prisma.account.findUnique({ where: { id: session.accountId } });
    if (!account || account.status !== 'ACTIVE' || account.authVersion !== session.authVersion) {
      await this.destroy(request);
      throw this.unauthorized();
    }

    session.lastSeenAt = now;
    session.cookie.maxAge = Math.max(
      1,
      Math.min(session.idleTimeoutMs, session.absoluteExpiresAt - now),
    );
    await this.reconcileActiveFamily(request, account.id);
    await this.save(request);
    return account;
  }

  summary(account: Account): {
    id: string;
    displayName: string | null;
    phoneMasked: string;
    activeFamilyId: string | null;
  } {
    return {
      id: account.id,
      displayName: account.displayName,
      phoneMasked: this.auth.maskPhone(account.phoneE164),
      activeFamilyId: null,
    };
  }

  summaryForRequest(
    request: Request,
    account: Account,
  ): {
    id: string;
    displayName: string | null;
    phoneMasked: string;
    activeFamilyId: string | null;
  } {
    return { ...this.summary(account), activeFamilyId: request.session.activeFamilyId ?? null };
  }

  async setActiveFamily(request: Request, familyId: string | null): Promise<void> {
    if (familyId) request.session.activeFamilyId = familyId;
    else delete request.session.activeFamilyId;
    await this.save(request);
  }

  async reconcileActiveFamily(request: Request, accountId: string): Promise<string | null> {
    const currentId = request.session.activeFamilyId;
    if (currentId) {
      const current = await this.prisma.familyMembership.findUnique({
        where: { familyId_accountId: { familyId: currentId, accountId } },
        select: { status: true },
      });
      if (current?.status === 'ACTIVE') return currentId;
    }
    const fallback = await this.findFallbackFamily(accountId);
    if (fallback) request.session.activeFamilyId = fallback;
    else delete request.session.activeFamilyId;
    return fallback;
  }

  async logout(request: Request, response: Response): Promise<void> {
    await this.destroy(request);
    response.clearCookie(this.config.auth.cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.auth.cookieSecure,
      path: '/',
    });
  }

  private regenerate(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      request.session.regenerate((error) =>
        error
          ? reject(error instanceof Error ? error : new Error('Session regenerate failed'))
          : resolve(),
      );
    });
  }

  private save(request: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      request.session.save((error) =>
        error
          ? reject(error instanceof Error ? error : new Error('Session save failed'))
          : resolve(),
      );
    });
  }

  private destroy(request: Request): Promise<void> {
    return new Promise((resolve) => {
      if (!request.session) {
        resolve();
        return;
      }
      request.session.destroy(() => resolve());
    });
  }

  private async findFallbackFamily(accountId: string): Promise<string | null> {
    const membership = await this.prisma.familyMembership.findFirst({
      where: { accountId, status: 'ACTIVE' },
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
      select: { familyId: true },
    });
    return membership?.familyId ?? null;
  }

  private unauthorized(): ApiProblemException {
    return new ApiProblemException(401, 'Authentication is required.', 'SESSION_REQUIRED');
  }
}
