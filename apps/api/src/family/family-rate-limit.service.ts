import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { RateLimiterRedis, type RateLimiterRes } from 'rate-limiter-flexible';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { RedisService } from '../infrastructure/redis.service.js';

@Injectable()
export class FamilyRateLimitService {
  private readonly accountLimiter: RateLimiterRedis;
  private readonly ipLimiter: RateLimiterRedis;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {
    const common = {
      storeClient: redis.client,
      useRedisPackage: true,
      rejectIfRedisNotReady: true,
      duration: 900,
    };
    this.accountLimiter = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:family-invitation:account`,
      points: 10,
    });
    this.ipLimiter = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:family-invitation:ip`,
      points: 30,
    });
  }

  async consumeInvitationAttempt(accountId: string, ip: string): Promise<void> {
    try {
      await this.redis.ensureConnected();
      await Promise.all([
        this.accountLimiter.consume(this.digest(`account:${accountId}`)),
        this.ipLimiter.consume(this.digest(`ip:${ip}`)),
      ]);
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
        'Family invitations are temporarily unavailable.',
        'FAMILY_DEPENDENCY_UNAVAILABLE',
      );
    }
  }

  private digest(value: string): string {
    return createHmac('sha256', this.config.auth.hmacSecret)
      .update(`family-invitation-rate:v1:${value}`)
      .digest('hex');
  }

  private isLimitResult(value: unknown): value is RateLimiterRes {
    return typeof value === 'object' && value !== null && 'msBeforeNext' in value;
  }
}
