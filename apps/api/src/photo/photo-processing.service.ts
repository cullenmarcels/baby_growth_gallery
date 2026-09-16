import { createHash } from 'node:crypto';
import { LibheifDecoder } from '@keeratita/heic-converter';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import exifr from 'exifr';
import sharp, { type Sharp } from 'sharp';
import type { Photo, PhotoSourceFormat, PhotoVariantKind } from '../generated/prisma/client.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { ObjectStorageService } from '../infrastructure/object-storage.service.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 50_000_000;
const MAX_SIDE = 16_383;
const DRAFT_RETENTION_MS = 30 * 86_400_000;

class PhotoProcessingError extends Error {
  constructor(
    readonly code: string,
    readonly terminal = true,
  ) {
    super(code);
  }
}

interface VariantResult {
  kind: PhotoVariantKind;
  key: string;
  body: Buffer;
  width: number;
  height: number;
  sha256: string;
}

@Injectable()
export class PhotoProcessingService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private active = 0;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ObjectStorageService) private readonly storage: ObjectStorageService,
  ) {}

  onModuleInit(): void {
    if (!this.config.backgroundJobsEnabled) return;
    this.timer = setInterval(() => void this.tick(), 1_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processOne(): Promise<boolean> {
    const photo = await this.claim();
    if (!photo) return false;
    await this.process(photo);
    return true;
  }

  private tick(): void {
    while (this.active < this.config.photos.processingConcurrency) {
      this.active += 1;
      void this.processOne()
        .catch(() => undefined)
        .finally(() => {
          this.active -= 1;
        });
      if (this.active >= this.config.photos.processingConcurrency) break;
    }
  }

  private async claim(): Promise<Photo | null> {
    return this.prisma.$transaction(
      async (transaction) => {
        const candidates = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "photos"
        WHERE (
          ("status" = 'QUEUED' AND ("next_processing_at" IS NULL OR "next_processing_at" <= NOW()))
          OR ("status" = 'PROCESSING' AND "processing_lease_until" <= NOW())
        )
        AND "processing_attempts" < 3
        ORDER BY "created_at" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
        const id = candidates[0]?.id;
        if (!id) return null;
        return transaction.photo.update({
          where: { id },
          data: {
            status: 'PROCESSING',
            processingAttempts: { increment: 1 },
            processingLeaseUntil: new Date(Date.now() + 5 * 60_000),
            nextProcessingAt: null,
            failureCode: null,
          },
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  private async process(photo: Photo): Promise<void> {
    const keys = this.variantKeys(photo.id);
    try {
      if (!photo.quarantineObjectKey) throw new PhotoProcessingError('PHOTO_PROCESSING_FAILED');
      const source = await this.storage.getBuffer(photo.quarantineObjectKey);
      if (source.length < 1 || source.length > MAX_BYTES)
        throw new PhotoProcessingError('PHOTO_FILE_TOO_LARGE');
      const type = await fileTypeFromBuffer(source);
      const sourceFormat = this.sourceFormat(type);
      if (!sourceFormat) throw new PhotoProcessingError('PHOTO_FORMAT_UNSUPPORTED');
      if ((sourceFormat === 'HEIC' || sourceFormat === 'HEIF') && this.isHeifSequence(source)) {
        throw new PhotoProcessingError('PHOTO_ANIMATION_UNSUPPORTED');
      }
      const exif = await this.safeExif(source);
      const decoded = await this.decode(source, sourceFormat, exif.orientation);
      this.assertDimensions(decoded.width, decoded.height);
      const variants = await Promise.all([
        this.variant(decoded.factory, 'THUMBNAIL', keys.THUMBNAIL, 640, 80),
        this.variant(decoded.factory, 'DISPLAY', keys.DISPLAY, 2048, 84),
        this.variant(decoded.factory, 'ARCHIVE', keys.ARCHIVE, undefined, 90),
      ]);
      for (const variant of variants) await this.storage.putWebp(variant.key, variant.body);
      const processedAt = new Date();
      await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.photo.findUnique({ where: { id: photo.id } });
        if (!current || current.status !== 'PROCESSING')
          throw new PhotoProcessingError('PHOTO_STATE_CONFLICT');
        await transaction.photoVariant.deleteMany({ where: { photoId: photo.id } });
        await transaction.photoVariant.createMany({
          data: variants.map((item) => ({
            photoId: photo.id,
            kind: item.kind,
            objectKey: item.key,
            width: item.width,
            height: item.height,
            sizeBytes: item.body.length,
            sha256: item.sha256,
          })),
        });
        await transaction.photo.update({
          where: { id: photo.id },
          data: {
            status: 'DRAFT',
            sourceFormat,
            sourceSizeBytes: source.length,
            sourceSha256: createHash('sha256').update(source).digest('hex'),
            sourceWidth: decoded.width,
            sourceHeight: decoded.height,
            capturedOn: exif.capturedOn ?? photo.capturedOn,
            processingLeaseUntil: null,
            nextProcessingAt: null,
            failureCode: null,
            draftExpiresAt: new Date(processedAt.valueOf() + DRAFT_RETENTION_MS),
          },
        });
      });
      try {
        await this.storage.delete(photo.quarantineObjectKey);
        await this.prisma.photo.updateMany({
          where: { id: photo.id, status: 'DRAFT' },
          data: { quarantineObjectKey: null },
        });
      } catch {
        // The maintenance task retries deleting the retained quarantine key.
      }
    } catch (error) {
      await this.handleFailure(photo, error, Object.values(keys));
    }
  }

  private async decode(
    source: Buffer,
    format: PhotoSourceFormat,
    orientation: number | undefined,
  ): Promise<{ width: number; height: number; factory: () => Sharp }> {
    if (format === 'HEIC' || format === 'HEIF') {
      const decoder = new LibheifDecoder();
      try {
        const image = await decoder.decode(source);
        const data = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
        return {
          width: image.width,
          height: image.height,
          factory: () =>
            this.orient(
              sharp(data, {
                raw: { width: image.width, height: image.height, channels: 4 },
                limitInputPixels: MAX_PIXELS,
              }),
              orientation,
            ).toColourspace('srgb'),
        };
      } catch {
        throw new PhotoProcessingError('PHOTO_PROCESSING_FAILED');
      } finally {
        decoder.free();
      }
    }
    try {
      const probe = sharp(source, { animated: true, limitInputPixels: MAX_PIXELS });
      const metadata = await probe.metadata();
      if ((metadata.pages ?? 1) > 1) throw new PhotoProcessingError('PHOTO_ANIMATION_UNSUPPORTED');
      if (!metadata.width || !metadata.height)
        throw new PhotoProcessingError('PHOTO_PROCESSING_FAILED');
      return {
        width: metadata.width,
        height: metadata.height,
        factory: () =>
          sharp(source, { animated: false, limitInputPixels: MAX_PIXELS })
            .rotate()
            .toColourspace('srgb'),
      };
    } catch (error) {
      if (error instanceof PhotoProcessingError) throw error;
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('pixel limit'))
        throw new PhotoProcessingError('PHOTO_PIXEL_LIMIT_EXCEEDED');
      throw new PhotoProcessingError('PHOTO_PROCESSING_FAILED');
    }
  }

  private async variant(
    factory: () => Sharp,
    kind: PhotoVariantKind,
    key: string,
    maxSide: number | undefined,
    quality: number,
  ): Promise<VariantResult> {
    let pipeline = factory();
    if (maxSide)
      pipeline = pipeline.resize({
        width: maxSide,
        height: maxSide,
        fit: 'inside',
        withoutEnlargement: true,
      });
    const output = await pipeline.webp({ quality }).toBuffer({ resolveWithObject: true });
    if (!output.info.width || !output.info.height)
      throw new PhotoProcessingError('PHOTO_PROCESSING_FAILED');
    return {
      kind,
      key,
      body: output.data,
      width: output.info.width,
      height: output.info.height,
      sha256: createHash('sha256').update(output.data).digest('hex'),
    };
  }

  private async safeExif(
    source: Buffer,
  ): Promise<{ capturedOn: Date | null; orientation?: number }> {
    try {
      const data = (await exifr.parse(source, {
        pick: ['DateTimeOriginal', 'CreateDate', 'Orientation'],
      })) as Record<string, unknown> | undefined;
      const date = data?.DateTimeOriginal ?? data?.CreateDate;
      const capturedOn =
        date instanceof Date && !Number.isNaN(date.valueOf())
          ? new Date(
              `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T00:00:00.000Z`,
            )
          : null;
      const today = new Date(
        new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10) + 'T00:00:00.000Z',
      );
      return {
        capturedOn: capturedOn && capturedOn <= today ? capturedOn : null,
        ...(typeof data?.Orientation === 'number' ? { orientation: data.Orientation } : {}),
      };
    } catch {
      return { capturedOn: null };
    }
  }

  private sourceFormat(type: { ext: string; mime: string } | undefined): PhotoSourceFormat | null {
    if (type?.ext === 'jpg' || type?.ext === 'jpeg') return 'JPEG';
    if (type?.ext === 'png') return 'PNG';
    if (type?.ext === 'webp') return 'WEBP';
    if (type?.ext === 'heic' && type.mime === 'image/heif') return 'HEIF';
    if (type?.ext === 'heic') return 'HEIC';
    if (type?.ext === 'heif') return 'HEIF';
    return null;
  }

  private assertDimensions(width: number, height: number): void {
    if (width < 1 || height < 1 || width * height > MAX_PIXELS)
      throw new PhotoProcessingError('PHOTO_PIXEL_LIMIT_EXCEEDED');
    if (width > MAX_SIDE || height > MAX_SIDE)
      throw new PhotoProcessingError('PHOTO_DIMENSIONS_UNSUPPORTED');
  }

  private isHeifSequence(source: Buffer): boolean {
    const header = source.subarray(0, Math.min(96, source.length)).toString('latin1');
    return header.includes('msf1') || header.includes('hevc');
  }

  private orient(pipeline: Sharp, orientation: number | undefined): Sharp {
    switch (orientation) {
      case 2:
        return pipeline.flop();
      case 3:
        return pipeline.rotate(180);
      case 4:
        return pipeline.flip();
      case 5:
        return pipeline.rotate(90).flop();
      case 6:
        return pipeline.rotate(90);
      case 7:
        return pipeline.rotate(90).flip();
      case 8:
        return pipeline.rotate(270);
      default:
        return pipeline;
    }
  }

  private variantKeys(photoId: string): Record<PhotoVariantKind, string> {
    return {
      THUMBNAIL: `photos/${photoId}/thumbnail.webp`,
      DISPLAY: `photos/${photoId}/display.webp`,
      ARCHIVE: `photos/${photoId}/archive.webp`,
    };
  }

  private async handleFailure(photo: Photo, error: unknown, variantKeys: string[]): Promise<void> {
    const typed =
      error instanceof PhotoProcessingError
        ? error
        : new PhotoProcessingError('PHOTO_PROCESSING_FAILED', false);
    const terminal = typed.terminal || photo.processingAttempts >= 3;
    if (!terminal) {
      const minutes = [1, 5, 15][Math.min(photo.processingAttempts - 1, 2)] ?? 15;
      await this.prisma.photo.updateMany({
        where: { id: photo.id, status: 'PROCESSING' },
        data: {
          status: 'QUEUED',
          processingLeaseUntil: null,
          nextProcessingAt: new Date(Date.now() + minutes * 60_000),
          failureCode: typed.code,
        },
      });
      return;
    }
    let quarantineDeleted = false;
    await Promise.allSettled(variantKeys.map((key) => this.storage.delete(key)));
    try {
      await this.storage.delete(photo.quarantineObjectKey);
      quarantineDeleted = true;
    } catch {
      /* maintenance retries */
    }
    await this.prisma.photo.updateMany({
      where: { id: photo.id, status: 'PROCESSING' },
      data: {
        status: 'FAILED',
        processingLeaseUntil: null,
        nextProcessingAt: null,
        failureCode: typed.code,
        purgeAfter: new Date(Date.now() + DRAFT_RETENTION_MS),
        ...(quarantineDeleted ? { quarantineObjectKey: null } : {}),
      },
    });
  }
}
