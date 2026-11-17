import { jest } from '@jest/globals';
import type { Account } from '../src/generated/prisma/client.js';
import { AuthService } from '../src/auth/auth.service.js';
import { hashPassword } from '../src/auth/password.js';
import type { AppConfig } from '../src/config/app-config.js';
import type { PrismaService } from '../src/infrastructure/prisma.service.js';
import type { AuthRateLimitService } from '../src/auth/rate-limit.service.js';

describe('managed credentials', () => {
  it('rejects an expired temporary password even when its hash matches', async () => {
    const passwordHash = await hashPassword('synthetic-temporary-password');
    const account = {
      username: '家庭成员',
      passwordHash,
      status: 'ACTIVE',
      temporaryPasswordExpiresAt: new Date(Date.now() - 1_000),
    };
    const config = { auth: { hmacSecret: 'test-only-hmac-value' } } as AppConfig;
    const prisma = {
      account: { findUnique: jest.fn().mockResolvedValue(account) },
    } as unknown as PrismaService;
    const limits = {
      consumePasswordAttempt: jest.fn().mockResolvedValue(undefined),
      clearPasswordAccount: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuthRateLimitService;
    const service = new AuthService(config, prisma, limits);
    await expect(
      service.loginWithPassword(account.username, 'synthetic-temporary-password', '127.0.0.1'),
    ).rejects.toMatchObject({ response: { code: 'AUTH_REQUEST_INVALID' } });
    expect(limits.clearPasswordAccount).not.toHaveBeenCalled();
  });
  it.each([
    ['synthetic-family-password', true],
    ['synthetic-personal-password', false],
  ])(
    'completes setup while keeping the issuing-family restriction when required',
    async (newPassword, restricted) => {
      const account = {
        id: 'synthetic-account',
        username: '家庭成员',
        passwordHash: await hashPassword('synthetic-family-password'),
        authVersion: 1,
        acceptedLegalVersion: null,
        temporaryPasswordExpiresAt: new Date(Date.now() + 60_000),
        familyIssuedPassword: true,
      } as Account;
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const transaction = {
        account: { updateMany, findUniqueOrThrow: jest.fn().mockResolvedValue(account) },
        legalAcceptance: { create: jest.fn().mockResolvedValue({}) },
      };
      const prisma = {
        $transaction: async (operation: (db: typeof transaction) => Promise<Account>) =>
          operation(transaction),
      } as unknown as PrismaService;
      const config = { auth: { hmacSecret: 'test-only-hmac-value' } } as AppConfig;
      const limits = {
        consumePasswordAttempt: jest.fn().mockResolvedValue(undefined),
        clearPasswordAccount: jest.fn().mockResolvedValue(undefined),
      } as unknown as AuthRateLimitService;
      const service = new AuthService(config, prisma, limits);
      await service.changePassword(
        account,
        {
          currentPassword: 'synthetic-family-password',
          newPassword,
          acceptTerms: true,
        },
        '127.0.0.1',
      );
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyIssuedPassword: restricted,
            temporaryPasswordExpiresAt: null,
            authVersion: { increment: 1 },
          }),
        }),
      );
      expect(transaction.legalAcceptance.create).toHaveBeenCalledTimes(1);
    },
  );
});
