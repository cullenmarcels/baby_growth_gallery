import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Photo } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { FamilyActivityService } from '../family/family-activity.service.js';
import { ObjectStorageService } from '../infrastructure/object-storage.service.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import type {
  PhotoManagementPageDto,
  PhotoPreviewDto,
  PhotoSummaryDto,
  PhotoUploadBatchDto,
  PhotoUploadInstructionDto,
} from './photo.dto.js';
import { PhotoPolicyService } from './photo-policy.service.js';
import { PhotoRateLimitService } from './photo-rate-limit.service.js';
import type {
  BatchUpdatePhotosInput,
  CreatePhotoBatchInput,
  ManagePhotosQuery,
  PublishPhotosInput,
  UpdatePhotoInput,
} from './photo.schemas.js';

const HOUR_MS = 3_600_000;
const RETENTION_MS = 30 * 86_400_000;
const cursorSchema = z.object({
  v: z.literal(1),
  updatedAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

@Injectable()
export class PhotoService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PhotoPolicyService) private readonly policy: PhotoPolicyService,
    @Inject(PhotoRateLimitService) private readonly rates: PhotoRateLimitService,
    @Inject(ObjectStorageService) private readonly storage: ObjectStorageService,
    @Inject(FamilyActivityService) private readonly activities: FamilyActivityService,
  ) {}

  async createBatch(
    accountId: string,
    ip: string,
    familyId: string,
    babyId: string,
    input: CreatePhotoBatchInput,
  ): Promise<PhotoUploadBatchDto> {
    const { membership } = await this.policy.requireActiveBaby(accountId, familyId, babyId);
    await this.rates.consume(accountId, ip, input.files.length);
    const now = new Date();
    const uploadWindowExpiresAt = new Date(now.valueOf() + HOUR_MS);
    const photoRows = input.files.map((file, index) => ({
      id: randomUUID(),
      contentType: this.normalizeContentType(file.contentType),
      sizeBytes: file.sizeBytes,
      capturedOn: new Date(`${file.capturedOn}T00:00:00.000Z`),
      displayOrder: index,
      key: `quarantine/${randomUUID()}`,
    }));
    const batch = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.photoUploadBatch.create({
        data: { familyId, babyId, createdByMembershipId: membership.id },
      });
      await transaction.photo.createMany({
        data: photoRows.map((photo) => ({
          id: photo.id,
          uploadBatchId: created.id,
          familyId,
          babyId,
          createdByMembershipId: membership.id,
          declaredContentType: photo.contentType,
          declaredSizeBytes: photo.sizeBytes,
          capturedOn: photo.capturedOn,
          displayOrder: photo.displayOrder,
          quarantineObjectKey: photo.key,
          uploadWindowExpiresAt,
        })),
      });
      return created;
    });
    try {
      const uploadInstructions = await Promise.all(
        photoRows.map(async (photo): Promise<PhotoUploadInstructionDto> => ({
          photoId: photo.id,
          ...(await this.storage.createUpload(photo.key, photo.contentType)),
        })),
      );
      return {
        id: batch.id,
        babyId,
        createdAt: batch.createdAt.toISOString(),
        photos: photoRows.map((photo) =>
          this.summary({
            ...photo,
            uploadBatchId: batch.id,
            familyId,
            babyId,
            createdByMembershipId: membership.id,
            status: 'AWAITING_UPLOAD',
            declaredContentType: photo.contentType,
            declaredSizeBytes: photo.sizeBytes,
            sourceFormat: null,
            sourceSizeBytes: null,
            sourceSha256: null,
            sourceWidth: null,
            sourceHeight: null,
            title: null,
            description: null,
            location: null,
            quarantineObjectKey: photo.key,
            uploadWindowExpiresAt,
            processingAttempts: 0,
            processingLeaseUntil: null,
            nextProcessingAt: null,
            failureCode: null,
            draftExpiresAt: null,
            publishedAt: null,
            trashedAt: null,
            purgeAfter: null,
            createdAt: batch.createdAt,
            updatedAt: batch.createdAt,
          }),
        ),
        uploadInstructions,
      };
    } catch {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.photo.deleteMany({ where: { uploadBatchId: batch.id } });
        await transaction.photoUploadBatch.delete({ where: { id: batch.id } });
      });
      throw new ApiProblemException(503, '照片存储暂时不可用。', 'PHOTO_STORAGE_UNAVAILABLE');
    }
  }

  async getBatch(
    accountId: string,
    familyId: string,
    babyId: string,
    batchId: string,
  ): Promise<PhotoUploadBatchDto> {
    const { membership } = await this.policy.requireActiveBaby(accountId, familyId, babyId);
    const batch = await this.prisma.photoUploadBatch.findFirst({
      where: { id: batchId, familyId, babyId, createdByMembershipId: membership.id },
      include: { photos: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!batch) this.policy.notFound();
    return {
      id: batch.id,
      babyId: batch.babyId,
      createdAt: batch.createdAt.toISOString(),
      photos: batch.photos.map((photo) => this.summary(photo)),
    };
  }

  async reissue(
    accountId: string,
    familyId: string,
    babyId: string,
    batchId: string,
    photoId: string,
  ): Promise<PhotoUploadInstructionDto> {
    const { membership, photo } = await this.policy.requirePhoto(
      accountId,
      familyId,
      babyId,
      photoId,
    );
    this.policy.requirePrivateOwner(membership, photo);
    if (photo.uploadBatchId !== batchId) this.policy.notFound();
    if (photo.status !== 'AWAITING_UPLOAD') this.policy.stateConflict();
    if (photo.uploadWindowExpiresAt <= new Date() || !photo.quarantineObjectKey) {
      throw new ApiProblemException(409, '照片上传窗口已过期。', 'PHOTO_UPLOAD_EXPIRED');
    }
    try {
      return {
        photoId,
        ...(await this.storage.createUpload(photo.quarantineObjectKey, photo.declaredContentType)),
      };
    } catch {
      throw new ApiProblemException(503, '照片存储暂时不可用。', 'PHOTO_STORAGE_UNAVAILABLE');
    }
  }

  async complete(
    accountId: string,
    familyId: string,
    babyId: string,
    batchId: string,
    photoId: string,
  ): Promise<void> {
    const { membership, photo } = await this.policy.requirePhoto(
      accountId,
      familyId,
      babyId,
      photoId,
    );
    this.policy.requirePrivateOwner(membership, photo);
    if (photo.uploadBatchId !== batchId) this.policy.notFound();
    if (['QUEUED', 'PROCESSING', 'DRAFT', 'PUBLISHED', 'TRASHED'].includes(photo.status)) return;
    if (photo.status !== 'AWAITING_UPLOAD' || !photo.quarantineObjectKey)
      this.policy.stateConflict();
    if (photo.uploadWindowExpiresAt <= new Date())
      throw new ApiProblemException(409, '照片上传窗口已过期。', 'PHOTO_UPLOAD_EXPIRED');
    let object: { size: number; contentType: string | null };
    try {
      object = await this.storage.head(photo.quarantineObjectKey);
    } catch {
      throw new ApiProblemException(409, '尚未找到已上传的照片，请重新上传。', 'PHOTO_NOT_READY');
    }
    if (
      object.size < 1 ||
      object.size > 20 * 1024 * 1024 ||
      object.size !== photo.declaredSizeBytes
    ) {
      throw new ApiProblemException(400, '照片文件大小不符合上传要求。', 'PHOTO_FILE_TOO_LARGE');
    }
    const updated = await this.prisma.photo.updateMany({
      where: { id: photoId, status: 'AWAITING_UPLOAD' },
      data: { status: 'QUEUED', nextProcessingAt: new Date(), failureCode: null },
    });
    if (updated.count !== 1) {
      const current = await this.prisma.photo.findUnique({
        where: { id: photoId },
        select: { status: true },
      });
      if (
        !current ||
        !['QUEUED', 'PROCESSING', 'DRAFT', 'PUBLISHED', 'TRASHED'].includes(current.status)
      )
        this.policy.stateConflict();
    }
  }

  async update(
    accountId: string,
    familyId: string,
    babyId: string,
    photoId: string,
    input: UpdatePhotoInput,
  ): Promise<PhotoSummaryDto> {
    const { membership, photo } = await this.policy.requirePhoto(
      accountId,
      familyId,
      babyId,
      photoId,
    );
    const privatePhoto = ['AWAITING_UPLOAD', 'QUEUED', 'PROCESSING', 'DRAFT', 'FAILED'].includes(
      photo.status,
    );
    if (privatePhoto) this.policy.requirePrivateOwner(membership, photo);
    else if (!this.policy.canManagePublished(membership, photo)) this.policy.permissionDenied();
    if (!['DRAFT', 'PUBLISHED'].includes(photo.status)) this.policy.stateConflict();
    const updated = await this.prisma.photo.update({
      where: { id: photo.id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.capturedOn !== undefined
          ? { capturedOn: new Date(`${input.capturedOn}T00:00:00.000Z`) }
          : {}),
      },
    });
    return this.summary(updated);
  }

  async batchUpdate(
    accountId: string,
    familyId: string,
    babyId: string,
    batchId: string,
    input: BatchUpdatePhotosInput,
  ): Promise<{ items: PhotoSummaryDto[] }> {
    const { membership } = await this.policy.requireActiveBaby(accountId, familyId, babyId);
    const uniqueIds = [...new Set(input.photoIds)];
    if (uniqueIds.length !== input.photoIds.length)
      throw new ApiProblemException(400, '照片列表包含重复项目。', 'PHOTO_BATCH_INVALID');
    return this.prisma.$transaction(async (transaction) => {
      const photos = await transaction.photo.findMany({
        where: { id: { in: uniqueIds }, uploadBatchId: batchId, familyId, babyId },
      });
      if (
        photos.length !== uniqueIds.length ||
        photos.some(
          (photo) => photo.createdByMembershipId !== membership.id || photo.status !== 'DRAFT',
        )
      ) {
        throw new ApiProblemException(
          409,
          '批次中的照片状态不允许批量编辑。',
          'PHOTO_STATE_CONFLICT',
        );
      }
      await transaction.photo.updateMany({
        where: { id: { in: uniqueIds } },
        data: {
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.capturedOn !== undefined
            ? { capturedOn: new Date(`${input.capturedOn}T00:00:00.000Z`) }
            : {}),
        },
      });
      const updated = await transaction.photo.findMany({
        where: { id: { in: uniqueIds } },
        orderBy: { displayOrder: 'asc' },
      });
      return { items: updated.map((photo) => this.summary(photo)) };
    });
  }

  async publish(
    accountId: string,
    familyId: string,
    babyId: string,
    batchId: string,
    input: PublishPhotosInput,
  ): Promise<{ items: PhotoSummaryDto[] }> {
    const uniqueIds = [...new Set(input.photoIds)];
    if (uniqueIds.length !== input.photoIds.length)
      throw new ApiProblemException(400, '照片列表包含重复项目。', 'PHOTO_BATCH_INVALID');
    return this.prisma.$transaction(async (transaction) => {
      const { membership } = await this.policy.requireActiveBaby(
        accountId,
        familyId,
        babyId,
        transaction,
      );
      const photos = await transaction.photo.findMany({
        where: { id: { in: uniqueIds }, uploadBatchId: batchId, familyId, babyId },
        orderBy: { displayOrder: 'asc' },
      });
      if (
        photos.length !== uniqueIds.length ||
        photos.some(
          (photo) =>
            photo.createdByMembershipId !== membership.id ||
            photo.status !== 'DRAFT' ||
            !photo.capturedOn,
        )
      ) {
        throw new ApiProblemException(
          409,
          '所选照片尚未全部准备好，未发布任何照片。',
          'PHOTO_NOT_READY',
        );
      }
      const now = new Date();
      const changed = await transaction.photo.updateMany({
        where: { id: { in: uniqueIds }, status: 'DRAFT' },
        data: { status: 'PUBLISHED', publishedAt: now, draftExpiresAt: null },
      });
      if (changed.count !== uniqueIds.length) this.policy.stateConflict();
      for (const photo of photos) {
        await this.activities.record(transaction, {
          familyId,
          actorMembershipId: membership.id,
          type: 'PHOTO_UPLOADED',
          subjectType: 'PHOTO',
          subjectId: photo.id,
          summary: { babyId },
          occurredAt: now,
        });
      }
      const published = await transaction.photo.findMany({
        where: { id: { in: uniqueIds } },
        orderBy: { displayOrder: 'asc' },
      });
      return { items: published.map((photo) => this.summary(photo)) };
    });
  }

  async manage(
    accountId: string,
    familyId: string,
    babyId: string,
    query: ManagePhotosQuery,
  ): Promise<PhotoManagementPageDto> {
    const { membership } = await this.policy.requireActiveBaby(accountId, familyId, babyId);
    if (query.scope === 'family' && !['OWNER', 'ADMIN'].includes(membership.role))
      this.policy.permissionDenied();
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const familyStatuses = ['PUBLISHED', 'TRASHED'] as const;
    if (
      query.scope === 'family' &&
      query.status &&
      !familyStatuses.includes(query.status as 'PUBLISHED' | 'TRASHED')
    ) {
      throw new ApiProblemException(
        400,
        '家庭管理范围只支持已发布和回收站照片。',
        'PHOTO_BATCH_INVALID',
      );
    }
    const rows = await this.prisma.photo.findMany({
      where: {
        familyId,
        babyId,
        ...(query.scope === 'mine'
          ? { createdByMembershipId: membership.id, status: { not: 'PURGING' as const } }
          : {
              status: {
                in: query.status ? [query.status as 'PUBLISHED' | 'TRASHED'] : [...familyStatuses],
              },
            }),
        ...(query.scope === 'mine' && query.status ? { status: query.status } : {}),
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const last = pageRows.at(-1);
    return {
      items: pageRows.map((photo) => this.summary(photo)),
      nextCursor: hasMore && last ? this.encodeCursor(last.updatedAt, last.id) : null,
    };
  }

  async preview(
    accountId: string,
    familyId: string,
    babyId: string,
    photoId: string,
    kind: 'THUMBNAIL' | 'DISPLAY' | 'ARCHIVE',
  ): Promise<PhotoPreviewDto> {
    const { membership, photo } = await this.policy.requirePhoto(
      accountId,
      familyId,
      babyId,
      photoId,
    );
    if (photo.status === 'DRAFT') this.policy.requirePrivateOwner(membership, photo);
    else if (photo.status === 'TRASHED' && !this.policy.canManagePublished(membership, photo))
      this.policy.permissionDenied();
    else if (photo.status !== 'PUBLISHED') this.policy.notFound();
    const variant = await this.prisma.photoVariant.findUnique({
      where: { photoId_kind: { photoId, kind } },
    });
    if (!variant) throw new ApiProblemException(409, '照片预览尚未准备好。', 'PHOTO_NOT_READY');
    try {
      return await this.storage.signPrivateGet(variant.objectKey);
    } catch {
      throw new ApiProblemException(503, '照片存储暂时不可用。', 'PHOTO_STORAGE_UNAVAILABLE');
    }
  }

  async trash(
    accountId: string,
    familyId: string,
    babyId: string,
    photoId: string,
  ): Promise<PhotoSummaryDto> {
    const { membership, photo } = await this.policy.requirePhoto(
      accountId,
      familyId,
      babyId,
      photoId,
    );
    if (!this.policy.canManagePublished(membership, photo)) this.policy.permissionDenied();
    if (photo.status !== 'PUBLISHED') this.policy.stateConflict();
    const now = new Date();
    const result = await this.prisma.photo.updateMany({
      where: { id: photoId, status: 'PUBLISHED' },
      data: {
        status: 'TRASHED',
        trashedAt: now,
        purgeAfter: new Date(now.valueOf() + RETENTION_MS),
      },
    });
    if (result.count !== 1) this.policy.stateConflict();
    return this.summary(await this.prisma.photo.findUniqueOrThrow({ where: { id: photoId } }));
  }

  async restore(
    accountId: string,
    familyId: string,
    babyId: string,
    photoId: string,
  ): Promise<PhotoSummaryDto> {
    const { membership, photo } = await this.policy.requirePhoto(
      accountId,
      familyId,
      babyId,
      photoId,
    );
    if (!this.policy.canManagePublished(membership, photo)) this.policy.permissionDenied();
    if (photo.status !== 'TRASHED') this.policy.stateConflict();
    const now = new Date();
    if (!photo.purgeAfter || photo.purgeAfter <= now)
      throw new ApiProblemException(409, '照片恢复期限已过。', 'PHOTO_RESTORE_EXPIRED');
    const result = await this.prisma.photo.updateMany({
      where: { id: photoId, status: 'TRASHED', purgeAfter: { gt: now } },
      data: { status: 'PUBLISHED', trashedAt: null, purgeAfter: null },
    });
    if (result.count !== 1) this.policy.stateConflict();
    return this.summary(await this.prisma.photo.findUniqueOrThrow({ where: { id: photoId } }));
  }

  async discard(
    accountId: string,
    familyId: string,
    babyId: string,
    photoId: string,
  ): Promise<void> {
    const { membership, photo } = await this.policy.requirePhoto(
      accountId,
      familyId,
      babyId,
      photoId,
    );
    this.policy.requirePrivateOwner(membership, photo);
    if (!['AWAITING_UPLOAD', 'QUEUED', 'DRAFT', 'FAILED'].includes(photo.status))
      this.policy.stateConflict();
    const result = await this.prisma.photo.updateMany({
      where: { id: photoId, status: { in: ['AWAITING_UPLOAD', 'QUEUED', 'DRAFT', 'FAILED'] } },
      data: { status: 'PURGING', purgeAfter: new Date() },
    });
    if (result.count !== 1) this.policy.stateConflict();
  }

  private normalizeContentType(value: string): string {
    const normalized = value.toLowerCase();
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/octet-stream',
    ];
    if (!allowed.includes(normalized))
      throw new ApiProblemException(400, '不支持这种照片格式。', 'PHOTO_FORMAT_UNSUPPORTED');
    return normalized;
  }

  private summary(photo: Photo): PhotoSummaryDto {
    return {
      id: photo.id,
      batchId: photo.uploadBatchId,
      babyId: photo.babyId,
      status: photo.status === 'PURGING' ? 'FAILED' : photo.status,
      title: photo.title,
      description: photo.description,
      capturedOn: photo.capturedOn.toISOString().slice(0, 10),
      location: photo.location,
      sourceFormat: photo.sourceFormat,
      width: photo.sourceWidth,
      height: photo.sourceHeight,
      draftExpiresAt: photo.draftExpiresAt?.toISOString() ?? null,
      publishedAt: photo.publishedAt?.toISOString() ?? null,
      trashedAt: photo.trashedAt?.toISOString() ?? null,
      purgeAfter: photo.purgeAfter?.toISOString() ?? null,
      failureCode: photo.failureCode,
      updatedAt: photo.updatedAt.toISOString(),
    };
  }

  private encodeCursor(updatedAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({ v: 1, updatedAt: updatedAt.toISOString(), id }),
      'utf8',
    ).toString('base64url');
  }
  private decodeCursor(value: string): { updatedAt: Date; id: string } {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid');
      const parsed = cursorSchema.parse(
        JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
      );
      return { updatedAt: new Date(parsed.updatedAt), id: parsed.id };
    } catch {
      throw new ApiProblemException(400, '分页游标无效。', 'CURSOR_INVALID');
    }
  }
}
