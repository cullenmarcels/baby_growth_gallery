import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from './prisma.service.js';

export type DependencyName = 'postgres' | 'redis' | 'objectStorage';
export type DependencyStatus = Record<DependencyName, 'up' | 'down'>;

@Injectable()
export class InfrastructureService {
  private readonly s3Client: S3Client;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    this.s3Client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
    });
  }

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
    const client = createClient({ url: this.config.redisUrl, socket: { connectTimeout: 2_000 } });
    client.on('error', () => undefined);
    try {
      await this.withTimeout(client.connect(), 3_000);
      await this.withTimeout(client.ping(), 3_000);
      return 'up';
    } catch {
      return 'down';
    } finally {
      if (client.isOpen) {
        try {
          await client.close();
        } catch {
          // Readiness cleanup must not escape as an application error.
        }
      }
    }
  }

  private async checkObjectStorage(): Promise<'up' | 'down'> {
    try {
      await this.withTimeout(
        this.s3Client.send(new HeadBucketCommand({ Bucket: this.config.s3.bucket })),
        3_000,
      );
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
