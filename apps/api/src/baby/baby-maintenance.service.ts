import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

const MAINTENANCE_INTERVAL_MS = 3_600_000;
const ADVISORY_LOCK_KEY = 1_346_229_701;

@Injectable()
export class BabyMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BabyMaintenanceService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.backgroundJobsEnabled) return;
    void this.runSafely();
    this.timer = setInterval(() => void this.runSafely(), MAINTENANCE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async purgeExpired(limit = 50, now = new Date()): Promise<number> {
    const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
    return this.prisma.$transaction(async (transaction) => {
      const [lock] = await transaction.$queryRawUnsafe<Array<{ acquired: boolean }>>(
        'SELECT pg_try_advisory_xact_lock($1::bigint) AS acquired',
        ADVISORY_LOCK_KEY,
      );
      if (!lock?.acquired) return 0;
      const expired = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT baby.id FROM baby_profiles baby
         WHERE baby.status = 'ARCHIVED' AND baby.purge_after <= $1
           AND NOT EXISTS (SELECT 1 FROM photos photo WHERE photo.baby_id = baby.id)
         ORDER BY purge_after ASC, id ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        now,
        safeLimit,
      );
      if (expired.length === 0) return 0;
      const ids = expired.map(({ id }) => id);
      await transaction.babyProfile.updateMany({
        where: { id: { in: ids }, status: 'ARCHIVED', purgeAfter: { lte: now } },
        data: { status: 'PURGING' },
      });
      const milestones = await transaction.milestone.findMany({
        where: { babyId: { in: ids } },
        select: { id: true, familyId: true },
      });
      for (const milestone of milestones) {
        await transaction.familyActivity.updateMany({
          where: {
            familyId: milestone.familyId,
            subjectType: 'MILESTONE',
            subjectId: milestone.id,
            visibility: 'ACTIVE',
          },
          data: {
            visibility: 'TOMBSTONED',
            subjectId: null,
            summaryPayload: {},
            tombstonedAt: now,
          },
        });
      }
      const deleted = await transaction.babyProfile.deleteMany({
        where: { id: { in: ids }, status: 'PURGING' },
      });
      return deleted.count;
    });
  }

  private async runSafely(): Promise<void> {
    try {
      const count = await this.purgeExpired();
      if (count > 0) this.logger.log(`Purged ${count} expired baby profiles`);
    } catch (error) {
      this.logger.error(
        'Baby profile maintenance failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
