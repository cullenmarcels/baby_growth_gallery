import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: RedisClientType;
  private connecting: Promise<void> | undefined;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.client = createClient({
      url: config.redisUrl,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy(retries) {
          return retries >= 2 ? new Error('Redis connection unavailable') : 250 * (retries + 1);
        },
      },
    });
    this.client.on('error', () => undefined);
  }

  get prefix(): string {
    return this.config.redisKeyPrefix;
  }

  async ensureConnected(): Promise<void> {
    if (this.client.isReady) return;
    if (!this.connecting) {
      this.connecting = this.client.connect().then(() => undefined);
    }
    const currentAttempt = this.connecting;
    try {
      await currentAttempt;
    } finally {
      if (this.connecting === currentAttempt) this.connecting = undefined;
    }
  }

  async ping(): Promise<string> {
    await this.ensureConnected();
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) await this.client.close();
  }
}
