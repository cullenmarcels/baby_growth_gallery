import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { verify } from 'argon2';
import type { Account } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { LEGAL_DRAFT_VERSION } from './auth.schemas.js';
import { hashPassword } from './password.js';
import { AuthRateLimitService } from './rate-limit.service.js';

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword('dummy-password-value');

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthRateLimitService) private readonly rateLimits: AuthRateLimitService,
  ) {}

  async loginWithPassword(username: string, password: string, ip: string): Promise<Account> {
    const accountKey = this.digest(`account:${username}`);
    await this.rateLimits.consumePasswordAttempt(accountKey, this.digest(`ip:${ip}`));
    const account = await this.prisma.account.findUnique({ where: { username } });
    const valid = await verify(account?.passwordHash ?? (await this.dummyHash), password).catch(
      () => false,
    );
    if (
      !account ||
      account.status !== 'ACTIVE' ||
      !valid ||
      (account.temporaryPasswordExpiresAt && account.temporaryPasswordExpiresAt <= new Date())
    ) {
      throw this.invalidCredentials();
    }
    await this.rateLimits.clearPasswordAccount(accountKey);
    return account;
  }

  async changePassword(
    account: Account,
    input: { currentPassword: string; newPassword: string; acceptTerms: boolean },
    ip: string,
  ): Promise<Account> {
    const accountKey = this.digest(`account:${account.username}`);
    await this.rateLimits.consumePasswordAttempt(accountKey, this.digest(`ip:${ip}`));
    if (!(await verify(account.passwordHash, input.currentPassword).catch(() => false))) {
      throw this.invalidCredentials(400);
    }
    await this.rateLimits.clearPasswordAccount(accountKey);
    const mustAcceptTerms = account.acceptedLegalVersion !== LEGAL_DRAFT_VERSION;
    if (mustAcceptTerms && !input.acceptTerms) {
      throw new ApiProblemException(400, 'Accept the current terms first.', 'TERMS_REQUIRED');
    }
    const passwordHash = await hashPassword(input.newPassword);
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const result = await transaction.account.updateMany({
        where: {
          id: account.id,
          status: 'ACTIVE',
          authVersion: account.authVersion,
          OR: [{ temporaryPasswordExpiresAt: null }, { temporaryPasswordExpiresAt: { gt: now } }],
        },
        data: {
          passwordHash,
          passwordChangedAt: now,
          temporaryPasswordExpiresAt: null,
          // Reusing a family-issued password keeps the issuer-related access restrictions.
          familyIssuedPassword:
            account.familyIssuedPassword && input.currentPassword === input.newPassword,
          acceptedLegalVersion: LEGAL_DRAFT_VERSION,
          authVersion: { increment: 1 },
        },
      });
      if (result.count !== 1) throw this.invalidCredentials();
      if (mustAcceptTerms) {
        await transaction.legalAcceptance.create({
          data: {
            accountId: account.id,
            termsVersion: LEGAL_DRAFT_VERSION,
            privacyVersion: LEGAL_DRAFT_VERSION,
          },
        });
      }
      return transaction.account.findUniqueOrThrow({ where: { id: account.id } });
    });
  }

  private digest(value: string): string {
    return createHmac('sha256', this.config.auth.hmacSecret).update(value).digest('hex');
  }

  private invalidCredentials(status: 400 | 401 = 401): ApiProblemException {
    return new ApiProblemException(status, 'Invalid credentials.', 'AUTH_REQUEST_INVALID');
  }
}
