import { Inject, Injectable } from '@nestjs/common';
import { RateLimiterRedis, type RateLimiterRes } from 'rate-limiter-flexible';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { RedisService } from '../infrastructure/redis.service.js';

@Injectable()
export class AuthRateLimitService {
  private readonly passwordAccount;
  private readonly passwordIp;

  constructor(@Inject(RedisService) private readonly redis: RedisService) {
    const common = {
      storeClient: redis.client,
      useRedisPackage: true,
      rejectIfRedisNotReady: true,
    };
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
