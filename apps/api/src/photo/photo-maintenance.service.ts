import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { FamilyActivityService } from '../family/family-activity.service.js';
import { ObjectStorageService } from '../infrastructure/object-storage.service.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

const INTERVAL_MS = 60_000;
const ADVISORY_LOCK_KEY = 1_346_229_702;

@Injectable()
export class PhotoMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PhotoMaintenanceService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ObjectStorageService) private readonly storage: ObjectStorageService,
    @Inject(FamilyActivityService) private readonly activities: FamilyActivityService,
  ) {}

  onModuleInit(): void {
    if (!this.config.backgroundJobsEnabled) return;
    void this.runSafely();
    this.timer = setInterval(() => void this.runSafely(), INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async purgeExpired(limit = 50, now = new Date()): Promise<number> {
    const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
    const ids = await this.prisma.$transaction(async (transaction) => {
      const [lock] = await transaction.$queryRawUnsafe<Array<{ acquired: boolean }>>(
        'SELECT pg_try_advisory_xact_lock($1::bigint) AS acquired',
        ADVISORY_LOCK_KEY,
      );
      if (!lock?.acquired) return [];
      await transaction.photo.updateMany({
        where: {
          baby: { status: { in: ['ARCHIVED', 'PURGING'] }, purgeAfter: { lte: now } },
          status: { not: 'PURGING' },
        },
        data: { status: 'PURGING', purgeAfter: now },
      });
      const candidates = await transaction.photo.findMany({
        where: {
          OR: [
            { status: 'PURGING' },
            { status: 'AWAITING_UPLOAD', uploadWindowExpiresAt: { lte: now } },
            { status: 'DRAFT', draftExpiresAt: { lte: now } },
            { status: { in: ['FAILED', 'TRASHED'] }, purgeAfter: { lte: now } },
          ],
        },
        select: { id: true },
        orderBy: [{ purgeAfter: 'asc' }, { id: 'asc' }],
        take: safeLimit,
      });
      const selected = candidates.map((item) => item.id);
      if (selected.length > 0) {
        await transaction.photo.updateMany({
          where: { id: { in: selected } },
          data: { status: 'PURGING', purgeAfter: now },
        });
      }
      return selected;
    });

    let purged = 0;
    for (const id of ids) {
      if (await this.purgeOne(id)) purged += 1;
    }
    await this.cleanupProcessedQuarantine();
    return purged;
  }

  private async purgeOne(id: string): Promise<boolean> {
    const photo = await this.prisma.photo.findFirst({
      where: { id, status: 'PURGING' },
      include: { variants: true },
    });
    if (!photo) return false;
    try {
      await this.storage.delete(photo.quarantineObjectKey);
      for (const variant of photo.variants) await this.storage.delete(variant.objectKey);
    } catch {
      return false;
    }
    await this.prisma.$transaction(async (transaction) => {
      await this.activities.tombstoneSubject(transaction, photo.familyId, 'PHOTO', photo.id);
      await transaction.photo.delete({ where: { id: photo.id } });
      await transaction.photoUploadBatch.deleteMany({
        where: { id: photo.uploadBatchId, photos: { none: {} } },
      });
    });
    return true;
  }

  private async cleanupProcessedQuarantine(): Promise<void> {
    const photos = await this.prisma.photo.findMany({
      where: {
        status: { in: ['DRAFT', 'PUBLISHED', 'TRASHED', 'FAILED'] },
        quarantineObjectKey: { not: null },
      },
      select: { id: true, quarantineObjectKey: true },
      take: 20,
    });
    for (const photo of photos) {
      try {
        await this.storage.delete(photo.quarantineObjectKey);
        await this.prisma.photo.updateMany({
          where: { id: photo.id, quarantineObjectKey: photo.quarantineObjectKey },
          data: { quarantineObjectKey: null },
        });
      } catch {
        // Keep the object key for the next maintenance pass.
      }
    }
  }

  private async runSafely(): Promise<void> {
    try {
      const count = await this.purgeExpired();
      if (count > 0) this.logger.log(`Purged ${count} photo records and private objects`);
    } catch (error) {
      this.logger.error(
        'Photo maintenance failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
