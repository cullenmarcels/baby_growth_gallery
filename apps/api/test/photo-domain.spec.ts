import { jest } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import type { FamilyMembership, Photo } from '../src/generated/prisma/client.js';
import { ApiProblemException } from '../src/common/api-problem.exception.js';
import { PhotoPolicyService } from '../src/photo/photo-policy.service.js';
import { PhotoProcessingService } from '../src/photo/photo-processing.service.js';
import {
  batchUpdatePhotosSchema,
  createPhotoBatchSchema,
  managePhotosQuerySchema,
  updatePhotoSchema,
} from '../src/photo/photo.schemas.js';

const familyId = '00000000-0000-4000-8000-000000000001';
const babyId = '00000000-0000-4000-8000-000000000002';
const membershipId = '00000000-0000-4000-8000-000000000003';
const photoId = '00000000-0000-4000-8000-000000000004';
const batchId = '00000000-0000-4000-8000-000000000005';

function membership(role: FamilyMembership['role'] = 'MEMBER'): FamilyMembership {
  return {
    id: membershipId,
    familyId,
    accountId: '00000000-0000-4000-8000-000000000006',
    role,
    status: 'ACTIVE',
    displayName: '合成成员',
    joinedAt: new Date(0),
    leftAt: null,
    updatedAt: new Date(0),
  };
}

function photo(status: Photo['status'] = 'QUEUED'): Photo {
  return {
    id: photoId,
    uploadBatchId: batchId,
    familyId,
    babyId,
    createdByMembershipId: membershipId,
    status,
    declaredContentType: 'image/png',
    declaredSizeBytes: 100,
    sourceFormat: null,
    sourceSizeBytes: null,
    sourceSha256: null,
    sourceWidth: null,
    sourceHeight: null,
    title: null,
    description: null,
    capturedOn: new Date('2026-09-16T00:00:00.000Z'),
    location: null,
    displayOrder: 0,
    quarantineObjectKey: 'quarantine/00000000-0000-4000-8000-000000000007',
    uploadWindowExpiresAt: new Date('2026-09-16T15:00:00.000Z'),
    processingAttempts: 1,
    processingLeaseUntil: null,
    nextProcessingAt: new Date(0),
    failureCode: null,
    draftExpiresAt: null,
    publishedAt: null,
    trashedAt: null,
    purgeAfter: null,
    createdAt: new Date('2026-09-16T13:00:00.000Z'),
    updatedAt: new Date('2026-09-16T13:00:00.000Z'),
  };
}

async function processSource(source: Buffer, declaredContentType: string) {
  const processingPhoto = {
    ...photo('PROCESSING'),
    declaredContentType,
    declaredSizeBytes: source.length,
  };
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: photoId }]),
    photo: {
      update: jest.fn().mockImplementation(() => Promise.resolve(processingPhoto)),
      findUnique: jest.fn().mockResolvedValue(processingPhoto),
    },
    photoVariant: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
      run(transaction),
    ),
    photo: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const uploaded: Array<{ key: string; body: Buffer }> = [];
  const storage = {
    getBuffer: jest.fn().mockResolvedValue(source),
    putWebp: jest.fn().mockImplementation((key: string, body: Buffer) => {
      uploaded.push({ key, body });
      return Promise.resolve();
    }),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PhotoProcessingService(
    { backgroundJobsEnabled: false, photos: { processingConcurrency: 1 } } as never,
    prisma as never,
    storage as never,
  );
  await expect(service.processOne()).resolves.toBe(true);
  return { prisma, transaction, uploaded };
}

describe('photo upload domain boundaries', () => {
  it('accepts 1–20 declarations and rejects empty, 21-item, oversized, future-date and invalid metadata inputs', () => {
    const valid = {
      contentType: 'image/jpeg',
      sizeBytes: 20 * 1024 * 1024,
      capturedOn: '2026-09-15',
    };
    expect(createPhotoBatchSchema.parse({ files: [valid] }).files).toHaveLength(1);
    expect(
      createPhotoBatchSchema.parse({ files: Array.from({ length: 20 }, () => valid) }).files,
    ).toHaveLength(20);
    expect(createPhotoBatchSchema.safeParse({ files: [] }).success).toBe(false);
    expect(
      createPhotoBatchSchema.safeParse({ files: Array.from({ length: 21 }, () => valid) }).success,
    ).toBe(false);
    expect(
      createPhotoBatchSchema.safeParse({ files: [{ ...valid, sizeBytes: 20 * 1024 * 1024 + 1 }] })
        .success,
    ).toBe(false);
    expect(
      createPhotoBatchSchema.safeParse({ files: [{ ...valid, capturedOn: '2999-01-01' }] }).success,
    ).toBe(false);
    expect(updatePhotoSchema.safeParse({}).success).toBe(false);
    expect(updatePhotoSchema.safeParse({ title: 'x'.repeat(81) }).success).toBe(false);
    expect(batchUpdatePhotosSchema.safeParse({ photoIds: [photoId] }).success).toBe(false);
  });

  it('defaults management pages to 20 and rejects limits above 50', () => {
    expect(managePhotosQuerySchema.parse({})).toEqual({ scope: 'mine', limit: 20 });
    expect(managePhotosQuerySchema.parse({ limit: '50', scope: 'family' })).toEqual({
      scope: 'family',
      limit: 50,
    });
    expect(managePhotosQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
  });

  it('keeps another member private draft hidden even from an owner, while owners can manage published photos', () => {
    const policy = new PhotoPolicyService({} as never, {} as never);
    const owner = membership('OWNER');
    const otherDraft = photo('DRAFT');
    otherDraft.createdByMembershipId = '00000000-0000-4000-8000-000000000099';
    expect(() => policy.requirePrivateOwner(owner, otherDraft)).toThrow(ApiProblemException);
    expect(policy.canManagePublished(owner, { ...otherDraft, status: 'PUBLISHED' })).toBe(true);
    expect(
      policy.canManagePublished(membership('MEMBER'), { ...otherDraft, status: 'PUBLISHED' }),
    ).toBe(false);
  });

  it('creates three static metadata-free WebP variants from a synthetic transparent PNG', async () => {
    const source = await sharp({
      create: {
        width: 900,
        height: 600,
        channels: 4,
        background: { r: 40, g: 90, b: 180, alpha: 0.5 },
      },
    })
      .withMetadata({ orientation: 6 })
      .png()
      .toBuffer();
    const { transaction, uploaded } = await processSource(source, 'image/png');
    expect(uploaded.map((item) => item.key)).toEqual([
      `photos/${photoId}/thumbnail.webp`,
      `photos/${photoId}/display.webp`,
      `photos/${photoId}/archive.webp`,
    ]);
    for (const item of uploaded) {
      const metadata = await sharp(item.body).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.pages ?? 1).toBe(1);
      expect(metadata.channels).toBe(4);
    }
    expect(transaction.photoVariant.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ kind: 'THUMBNAIL' }),
          expect.objectContaining({ kind: 'DISPLAY' }),
          expect.objectContaining({ kind: 'ARCHIVE' }),
        ]),
      }),
    );
    expect(transaction.photo.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT', sourceFormat: 'PNG' }),
      }),
    );
  });

  it.each([
    ['HEIC', 'synthetic-grid.heic', 'image/heic'],
    ['HEIF', 'synthetic-grid.heif', 'image/heif'],
  ] as const)(
    'decodes the repository-owned synthetic %s fixture through WASM',
    async (format, file, contentType) => {
      const source = await readFile(new URL(`./fixtures/${file}`, import.meta.url));
      const { transaction, uploaded } = await processSource(source, contentType);
      expect(uploaded).toHaveLength(3);
      for (const item of uploaded) {
        const metadata = await sharp(item.body).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.pages ?? 1).toBe(1);
        expect(metadata.exif).toBeUndefined();
        expect(metadata.icc).toBeUndefined();
        expect(metadata.xmp).toBeUndefined();
      }
      expect(transaction.photo.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DRAFT', sourceFormat: format }),
        }),
      );
    },
  );

  it('rejects disguised content and a 16384-pixel side with stable failure codes', async () => {
    const disguised = await processSource(Buffer.from('not a photo'), 'image/jpeg');
    expect(disguised.uploaded).toHaveLength(0);
    expect(disguised.prisma.photo.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          failureCode: 'PHOTO_FORMAT_UNSUPPORTED',
        }),
      }),
    );

    const tooWide = await sharp({
      create: {
        width: 16_384,
        height: 1,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .png()
      .toBuffer();
    const dimensions = await processSource(tooWide, 'image/png');
    expect(dimensions.uploaded).toHaveLength(0);
    expect(dimensions.prisma.photo.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          failureCode: 'PHOTO_DIMENSIONS_UNSUPPORTED',
        }),
      }),
    );
  });
});
