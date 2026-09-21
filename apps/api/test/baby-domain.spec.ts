import { jest } from '@jest/globals';
import type { BabyProfile, FamilyMembership } from '../src/generated/prisma/client.js';
import { ApiProblemException } from '../src/common/api-problem.exception.js';
import { BabyMaintenanceService } from '../src/baby/baby-maintenance.service.js';
import { BabyPolicyService } from '../src/baby/baby-policy.service.js';
import { BabyService } from '../src/baby/baby.service.js';
import { createBabySchema, updateBabySchema } from '../src/baby/baby.schemas.js';
import { AuthSessionService } from '../src/auth/session.service.js';

const familyId = '00000000-0000-4000-8000-000000000001';
const babyId = '00000000-0000-4000-8000-000000000002';

function membership(role: FamilyMembership['role']): FamilyMembership {
  return {
    id: '00000000-0000-4000-8000-000000000003',
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

function baby(status: BabyProfile['status'] = 'ACTIVE'): BabyProfile {
  return {
    id: babyId,
    familyId,
    createdByMembershipId: '00000000-0000-4000-8000-000000000003',
    nickname: '小星星',
    birthDate: new Date('2026-01-02T00:00:00.000Z'),
    sex: null,
    status,
    archivedAt: status === 'ARCHIVED' ? new Date('2026-08-01T00:00:00.000Z') : null,
    purgeAfter: status === 'ARCHIVED' ? new Date('2026-09-01T00:00:00.000Z') : null,
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    updatedAt: new Date('2026-01-03T00:00:00.000Z'),
  };
}

describe('baby profile domain boundaries', () => {
  it('trims Unicode nicknames, accepts optional sex, and rejects future birthdays', () => {
    expect(createBabySchema.parse({ nickname: '  小星星  ', birthDate: '2026-01-02' })).toEqual({
      nickname: '小星星',
      birthDate: '2026-01-02',
    });
    expect(
      createBabySchema.safeParse({ nickname: '宝'.repeat(31), birthDate: '2026-01-02' }).success,
    ).toBe(false);
    expect(createBabySchema.safeParse({ nickname: '宝宝', birthDate: '2999-01-01' }).success).toBe(
      false,
    );
    expect(updateBabySchema.safeParse({}).success).toBe(false);
  });

  it('accepts the current China calendar date around the UTC day boundary', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-14T16:30:00.000Z'));
    expect(
      createBabySchema.safeParse({ nickname: '今日宝宝', birthDate: '2026-09-15' }).success,
    ).toBe(true);
    jest.useRealTimers();
  });

  it('allows OWNER and ADMIN management but rejects MEMBER', () => {
    const policy = new BabyPolicyService({} as never, {} as never);
    expect(() => policy.requireManager(membership('OWNER'))).not.toThrow();
    expect(() => policy.requireManager(membership('ADMIN'))).not.toThrow();
    expect(() => policy.requireManager(membership('MEMBER'))).toThrow(ApiProblemException);
  });

  it('archives for 30 days and returns a stable public summary', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new BabyService(
      { babyProfile: { updateMany } } as never,
      {
        requireBaby: jest.fn().mockResolvedValue({ membership: membership('OWNER'), baby: baby() }),
        requireManager: jest.fn(),
      } as never,
    );
    const before = Date.now();
    await service.archive('account', familyId, babyId);
    const data = updateMany.mock.calls[0]?.[0] as { data: { archivedAt: Date; purgeAfter: Date } };
    expect(data.data.purgeAfter.valueOf() - data.data.archivedAt.valueOf()).toBe(30 * 86_400_000);
    expect(data.data.archivedAt.valueOf()).toBeGreaterThanOrEqual(before);
  });

  it('rejects restoration at or after the expiry boundary', async () => {
    const expired = baby('ARCHIVED');
    expired.purgeAfter = new Date(0);
    const service = new BabyService(
      { babyProfile: { updateMany: jest.fn() } } as never,
      {
        requireBaby: jest
          .fn()
          .mockResolvedValue({ membership: membership('OWNER'), baby: expired }),
        requireManager: jest.fn(),
      } as never,
    );
    await expect(service.restore('account', familyId, babyId)).rejects.toMatchObject({
      response: { code: 'BABY_RESTORE_EXPIRED' },
    });
  });

  it('uses an advisory transaction lock and deletes only claimed expired rows', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ acquired: true }])
      .mockResolvedValueOnce([{ id: babyId }]);
    const transaction = {
      $queryRawUnsafe: query,
      babyProfile: { updateMany, deleteMany },
      milestone: { findMany: jest.fn().mockResolvedValue([]) },
      familyActivity: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = {
      $transaction: jest.fn(async (run: (client: typeof transaction) => Promise<number>) =>
        run(transaction),
      ),
    };
    const maintenance = new BabyMaintenanceService(
      prisma as never,
      { backgroundJobsEnabled: false } as never,
    );
    await expect(maintenance.purgeExpired(500, new Date('2026-09-15T00:00:00.000Z'))).resolves.toBe(
      1,
    );
    expect(query.mock.calls[1]?.[2]).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PURGING' } }),
    );
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PURGING' }) }),
    );
  });

  it('repairs an invalid active baby with the newest active baby in the current family', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: '00000000-0000-4000-8000-000000000099' });
    const sessions = new AuthSessionService(
      {} as never,
      {
        familyMembership: {
          findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
        },
        babyProfile: { findFirst },
      } as never,
      {} as never,
    );
    const request = {
      session: { activeFamilyId: familyId, activeBabyId: babyId },
    } as never;
    await expect(sessions.reconcileActiveBaby(request, 'account')).resolves.toBe(
      '00000000-0000-4000-8000-000000000099',
    );
    expect((request as { session: { activeBabyId: string } }).session.activeBabyId).toBe(
      '00000000-0000-4000-8000-000000000099',
    );
    expect(findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});
