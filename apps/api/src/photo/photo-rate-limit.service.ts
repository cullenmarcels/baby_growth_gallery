import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { RateLimiterRedis, type RateLimiterRes } from 'rate-limiter-flexible';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { RedisService } from '../infrastructure/redis.service.js';

@Injectable()
export class PhotoRateLimitService {
  private readonly batchLimiter: RateLimiterRedis;
  private readonly accountPhotoLimiter: RateLimiterRedis;
  private readonly ipPhotoLimiter: RateLimiterRedis;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {
    const common = {
      storeClient: redis.client,
      useRedisPackage: true,
      rejectIfRedisNotReady: true,
    };
    this.batchLimiter = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:photo:batch`,
      points: 10,
      duration: 900,
    });
    this.accountPhotoLimiter = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:photo:account`,
      points: 200,
      duration: 86_400,
    });
    this.ipPhotoLimiter = new RateLimiterRedis({
      ...common,
      keyPrefix: `${redis.prefix}:rl:photo:ip`,
      points: 500,
      duration: 86_400,
    });
  }

  async consume(accountId: string, ip: string, count: number): Promise<void> {
    try {
      await this.redis.ensureConnected();
      await Promise.all([
        this.batchLimiter.consume(this.digest(`account:${accountId}`), 1),
        this.accountPhotoLimiter.consume(this.digest(`account:${accountId}`), count),
        this.ipPhotoLimiter.consume(this.digest(`ip:${ip}`), count),
      ]);
    } catch (error) {
      if (this.isLimit(error)) {
        throw new ApiProblemException(
          429,
          '照片上传次数已达上限，请稍后再试。',
          'PHOTO_UPLOAD_LIMIT',
        );
      }
      throw new ApiProblemException(
        503,
        '照片上传依赖暂时不可用。',
        'PHOTO_DEPENDENCY_UNAVAILABLE',
      );
    }
  }

  private digest(value: string): string {
    return createHmac('sha256', this.config.auth.hmacSecret)
      .update(`photo-upload-rate:v1:${value}`)
      .digest('hex');
  }
  private isLimit(value: unknown): value is RateLimiterRes {
    return typeof value === 'object' && value !== null && 'msBeforeNext' in value;
  }
}
