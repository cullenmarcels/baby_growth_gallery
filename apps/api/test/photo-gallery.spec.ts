import { jest } from '@jest/globals';
import type { BabyProfile, FamilyMembership, Photo } from '../src/generated/prisma/client.js';
import { BabyService } from '../src/baby/baby.service.js';
import { PhotoService } from '../src/photo/photo.service.js';
import { publishedPhotosQuerySchema } from '../src/photo/photo.schemas.js';

const accountId = '00000000-0000-4000-8000-000000000001';
const familyId = '00000000-0000-4000-8000-000000000002';
const babyId = '00000000-0000-4000-8000-000000000003';
const photoId = '00000000-0000-4000-8000-000000000004';
const membershipId = '00000000-0000-4000-8000-000000000005';

function member(role: FamilyMembership['role'] = 'MEMBER'): FamilyMembership {
  return {
    id: membershipId,
    accountId,
    familyId,
    role,
    status: 'ACTIVE',
    displayName: '合成成员',
    joinedAt: new Date(0),
    leftAt: null,
    updatedAt: new Date(0),
  };
}

function published(
  id = photoId,
  capturedOn = '2026-09-16',
  publishedAt = '2026-09-17T02:00:00.000Z',
): Photo {
  return {
    id,
    familyId,
    babyId,
    uploadBatchId: '00000000-0000-4000-8000-000000000006',
    createdByMembershipId: membershipId,
    status: 'PUBLISHED',
    declaredContentType: 'image/png',
    declaredSizeBytes: 100,
    sourceFormat: 'PNG',
    sourceSizeBytes: 100,
    sourceSha256: null,
    sourceWidth: 20,
    sourceHeight: 20,
    title: '合成照片',
    description: null,
    capturedOn: new Date(`${capturedOn}T00:00:00.000Z`),
    location: null,
    displayOrder: 0,
    quarantineObjectKey: 'quarantine/synthetic',
    uploadWindowExpiresAt: new Date(0),
    processingAttempts: 1,
    processingLeaseUntil: null,
    nextProcessingAt: new Date(0),
    failureCode: null,
    draftExpiresAt: null,
    publishedAt: new Date(publishedAt),
    trashedAt: null,
    trashedByMembershipId: null,
    trashedByRole: null,
    purgeAfter: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function serviceWith(rows: Photo[], role: FamilyMembership['role'] = 'MEMBER') {
  const findMany = jest.fn().mockResolvedValue(rows);
  const findFirst = jest.fn().mockResolvedValue(null);
  const milestoneFindMany = jest.fn().mockResolvedValue([]);
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([{ role, status: 'ACTIVE' }]),
    photo: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(published()),
    },
    babyProfile: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    milestonePhoto: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const prisma = {
    photo: { findMany, findFirst },
    milestone: { findMany: milestoneFindMany },
    $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
      run(transaction),
    ),
  };
  const policy = {
    requireActiveBaby: jest.fn().mockResolvedValue({ membership: member(role) }),
    requirePhoto: jest.fn().mockResolvedValue({ membership: member(role), photo: published() }),
    canManagePublished: jest.fn(
      (membership: FamilyMembership, photo: Photo) =>
        ['OWNER', 'ADMIN'].includes(membership.role) ||
        membership.id === photo.createdByMembershipId,
    ),
    canRestore: jest.fn().mockReturnValue(false),
    notFound: jest.fn(() => {
      throw new Error('PHOTO_NOT_FOUND');
    }),
    permissionDenied: jest.fn(() => {
      throw new Error('PHOTO_PERMISSION_DENIED');
    }),
    stateConflict: jest.fn(() => {
      throw new Error('PHOTO_STATE_CONFLICT');
    }),
  };
  const service = new PhotoService(
    prisma as never,
    policy as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, prisma, policy, transaction, findMany, findFirst, milestoneFindMany };
}

describe('published gallery and avatar boundaries', () => {
  it('uses the stable descending order and scopes both pages to published photos of one baby', async () => {
    const rows = [published(), published('00000000-0000-4000-8000-000000000007', '2026-09-15')];
    const { service, findMany } = serviceWith(rows);
    const first = await service.published(accountId, familyId, babyId, { limit: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBeTruthy();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId, babyId, status: 'PUBLISHED' },
        orderBy: [{ capturedOn: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }],
        take: 2,
      }),
    );
    await service.published(accountId, familyId, babyId, { limit: 1, cursor: first.nextCursor! });
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          familyId,
          babyId,
          status: 'PUBLISHED',
          OR: expect.any(Array),
        }),
      }),
    );
    const timeline = await service.timeline(accountId, familyId, babyId, { limit: 1 });
    expect(timeline.items[0]).toMatchObject({ kind: 'PHOTO', eventOn: '2026-09-16' });
  });

  it('rejects invalid cursors and keeps detail within the same family, baby and published state', async () => {
    expect(publishedPhotosQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    const { service, findFirst } = serviceWith([]);
    await expect(
      service.published(accountId, familyId, babyId, { limit: 20, cursor: 'invalid' }),
    ).rejects.toMatchObject({ response: { code: 'CURSOR_INVALID' } });
    await expect(service.publishedDetail(accountId, familyId, babyId, photoId)).rejects.toThrow(
      'PHOTO_NOT_FOUND',
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: photoId, familyId, babyId, status: 'PUBLISHED' },
    });
  });

  it('accepts legacy photo cursors and puts a milestone before a photo at an exact timestamp tie', async () => {
    const tiedPhoto = published(photoId, '2026-09-16', '2026-09-17T02:00:00.000Z');
    const { service, milestoneFindMany } = serviceWith([tiedPhoto]);
    milestoneFindMany.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000077',
        familyId,
        babyId,
        createdByMembershipId: membershipId,
        source: 'CUSTOM',
        templateKey: null,
        title: '第一次看海',
        state: 'COMPLETED',
        reminderOn: null,
        completedOn: new Date('2026-09-16T00:00:00.000Z'),
        completionNote: null,
        completedAt: new Date('2026-09-17T02:00:00.000Z'),
        version: 1,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        createdBy: { id: membershipId, displayName: '合成成员' },
        _count: { photos: 0 },
      },
    ]);
    const page = await service.timeline(accountId, familyId, babyId, { limit: 1 });
    expect(page.items[0]?.kind).toBe('MILESTONE');
    expect(page.nextCursor).toBeTruthy();
    const legacy = Buffer.from(
      JSON.stringify({
        v: 1,
        capturedOn: tiedPhoto.capturedOn.toISOString().slice(0, 10),
        publishedAt: tiedPhoto.publishedAt!.toISOString(),
        id: tiedPhoto.id,
      }),
    ).toString('base64url');
    await expect(
      service.timeline(accountId, familyId, babyId, { limit: 20, cursor: legacy }),
    ).resolves.toBeDefined();
  });

  it('calculates adjacent IDs in the same order and returns server-side manage permission', async () => {
    const { service, findFirst } = serviceWith([], 'ADMIN');
    findFirst
      .mockResolvedValueOnce(published())
      .mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000008' })
      .mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000009' });
    const result = await service.publishedDetail(accountId, familyId, babyId, photoId);
    expect(result).toMatchObject({
      canManage: true,
      previousPhotoId: '00000000-0000-4000-8000-000000000008',
      nextPhotoId: '00000000-0000-4000-8000-000000000009',
    });
    expect(findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ familyId, babyId, status: 'PUBLISHED' }),
        orderBy: [{ capturedOn: 'asc' }, { publishedAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(findFirst).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({ familyId, babyId, status: 'PUBLISHED' }),
        orderBy: [{ capturedOn: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('clears the avatar in the same transaction as photo recycling', async () => {
    const { service, transaction } = serviceWith([]);
    await service.trash(accountId, familyId, babyId, photoId);
    expect(transaction.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: photoId, familyId, babyId, status: 'PUBLISHED' } }),
    );
    expect(transaction.babyProfile.updateMany).toHaveBeenCalledWith({
      where: { id: babyId, familyId, avatarPhotoId: photoId },
      data: { avatarPhotoId: null },
    });
    expect(transaction.milestonePhoto.deleteMany).toHaveBeenCalledWith({
      where: { photoId },
    });
  });

  it('rejects recycling if manager authority is revoked before the membership lock', async () => {
    const { service, transaction, policy } = serviceWith([], 'OWNER');
    transaction.$queryRaw.mockResolvedValue([{ role: 'MEMBER', status: 'ACTIVE' }]);
    policy.requirePhoto.mockResolvedValue({
      membership: member('OWNER'),
      photo: { ...published(), createdByMembershipId: '00000000-0000-4000-8000-000000000099' },
    });
    await expect(service.trash(accountId, familyId, babyId, photoId)).rejects.toThrow(
      'PHOTO_PERMISSION_DENIED',
    );
    expect(transaction.photo.updateMany).not.toHaveBeenCalled();
    expect(transaction.babyProfile.updateMany).not.toHaveBeenCalled();
  });

  it('allows avatar selection only after rechecking manager role and a locked published photo', async () => {
    const baby: BabyProfile = {
      id: babyId,
      familyId,
      createdByMembershipId: membershipId,
      nickname: '合成宝宝',
      birthDate: new Date('2026-01-01'),
      sex: null,
      avatarPhotoId: photoId,
      status: 'ACTIVE',
      archivedAt: null,
      purgeAfter: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ role: 'OWNER', status: 'ACTIVE' }])
        .mockResolvedValueOnce([{ status: 'PUBLISHED' }]),
      babyProfile: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(baby),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
    };
    const policy = {
      requireBaby: jest.fn().mockResolvedValue({ membership: member('OWNER'), baby }),
      requireManager: jest.fn(),
      notFound: jest.fn(() => {
        throw new Error('BABY_NOT_FOUND');
      }),
      stateConflict: jest.fn(() => {
        throw new Error('BABY_STATE_CONFLICT');
      }),
    };
    const service = new BabyService(prisma as never, policy as never);
    expect((await service.setAvatar(accountId, familyId, babyId, photoId)).avatarPhotoId).toBe(
      photoId,
    );
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
    expect(transaction.babyProfile.updateMany).toHaveBeenCalledWith({
      where: { id: babyId, familyId, status: 'ACTIVE' },
      data: { avatarPhotoId: photoId },
    });

    transaction.$queryRaw.mockReset().mockResolvedValueOnce([{ role: 'MEMBER', status: 'ACTIVE' }]);
    policy.requireManager.mockImplementation(() => {
      throw new Error('BABY_PERMISSION_DENIED');
    });
    await expect(service.setAvatar(accountId, familyId, babyId, photoId)).rejects.toThrow(
      'BABY_PERMISSION_DENIED',
    );
    expect(transaction.babyProfile.updateMany).toHaveBeenCalledTimes(1);
  });
});
