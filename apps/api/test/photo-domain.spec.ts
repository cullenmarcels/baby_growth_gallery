import { jest } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { FamilyMembership, Photo } from '../src/generated/prisma/client.js';
import { ApiProblemException } from '../src/common/api-problem.exception.js';
import { ObjectStorageService } from '../src/infrastructure/object-storage.service.js';
import { PhotoMaintenanceService } from '../src/photo/photo-maintenance.service.js';
import { PhotoPolicyService } from '../src/photo/photo-policy.service.js';
import { PhotoProcessingService } from '../src/photo/photo-processing.service.js';
import { PhotoService } from '../src/photo/photo.service.js';
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
    trashedByMembershipId: null,
    trashedByRole: null,
    purgeAfter: null,
    createdAt: new Date('2026-09-16T13:00:00.000Z'),
    updatedAt: new Date('2026-09-16T13:00:00.000Z'),
  };
}

async function processSource(source: Buffer, declaredContentType: string, currentPhoto?: Photo) {
  const processingPhoto = {
    ...photo('PROCESSING'),
    declaredContentType,
    declaredSizeBytes: source.length,
  };
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: photoId }]),
    photo: {
      update: jest.fn().mockImplementation(() => Promise.resolve(processingPhoto)),
      findUnique: jest.fn().mockResolvedValue(currentPhoto ?? processingPhoto),
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
  return { prisma, transaction, storage, uploaded };
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

  it('lets members restore only photos they themselves recycled as members', () => {
    const policy = new PhotoPolicyService({} as never, {} as never);
    const ownTrash = {
      ...photo('TRASHED'),
      trashedAt: new Date(),
      purgeAfter: new Date(Date.now() + 86_400_000),
      trashedByMembershipId: membershipId,
      trashedByRole: 'MEMBER' as const,
    };
    expect(policy.canRestore(membership('MEMBER'), ownTrash)).toBe(true);
    expect(policy.canRestore(membership('MEMBER'), { ...ownTrash, trashedByRole: 'ADMIN' })).toBe(
      false,
    );
    expect(
      policy.canRestore(membership('MEMBER'), {
        ...ownTrash,
        trashedByMembershipId: '00000000-0000-4000-8000-000000000098',
      }),
    ).toBe(false);
    expect(policy.canRestore(membership('MEMBER'), { ...ownTrash, trashedByRole: null })).toBe(
      false,
    );
    expect(
      policy.canRestore(membership('MEMBER'), {
        ...ownTrash,
        createdByMembershipId: '00000000-0000-4000-8000-000000000099',
      }),
    ).toBe(false);
    expect(policy.canRestore(membership('OWNER'), { ...ownTrash, trashedByRole: null })).toBe(true);
    expect(policy.canRestore(membership('ADMIN'), { ...ownTrash, trashedByRole: 'OWNER' })).toBe(
      true,
    );
    expect(
      policy.canRestore(membership('OWNER'), {
        ...ownTrash,
        purgeAfter: new Date(Date.now() - 1000),
      }),
    ).toBe(false);
  });

  it('records trash authority and rejects an author restoring an admin-recycled photo', async () => {
    const current = photo('PUBLISHED');
    const actor = membership('ADMIN');
    const policy = new PhotoPolicyService({} as never, {} as never);
    jest.spyOn(policy, 'requirePhoto').mockResolvedValue({ membership: actor, photo: current });
    const trashed = {
      ...current,
      status: 'TRASHED' as const,
      trashedAt: new Date(),
      purgeAfter: new Date(Date.now() + 86_400_000),
      trashedByMembershipId: actor.id,
      trashedByRole: 'ADMIN' as const,
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ role: 'ADMIN', status: 'ACTIVE' }]),
      photo: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(trashed),
      },
      babyProfile: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((run: (client: typeof prisma) => Promise<unknown>) =>
      run(prisma),
    );
    const service = new PhotoService(
      prisma as never,
      policy,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.trash('account', familyId, babyId, photoId)).resolves.toMatchObject({
      status: 'TRASHED',
      canRestore: true,
    });
    expect(prisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'TRASHED',
          trashedByMembershipId: actor.id,
          trashedByRole: 'ADMIN',
        }),
      }),
    );
    expect(prisma.babyProfile.updateMany).toHaveBeenCalledWith({
      where: { id: babyId, familyId, avatarPhotoId: photoId },
      data: { avatarPhotoId: null },
    });
    jest.spyOn(policy, 'requirePhoto').mockResolvedValue({
      membership: membership('MEMBER'),
      photo: trashed,
    });
    const rejected = service.restore('account', familyId, babyId, photoId);
    await expect(rejected).rejects.toMatchObject({
      status: 403,
      response: { code: 'PHOTO_RESTORE_ADMIN_REQUIRED' },
    });
    expect(prisma.photo.updateMany).toHaveBeenCalledTimes(1);
  });

  it('uses a conditional snapshot to restore a member-recycled photo and clears that snapshot', async () => {
    const actor = membership('MEMBER');
    const current = {
      ...photo('TRASHED'),
      trashedAt: new Date(),
      purgeAfter: new Date(Date.now() + 86_400_000),
      trashedByMembershipId: actor.id,
      trashedByRole: 'MEMBER' as const,
    };
    const policy = new PhotoPolicyService({} as never, {} as never);
    jest.spyOn(policy, 'requirePhoto').mockResolvedValue({ membership: actor, photo: current });
    const prisma = {
      photo: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...current,
          status: 'PUBLISHED',
          trashedAt: null,
          trashedByMembershipId: null,
          trashedByRole: null,
          purgeAfter: null,
        }),
      },
    };
    const service = new PhotoService(
      prisma as never,
      policy,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.restore('account', familyId, babyId, photoId)).resolves.toMatchObject({
      status: 'PUBLISHED',
      canRestore: false,
    });
    expect(prisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'TRASHED',
          trashedAt: current.trashedAt,
          trashedByMembershipId: actor.id,
          trashedByRole: 'MEMBER',
        }),
        data: expect.objectContaining({
          status: 'PUBLISHED',
          trashedByMembershipId: null,
          trashedByRole: null,
        }),
      }),
    );
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
    expect(disguised.prisma.photo.updateMany).toHaveBeenCalledWith(
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
    expect(dimensions.prisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          failureCode: 'PHOTO_DIMENSIONS_UNSUPPORTED',
        }),
      }),
    );
  });

  it('does not delete shared object keys when an expired worker no longer owns the attempt', async () => {
    const claimed = photo('PROCESSING');
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: photoId }]),
      photo: { update: jest.fn().mockResolvedValue(claimed) },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
      photo: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const storage = {
      getBuffer: jest.fn().mockResolvedValue(Buffer.from('not a photo')),
      delete: jest.fn(),
    };
    const service = new PhotoProcessingService(
      { backgroundJobsEnabled: false, photos: { processingConcurrency: 1 } } as never,
      prisma as never,
      storage as never,
    );

    await expect(service.processOne()).resolves.toBe(true);
    expect(prisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: photoId,
          processingAttempts: claimed.processingAttempts,
        }),
      }),
    );
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('does not commit variants from a superseded processing attempt', async () => {
    const source = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .png()
      .toBuffer();
    const newerAttempt = { ...photo('PROCESSING'), processingAttempts: 2 };
    const result = await processSource(source, 'image/png', newerAttempt);
    expect(result.uploaded).toHaveLength(3);
    expect(result.transaction.photoVariant.createMany).not.toHaveBeenCalled();
    expect(result.transaction.photo.update).toHaveBeenCalledTimes(1);
    expect(result.storage.delete).not.toHaveBeenCalled();
  });

  it('converts an expired third processing lease to a retained failure for cleanup', async () => {
    const transaction = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ acquired: true }]),
      photo: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
      photo: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const now = new Date('2026-09-16T15:00:00.000Z');
    const service = new PhotoMaintenanceService(
      { backgroundJobsEnabled: false } as never,
      prisma as never,
      { delete: jest.fn() } as never,
      {} as never,
    );

    await expect(service.purgeExpired(50, now)).resolves.toBe(0);
    expect(transaction.photo.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'PROCESSING',
        processingAttempts: { gte: 3 },
        processingLeaseUntil: { lte: now },
      },
      data: expect.objectContaining({
        status: 'FAILED',
        failureCode: 'PHOTO_PROCESSING_FAILED',
        processingLeaseUntil: null,
        nextProcessingAt: null,
        purgeAfter: new Date('2026-10-16T15:00:00.000Z'),
      }),
    });
  });

  it('lets the creator discard a processing photo through the object-first purge flow', async () => {
    const processingPhoto = photo('PROCESSING');
    const policy = {
      requirePhoto: jest.fn().mockResolvedValue({
        membership: membership('MEMBER'),
        photo: processingPhoto,
      }),
      requirePrivateOwner: jest.fn(),
      stateConflict: jest.fn(() => {
        throw new Error('unexpected state conflict');
      }),
    };
    const prisma = {
      photo: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const service = new PhotoService(
      prisma as never,
      policy as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.discard('account', familyId, babyId, photoId)).resolves.toBeUndefined();
    expect(prisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: photoId,
          status: { in: expect.arrayContaining(['PROCESSING']) },
        }),
        data: expect.objectContaining({ status: 'PURGING' }),
      }),
    );
  });

  it('provides a private thumbnail for an authorized trash manager without exposing it to a member', async () => {
    const trashed = photo('TRASHED');
    trashed.createdByMembershipId = '00000000-0000-4000-8000-000000000099';
    const current = membership('OWNER');
    const policy = {
      requirePhoto: jest.fn().mockResolvedValue({ membership: current, photo: trashed }),
      canManagePublished: jest.fn((actor: FamilyMembership) => actor.role === 'OWNER'),
      permissionDenied: jest.fn(() => {
        throw new ApiProblemException(403, '你没有权限执行此照片操作。', 'PHOTO_PERMISSION_DENIED');
      }),
      requirePrivateOwner: jest.fn(),
      notFound: jest.fn(() => {
        throw new Error('unexpected not found');
      }),
    };
    const prisma = {
      photoVariant: {
        findUnique: jest.fn().mockResolvedValue({ objectKey: `photos/${photoId}/thumbnail.webp` }),
      },
    };
    const storage = {
      signPrivateGet: jest
        .fn()
        .mockResolvedValue({ url: 'https://private.example/test', expiresAt: 'soon' }),
    };
    const service = new PhotoService(
      prisma as never,
      policy as never,
      {} as never,
      storage as never,
      {} as never,
    );
    await expect(
      service.preview('account', familyId, babyId, photoId, 'THUMBNAIL'),
    ).resolves.toEqual({ url: 'https://private.example/test', expiresAt: 'soon' });
    expect(storage.signPrivateGet).toHaveBeenCalledWith(`photos/${photoId}/thumbnail.webp`);
    policy.requirePhoto.mockResolvedValue({ membership: membership('MEMBER'), photo: trashed });
    await expect(
      service.preview('account', familyId, babyId, photoId, 'THUMBNAIL'),
    ).rejects.toThrow(ApiProblemException);
    expect(policy.permissionDenied).toHaveBeenCalledTimes(1);
    expect(storage.signPrivateGet).toHaveBeenCalledTimes(1);
  });

  it('signs a ten-minute browser POST bound to its private key, MIME and size range', async () => {
    const storage = new ObjectStorageService({
      s3: {
        endpoint: 'http://127.0.0.1:9000',
        publicEndpoint: 'http://127.0.0.1:9002',
        region: 'us-east-1',
        bucket: 'synthetic-test-bucket',
        accessKeyId: 'synthetic-access-key',
        secretAccessKey: 'synthetic-secret-key',
        forcePathStyle: true,
      },
    } as never);
    const key = `quarantine/${randomUUID()}`;
    const signed = await storage.createUpload(key, 'image/png');
    expect(signed.url).toBe('http://127.0.0.1:9002/synthetic-test-bucket');
    expect(signed.fields.key).toBe(key);
    expect(signed.fields['Content-Type']).toBe('image/png');
    const policy = JSON.parse(Buffer.from(signed.fields.Policy!, 'base64').toString('utf8')) as {
      expiration: string;
      conditions: unknown[];
    };
    expect(policy.conditions).toContainEqual(['eq', '$key', key]);
    expect(policy.conditions).toContainEqual(['eq', '$Content-Type', 'image/png']);
    expect(policy.conditions).toContainEqual(['content-length-range', 1, 20 * 1024 * 1024]);
    expect(new Date(policy.expiration).valueOf() - Date.now()).toBeGreaterThan(590_000);
    expect(new Date(policy.expiration).valueOf() - Date.now()).toBeLessThanOrEqual(600_000);
    const short = await storage.createUpload(key, 'image/png', 45);
    const shortPolicy = JSON.parse(
      Buffer.from(short.fields.Policy!, 'base64').toString('utf8'),
    ) as {
      expiration: string;
    };
    expect(new Date(shortPolicy.expiration).valueOf() - Date.now()).toBeGreaterThan(40_000);
    expect(new Date(shortPolicy.expiration).valueOf() - Date.now()).toBeLessThanOrEqual(45_000);
    storage.onModuleDestroy();
  });

  it('clamps a reissued credential to the remaining upload window', async () => {
    const awaiting = photo('AWAITING_UPLOAD');
    awaiting.uploadWindowExpiresAt = new Date(Date.now() + 45_000);
    const policy = {
      requirePhoto: jest.fn().mockResolvedValue({ membership: membership(), photo: awaiting }),
      requirePrivateOwner: jest.fn(),
      notFound: jest.fn(),
      stateConflict: jest.fn(),
    };
    const storage = {
      createUpload: jest.fn().mockResolvedValue({
        url: 'https://private.example/post',
        fields: {},
        expiresAt: new Date(Date.now() + 40_000).toISOString(),
      }),
    };
    const service = new PhotoService(
      {} as never,
      policy as never,
      {} as never,
      storage as never,
      {} as never,
    );
    await expect(
      service.reissue('account', familyId, babyId, batchId, photoId),
    ).resolves.toMatchObject({
      photoId,
    });
    expect(storage.createUpload).toHaveBeenCalledWith(
      awaiting.quarantineObjectKey,
      awaiting.declaredContentType,
      expect.any(Number),
    );
    const seconds = storage.createUpload.mock.calls[0]![2] as number;
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(45);
  });

  it('publishes every selected draft with one activity each in the same transaction', async () => {
    const first = photo('DRAFT');
    const second = { ...photo('DRAFT'), id: '00000000-0000-4000-8000-000000000008' };
    const transaction = {
      photo: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([first, second])
          .mockResolvedValueOnce([
            { ...first, status: 'PUBLISHED' },
            { ...second, status: 'PUBLISHED' },
          ]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
    };
    const policy = {
      requireActiveBaby: jest.fn().mockResolvedValue({ membership: membership() }),
      canRestore: jest.fn().mockReturnValue(false),
    };
    const activities = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new PhotoService(
      prisma as never,
      policy as never,
      {} as never,
      {} as never,
      activities as never,
    );
    const result = await service.publish('account', familyId, babyId, batchId, {
      photoIds: [first.id, second.id],
    });
    expect(result.items.map((item) => item.status)).toEqual(['PUBLISHED', 'PUBLISHED']);
    expect(transaction.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [first.id, second.id] }, status: 'DRAFT' },
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    );
    expect(activities.record).toHaveBeenCalledTimes(2);
    for (const id of [first.id, second.id]) {
      expect(activities.record).toHaveBeenCalledWith(transaction, {
        familyId,
        actorMembershipId: membershipId,
        type: 'PHOTO_UPLOADED',
        subjectType: 'PHOTO',
        subjectId: id,
        summary: { babyId },
        occurredAt: expect.any(Date),
      });
    }
  });

  it('rejects an invalid selected draft before any publish or activity write', async () => {
    const transaction = {
      photo: {
        findMany: jest
          .fn()
          .mockResolvedValue([photo('DRAFT'), { ...photo('QUEUED'), id: randomUUID() }]),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
    };
    const policy = { requireActiveBaby: jest.fn().mockResolvedValue({ membership: membership() }) };
    const activities = { record: jest.fn() };
    const service = new PhotoService(
      prisma as never,
      policy as never,
      {} as never,
      {} as never,
      activities as never,
    );
    await expect(
      service.publish('account', familyId, babyId, batchId, {
        photoIds: [photoId, randomUUID()],
      }),
    ).rejects.toThrow(ApiProblemException);
    expect(transaction.photo.updateMany).not.toHaveBeenCalled();
    expect(activities.record).not.toHaveBeenCalled();
  });

  it('keeps a PURGING database row and activity until every object deletion succeeds', async () => {
    const deleting = {
      ...photo('PURGING'),
      variants: [],
    };
    const transaction = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ acquired: true }]),
      photo: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ id: photoId }]),
        delete: jest.fn(),
      },
      photoUploadBatch: { deleteMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
      photo: {
        findFirst: jest.fn().mockResolvedValue(deleting),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const storage = {
      delete: jest.fn((key: string) =>
        key.startsWith('photos/')
          ? Promise.reject(new Error('synthetic storage outage'))
          : Promise.resolve(),
      ),
    };
    const activities = { tombstoneSubject: jest.fn() };
    const service = new PhotoMaintenanceService(
      { backgroundJobsEnabled: false } as never,
      prisma as never,
      storage as never,
      activities as never,
    );
    await expect(service.purgeExpired()).resolves.toBe(0);
    expect(storage.delete).toHaveBeenCalledWith(deleting.quarantineObjectKey);
    expect(storage.delete).toHaveBeenCalledWith(`photos/${photoId}/thumbnail.webp`);
    expect(transaction.photo.delete).not.toHaveBeenCalled();
    expect(activities.tombstoneSubject).not.toHaveBeenCalled();
  });

  it('removes unrecorded processing variants before deleting a failed photo row', async () => {
    const deleting = { ...photo('PURGING'), variants: [] };
    const transaction = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{ acquired: true }]),
      photo: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ id: photoId }]),
        delete: jest.fn().mockResolvedValue(deleting),
      },
      photoUploadBatch: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
      photo: {
        findFirst: jest.fn().mockResolvedValue(deleting),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const storage = { delete: jest.fn().mockResolvedValue(undefined) };
    const activities = { tombstoneSubject: jest.fn().mockResolvedValue(undefined) };
    const service = new PhotoMaintenanceService(
      { backgroundJobsEnabled: false } as never,
      prisma as never,
      storage as never,
      activities as never,
    );

    await expect(service.purgeExpired()).resolves.toBe(1);
    expect(storage.delete.mock.calls.map(([key]) => key)).toEqual([
      deleting.quarantineObjectKey,
      `photos/${photoId}/thumbnail.webp`,
      `photos/${photoId}/display.webp`,
      `photos/${photoId}/archive.webp`,
    ]);
    expect(activities.tombstoneSubject).toHaveBeenCalledWith(
      transaction,
      familyId,
      'PHOTO',
      photoId,
    );
    expect(transaction.photo.delete).toHaveBeenCalledWith({ where: { id: photoId } });
  });
});
