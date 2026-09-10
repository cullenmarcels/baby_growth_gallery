import { Inject, Injectable } from '@nestjs/common';
import { RateLimiterRedis, type RateLimiterRes } from 'rate-limiter-flexible';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { RedisService } from '../infrastructure/redis.service.js';

@Injectable()
export class AuthRateLimitService {
  private readonly codePhoneMinute;
  private readonly codePhoneHour;
  private readonly codePhoneDay;
  private readonly codeIpHour;
  private readonly passwordAccount;
  private readonly passwordIp;

  constructor(@Inject(RedisService) private readonly redis: RedisService) {
    const common = {
      storeClient: redis.client,
      useRedisPackage: true,
      rejectIfRedisNotReady: true,
    };
    this.codePhoneMinute = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:code:phone:minute`,
      points: 1,
      duration: 60,
    });
    this.codePhoneHour = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:code:phone:hour`,
      points: 5,
      duration: 3_600,
    });
    this.codePhoneDay = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:code:phone:day`,
      points: 10,
      duration: 86_400,
    });
    this.codeIpHour = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:code:ip:hour`,
      points: 20,
      duration: 3_600,
    });
    this.passwordAccount = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:password:account`,
      points: 5,
      duration: 900,
      blockDuration: 900,
    });
    this.passwordIp = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:password:ip`,
      points: 30,
      duration: 900,
    });
  }

  async consumeCodeRequest(phoneKey: string, purpose: string, ipKey: string): Promise<void> {
    await this.redis.ensureConnected();
    await Promise.all([
      this.consume(this.codePhoneMinute, `${phoneKey}:${purpose}`),
      this.consume(this.codePhoneHour, phoneKey),
      this.consume(this.codePhoneDay, phoneKey),
      this.consume(this.codeIpHour, ipKey),
    ]);
  }

  async consumePasswordAttempt(accountKey: string, ipKey: string): Promise<void> {
    await this.redis.ensureConnected();
    await Promise.all([
      this.consume(this.passwordAccount, accountKey),
      this.consume(this.passwordIp, ipKey),
    ]);
  }

  async clearPasswordAccount(accountKey: string): Promise<void> {
    await this.passwordAccount.delete(accountKey);
  }

  private async consume(limiter: RateLimiterRedis, key: string): Promise<void> {
    try {
      await limiter.consume(key);
    } catch (error) {
      if (this.isLimitResult(error)) {
        throw new ApiProblemException(
          429,
          'Too many requests. Please try again later.',
          'RATE_LIMITED',
        );
      }
      throw new ApiProblemException(
        503,
        'Authentication is temporarily unavailable.',
        'AUTH_DEPENDENCY_UNAVAILABLE',
      );
    }
  }

  private isLimitResult(value: unknown): value is RateLimiterRes {
    return typeof value === 'object' && value !== null && 'msBeforeNext' in value;
  }
}
