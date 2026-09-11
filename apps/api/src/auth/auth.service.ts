import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { hash, verify, argon2id } from 'argon2';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { Account } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { RedisService } from '../infrastructure/redis.service.js';
import { AuthRateLimitService } from './rate-limit.service.js';
import { VerificationDeliveryService } from './verification-delivery.service.js';

export type VerificationPurpose = 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD';

interface ChallengeInput {
  phone: string;
  challengeId: string;
  code: string;
}

@Injectable()
export class AuthService {
  private readonly dummyHash = this.hashPassword('dummy-password-value');

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(AuthRateLimitService) private readonly rateLimits: AuthRateLimitService,
    @Inject(VerificationDeliveryService) private readonly delivery: VerificationDeliveryService,
  ) {}

  async createChallenge(
    rawPhone: string,
    purpose: VerificationPurpose,
    ip: string,
  ): Promise<{ challengeId: string; expiresInSeconds: 300; resendAfterSeconds: 60 }> {
    const phoneE164 = this.normalizePhone(rawPhone);
    const phoneDigest = this.digest(`phone:${phoneE164}`);
    const ipDigest = this.digest(`ip:${ip}`);
    await this.rateLimits.consumeCodeRequest(phoneDigest, purpose, ipDigest);
    await this.redis.ensureConnected();

    const challengeId = randomUUID();
    const code =
      this.config.auth.verificationDeliveryMode === 'fixed'
        ? this.config.auth.testVerificationCode!
        : randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeDigest = this.digest(`code:${challengeId}:${purpose}:${code}`);
    const challengeKey = this.challengeKey(challengeId);
    const indexKey = this.challengeIndexKey(phoneDigest, purpose);

    await this.redis.client.eval(
      `redis.call('HSET', KEYS[1], 'phoneDigest', ARGV[1], 'purpose', ARGV[2], 'codeDigest', ARGV[3], 'attempts', '0')
       redis.call('EXPIRE', KEYS[1], 300)
       redis.call('SET', KEYS[2], ARGV[4], 'EX', 300)
       return 1`,
      {
        keys: [challengeKey, indexKey],
        arguments: [phoneDigest, purpose, codeDigest, challengeId],
      },
    );

    try {
      await this.delivery.send(phoneE164, purpose, code);
    } catch (error) {
      await this.revokeChallenge(challengeKey, indexKey, challengeId);
      throw error;
    }

    return { challengeId, expiresInSeconds: 300, resendAfterSeconds: 60 };
  }

  async register(input: {
    phone: string;
    challengeId: string;
    code: string;
    password: string;
    termsVersion: string;
    privacyVersion: string;
  }): Promise<Account> {
    const phoneE164 = this.normalizePhone(input.phone);
    await this.consumeChallenge(input, phoneE164, 'REGISTER');
    const passwordHash = await this.hashPassword(input.password);
    const now = new Date();
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const account = await transaction.account.create({
          data: {
            phoneE164,
            passwordHash,
            phoneVerifiedAt: now,
            passwordChangedAt: now,
          },
        });
        await transaction.legalAcceptance.create({
          data: {
            accountId: account.id,
            termsVersion: input.termsVersion,
            privacyVersion: input.privacyVersion,
          },
        });
        return account;
      });
    } catch {
      throw this.neutralAuthError(409);
    }
  }

  async loginWithPassword(rawPhone: string, password: string, ip: string): Promise<Account> {
    const phoneE164 = this.normalizePhone(rawPhone);
    const accountKey = this.digest(`phone:${phoneE164}`);
    const ipKey = this.digest(`ip:${ip}`);
    await this.rateLimits.consumePasswordAttempt(accountKey, ipKey);
    const account = await this.prisma.account.findUnique({ where: { phoneE164 } });
    const passwordHash = account?.passwordHash ?? (await this.dummyHash);
    const valid = await verify(passwordHash, password).catch(() => false);
    if (!account || account.status !== 'ACTIVE' || !valid) throw this.neutralAuthError(401);
    await this.rateLimits.clearPasswordAccount(accountKey);
    return account;
  }

  async loginWithCode(input: ChallengeInput): Promise<Account> {
    const phoneE164 = this.normalizePhone(input.phone);
    await this.consumeChallenge(input, phoneE164, 'LOGIN');
    const account = await this.prisma.account.findUnique({ where: { phoneE164 } });
    if (!account || account.status !== 'ACTIVE') throw this.neutralAuthError(401);
    return account;
  }

  async resetPassword(input: ChallengeInput & { newPassword: string }): Promise<void> {
    const phoneE164 = this.normalizePhone(input.phone);
    await this.consumeChallenge(input, phoneE164, 'RESET_PASSWORD');
    const passwordHash = await this.hashPassword(input.newPassword);
    const result = await this.prisma.account.updateMany({
      where: { phoneE164, status: 'ACTIVE' },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        authVersion: { increment: 1 },
      },
    });
    if (result.count !== 1) throw this.neutralAuthError(400);
  }

  normalizePhone(rawPhone: string): string {
    const parsed = parsePhoneNumberFromString(rawPhone, 'CN');
    if (!parsed?.isValid() || parsed.country !== 'CN' || !/^\+861[3-9]\d{9}$/.test(parsed.number)) {
      throw new ApiProblemException(400, 'Please enter a valid mobile number.', 'PHONE_INVALID', [
        { field: 'phone', code: 'invalid_phone' },
      ]);
    }
    return parsed.number;
  }

  maskPhone(phoneE164: string): string {
    const national = phoneE164.startsWith('+86') ? phoneE164.slice(3) : phoneE164;
    return `+86 ${national.slice(0, 3)}****${national.slice(-4)}`;
  }

  private async consumeChallenge(
    input: ChallengeInput,
    phoneE164: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    await this.redis.ensureConnected();
    const phoneDigest = this.digest(`phone:${phoneE164}`);
    const codeDigest = this.digest(`code:${input.challengeId}:${purpose}:${input.code}`);
    const result = await this.redis.client.eval(
      `if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
       if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
       local storedPhone = redis.call('HGET', KEYS[1], 'phoneDigest')
       local storedPurpose = redis.call('HGET', KEYS[1], 'purpose')
       local storedCode = redis.call('HGET', KEYS[1], 'codeDigest')
       if storedPhone ~= ARGV[2] or storedPurpose ~= ARGV[3] or storedCode ~= ARGV[4] then
         local attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
         if attempts >= 5 then redis.call('DEL', KEYS[1], KEYS[2]); return -2 end
         return -1
       end
       redis.call('DEL', KEYS[1], KEYS[2])
       return 1`,
      {
        keys: [this.challengeKey(input.challengeId), this.challengeIndexKey(phoneDigest, purpose)],
        arguments: [input.challengeId, phoneDigest, purpose, codeDigest],
      },
    );
    if (Number(result) === 1) return;
    if (Number(result) === -2) {
      throw new ApiProblemException(
        400,
        'The verification code can no longer be used.',
        'VERIFICATION_ATTEMPTS_EXHAUSTED',
      );
    }
    throw new ApiProblemException(
      400,
      'The verification code is invalid or expired.',
      'VERIFICATION_INVALID',
    );
  }

  private async revokeChallenge(
    challengeKey: string,
    indexKey: string,
    challengeId: string,
  ): Promise<void> {
    await this.redis.client.eval(
      `redis.call('DEL', KEYS[1])
       if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('DEL', KEYS[2]) end
       return 1`,
      { keys: [challengeKey, indexKey], arguments: [challengeId] },
    );
  }

  private challengeKey(challengeId: string): string {
    return `${this.redis.prefix}:verification:challenge:${challengeId}`;
  }

  private challengeIndexKey(phoneDigest: string, purpose: VerificationPurpose): string {
    return `${this.redis.prefix}:verification:index:${phoneDigest}:${purpose}`;
  }

  private digest(value: string): string {
    return createHmac('sha256', this.config.auth.hmacSecret).update(value).digest('hex');
  }

  private hashPassword(password: string): Promise<string> {
    return hash(password, { type: argon2id, memoryCost: 19 * 1_024, timeCost: 2, parallelism: 1 });
  }

  private neutralAuthError(status: 400 | 401 | 409): ApiProblemException {
    return new ApiProblemException(
      status,
      'The authentication request could not be completed.',
      'AUTH_REQUEST_INVALID',
    );
  }
}
