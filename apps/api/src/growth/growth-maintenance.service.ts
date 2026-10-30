import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

@Injectable()
export class GrowthMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(GrowthMaintenanceService.name);
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}
  onModuleInit(): void {
    if (!this.config.backgroundJobsEnabled) return;
    void this.run();
    this.timer = setInterval(() => void this.run(), 3_600_000);
    this.timer.unref();
  }
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
  async purgeExpired(limit = 50, now = new Date()): Promise<number> {
    const batch = Math.max(1, Math.min(200, Math.trunc(limit)));
    return this.prisma.$transaction(async (db) => {
      const [lock] = await db.$queryRaw<
        Array<{ acquired: boolean }>
      >`SELECT pg_try_advisory_xact_lock(1346229702::bigint) AS acquired`;
      if (!lock?.acquired) return 0;
      const expired = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM growth_records WHERE status='TRASHED' AND purge_after<=${now} ORDER BY purge_after,id LIMIT ${batch} FOR UPDATE SKIP LOCKED`;
      const result = await db.growthRecord.deleteMany({
        where: {
          id: { in: expired.map((r) => r.id) },
          status: 'TRASHED',
          purgeAfter: { lte: now },
        },
      });
      return result.count;
    });
  }
  private async run(): Promise<void> {
    try {
      await this.purgeExpired();
    } catch {
      this.logger.error('Growth record cleanup failed; next scheduled run will retry.');
    }
  }
}
