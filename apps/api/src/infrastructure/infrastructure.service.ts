import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { RedisService } from './redis.service.js';
import { ObjectStorageService } from './object-storage.service.js';

export type DependencyName = 'postgres' | 'redis' | 'objectStorage';
export type DependencyStatus = Record<DependencyName, 'up' | 'down'>;

@Injectable()
export class InfrastructureService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ObjectStorageService) private readonly storage: ObjectStorageService,
  ) {}

  async checkAll(): Promise<DependencyStatus> {
    const [postgres, redis, objectStorage] = await Promise.allSettled([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkObjectStorage(),
    ]);
    return {
      postgres: postgres.status === 'fulfilled' ? postgres.value : 'down',
      redis: redis.status === 'fulfilled' ? redis.value : 'down',
      objectStorage: objectStorage.status === 'fulfilled' ? objectStorage.value : 'down',
    };
  }

  private async checkPostgres(): Promise<'up' | 'down'> {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`, 3_000);
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      await this.withTimeout(this.redis.ping(), 3_000);
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkObjectStorage(): Promise<'up' | 'down'> {
    try {
      await this.withTimeout(this.storage.headBucket(), 3_000);
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Dependency check timed out')), timeoutMs);
    });
    try {
      return await Promise.race([operation, deadline]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
