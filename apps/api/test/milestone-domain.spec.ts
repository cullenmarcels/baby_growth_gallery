import { jest } from '@jest/globals';
import type { FamilyMembership, Milestone } from '../src/generated/prisma/client.js';
import { MilestonePolicyService } from '../src/milestone/milestone-policy.service.js';
import {
  completeMilestoneSchema,
  createMilestoneSchema,
  milestoneListQuerySchema,
  updateMilestoneSchema,
} from '../src/milestone/milestone.schemas.js';
import { MILESTONE_TEMPLATES, MilestoneService } from '../src/milestone/milestone.service.js';

const familyId = '00000000-0000-4000-8000-000000000001';
const babyId = '00000000-0000-4000-8000-000000000002';
const membershipId = '00000000-0000-4000-8000-000000000003';

function membership(role: FamilyMembership['role'] = 'MEMBER'): FamilyMembership {
  return {
    id: membershipId,
    familyId,
    accountId: '00000000-0000-4000-8000-000000000004',
    role,
    status: 'ACTIVE',
    displayName: '合成成员',
    joinedAt: new Date(0),
    leftAt: null,
    updatedAt: new Date(0),
  };
}

describe('milestone domain boundaries', () => {
  it('keeps twelve stable neutral templates and trims custom titles', () => {
    expect(MILESTONE_TEMPLATES).toHaveLength(12);
    expect(new Set(MILESTONE_TEMPLATES.map(([key]) => key)).size).toBe(12);
    expect(MILESTONE_TEMPLATES.map(([, title]) => title)).toEqual([
      '第一次翻身',
      '第一次独坐',
      '第一次爬行',
      '第一次站立',
      '迈出第一步',
      '第一次笑出声',
      '第一次叫家人',
      '第一次挥手',
      '第一次抓握',
      '第一次吃辅食',
      '长出第一颗牙',
      '第一次自己吃饭',
    ]);
    expect(createMilestoneSchema.parse({ source: 'CUSTOM', title: '  第一次看海  ' })).toEqual({
      source: 'CUSTOM',
      title: '第一次看海',
    });
  });

  it('accepts photo arrays for domain error mapping and rejects invalid versions and empty updates', () => {
    const photoId = '00000000-0000-4000-8000-000000000010';
    const base = { expectedVersion: 1, completedOn: '2026-09-20', completionNote: null };
    expect(
      completeMilestoneSchema.safeParse({ ...base, photoIds: [photoId, photoId] }).success,
    ).toBe(true);
    expect(
      completeMilestoneSchema.safeParse({
        ...base,
        photoIds: Array.from(
          { length: 11 },
          (_, index) => `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
        ),
      }).success,
    ).toBe(true);
    expect(updateMilestoneSchema.safeParse({ expectedVersion: 1 }).success).toBe(false);
    expect(milestoneListQuerySchema.safeParse({ state: 'PENDING', limit: 51 }).success).toBe(false);
  });

  it('allows the author and current managers to manage, while other members remain read only', () => {
    const policy = new MilestonePolicyService({} as never, {} as never);
    expect(policy.canManage(membership('OWNER'), { createdByMembershipId: 'someone-else' })).toBe(
      true,
    );
    expect(policy.canManage(membership('ADMIN'), { createdByMembershipId: 'someone-else' })).toBe(
      true,
    );
    expect(policy.canManage(membership('MEMBER'), { createdByMembershipId: membershipId })).toBe(
      true,
    );
    expect(policy.canManage(membership('MEMBER'), { createdByMembershipId: 'someone-else' })).toBe(
      false,
    );
  });

  it('rejects a newly set reminder in the past with a stable date error', async () => {
    const service = new MilestoneService({} as never, {} as never, {} as never);
    await expect(
      service.create('account', familyId, babyId, {
        source: 'CUSTOM',
        title: '过去的提醒',
        reminderOn: '2000-01-01',
      }),
    ).rejects.toMatchObject({ response: { code: 'MILESTONE_DATE_INVALID' } });
  });

  it('marks already-added templates and calculates progress from current checklist rows', async () => {
    const prisma = {
      milestone: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ templateKey: 'FIRST_STEP' }])
          .mockResolvedValueOnce([]),
        count: jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1),
      },
    };
    const policy = {
      requireActiveBaby: jest.fn().mockResolvedValue({ membership: membership() }),
      canManage: jest.fn().mockReturnValue(true),
    };
    const service = new MilestoneService(prisma as never, policy as never, {} as never);
    const templates = await service.templates('account', familyId, babyId);
    expect(templates.items.find(({ key }) => key === 'FIRST_STEP')?.isAdded).toBe(true);
    expect(templates.items.find(({ key }) => key === 'FIRST_CRAWL')?.isAdded).toBe(false);
    await expect(
      service.overview('account', familyId, babyId, { fromOn: '2026-09-20', limit: 20 }),
    ).resolves.toEqual({ progress: { completed: 1, total: 3 }, reminders: [], nextCursor: null });
  });

  it('returns stable domain codes for duplicate and excessive photo selections', async () => {
    const pending = {
      id: '00000000-0000-4000-8000-000000000020',
      familyId,
      babyId,
      createdByMembershipId: membershipId,
      source: 'CUSTOM',
      templateKey: null,
      title: '第一次看海',
      state: 'PENDING',
      reminderOn: null,
      completedOn: null,
      completionNote: null,
      completedAt: null,
      version: 1,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as const;
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: babyId, role: 'MEMBER', status: 'ACTIVE' }]),
      milestone: { findFirst: jest.fn().mockResolvedValue(pending), updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
    };
    const policy = {
      requireActiveBaby: jest.fn().mockResolvedValue({
        membership: membership(),
        baby: { birthDate: new Date('2020-01-01T00:00:00.000Z') },
      }),
      canManage: jest.fn().mockReturnValue(true),
      notFound: jest.fn(),
      permissionDenied: jest.fn(),
      stateConflict: jest.fn(),
    };
    const service = new MilestoneService(prisma as never, policy as never, {} as never);
    const completedOn = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
    const duplicate = '00000000-0000-4000-8000-000000000030';
    await expect(
      service.complete('account', familyId, babyId, pending.id, {
        expectedVersion: 1,
        completedOn,
        completionNote: null,
        photoIds: [duplicate, duplicate],
      }),
    ).rejects.toMatchObject({ response: { code: 'MILESTONE_PHOTO_DUPLICATED' } });
    await expect(
      service.complete('account', familyId, babyId, pending.id, {
        expectedVersion: 1,
        completedOn,
        completionNote: null,
        photoIds: Array.from(
          { length: 11 },
          (_, index) => `00000000-0000-4000-8000-${String(index + 30).padStart(12, '0')}`,
        ),
      }),
    ).rejects.toMatchObject({ response: { code: 'MILESTONE_PHOTO_LIMIT_EXCEEDED' } });
    expect(transaction.milestone.updateMany).not.toHaveBeenCalled();
  });

  it('completes one pending item with ordered published photos and one family activity', async () => {
    const milestone: Milestone = {
      id: '00000000-0000-4000-8000-000000000020',
      familyId,
      babyId,
      createdByMembershipId: membershipId,
      source: 'CUSTOM',
      templateKey: null,
      title: '第一次看海',
      state: 'PENDING',
      reminderOn: null,
      completedOn: null,
      completionNote: null,
      completedAt: null,
      version: 1,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    const photoIds = [
      '00000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000022',
    ];
    const completed = {
      ...milestone,
      state: 'COMPLETED' as const,
      completedOn: new Date('2026-09-20T00:00:00.000Z'),
      completedAt: new Date('2026-09-20T08:00:00.000Z'),
      version: 2,
      createdBy: { id: membershipId, displayName: '合成成员' },
      _count: { photos: 2 },
      photos: [],
    };
    const transaction = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ role: 'MEMBER', status: 'ACTIVE' }])
        .mockResolvedValueOnce([{ id: babyId }])
        .mockResolvedValueOnce([{ id: milestone.id }])
        .mockResolvedValueOnce([{ id: photoIds[0] }])
        .mockResolvedValueOnce([{ id: photoIds[1] }]),
      milestone: {
        findFirst: jest.fn().mockResolvedValueOnce(milestone).mockResolvedValueOnce(completed),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      photo: { findMany: jest.fn().mockResolvedValue(photoIds.map((id) => ({ id }))) },
      milestonePhoto: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<unknown>) =>
        run(transaction),
      ),
    };
    const policy = {
      requireActiveBaby: jest.fn().mockResolvedValue({
        membership: membership(),
        baby: { birthDate: new Date('2026-01-01T00:00:00.000Z') },
      }),
      canManage: jest.fn().mockReturnValue(true),
      notFound: jest.fn(() => {
        throw new Error('MILESTONE_NOT_FOUND');
      }),
      permissionDenied: jest.fn(),
      stateConflict: jest.fn(),
    };
    const activities = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new MilestoneService(prisma as never, policy as never, activities as never);
    await expect(
      service.complete('account', familyId, babyId, milestone.id, {
        expectedVersion: 1,
        completedOn: '2026-09-20',
        completionNote: '合成说明',
        photoIds,
      }),
    ).resolves.toMatchObject({ state: 'COMPLETED', version: 2 });
    expect(transaction.milestonePhoto.createMany).toHaveBeenCalledWith({
      data: [
        { milestoneId: milestone.id, photoId: photoIds[0], displayOrder: 0 },
        { milestoneId: milestone.id, photoId: photoIds[1], displayOrder: 1 },
      ],
    });
    expect(activities.record).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        familyId,
        type: 'MILESTONE_RECORDED',
        subjectType: 'MILESTONE',
        subjectId: milestone.id,
        summary: { babyId },
      }),
    );
  });
});
