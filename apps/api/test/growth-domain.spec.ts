import { jest } from '@jest/globals';
import {
  Prisma,
  type FamilyMembership,
  type GrowthRecord,
} from '../src/generated/prisma/client.js';
import { canRestoreGrowth, GrowthService } from '../src/growth/growth.service.js';
import { GrowthMaintenanceService } from '../src/growth/growth-maintenance.service.js';
import { growthInputSchema, growthUpdateSchema } from '../src/growth/growth.schemas.js';

const membership = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'MEMBER',
  status: 'ACTIVE',
} as FamilyMembership;
const record = {
  id: '00000000-0000-4000-8000-000000000002',
  createdByMembershipId: membership.id,
  status: 'TRASHED',
  version: 1,
  trashedByMembershipId: membership.id,
  trashedByRole: 'MEMBER',
  purgeAfter: new Date('2099-01-01'),
  measuredOn: new Date('2026-01-01'),
  lengthCm: null,
  weightKg: new Prisma.Decimal(4),
  headCm: null,
  measurementPosition: null,
  note: null,
  createdBy: { displayName: '合成记录者' },
} as GrowthRecord & { createdBy: { displayName: string } };

describe('growth record domain and lifecycle', () => {
  it('rejects precision, calendar, type, version and empty-patch errors', () => {
    expect(growthInputSchema.safeParse({ measuredOn: '2026-02-30', weightKg: 4 }).success).toBe(
      false,
    );
    expect(growthInputSchema.safeParse({ measuredOn: '2026-02-01', weightKg: 4.001 }).success).toBe(
      false,
    );
    expect(growthInputSchema.safeParse({ measuredOn: '2026-02-01', lengthCm: 50.01 }).success).toBe(
      false,
    );
    expect(growthInputSchema.safeParse({ measuredOn: '2026-02-01', headCm: 0 }).success).toBe(
      false,
    );
    expect(
      growthInputSchema.safeParse({ measuredOn: '2026-02-01', weightKg: Infinity }).success,
    ).toBe(false);
    expect(growthUpdateSchema.safeParse({ expectedVersion: 0, weightKg: 4 }).success).toBe(false);
    expect(growthUpdateSchema.safeParse({ expectedVersion: 1 }).success).toBe(false);
    expect(growthInputSchema.safeParse({ measuredOn: '2026-02-01', weightKg: 4.01 }).success).toBe(
      true,
    );
  });

  it('author recovery requires their own MEMBER trash snapshot; role changes do not erase the snapshot', () => {
    expect(canRestoreGrowth(membership, record)).toBe(true);
    expect(canRestoreGrowth(membership, { ...record, trashedByRole: 'ADMIN' })).toBe(false);
    expect(canRestoreGrowth(membership, { ...record, trashedByMembershipId: 'other' })).toBe(false);
    expect(canRestoreGrowth({ ...membership, id: 'other' }, record)).toBe(false);
    expect(
      canRestoreGrowth({ ...membership, role: 'ADMIN' }, { ...record, trashedByRole: 'OWNER' }),
    ).toBe(true);
    expect(canRestoreGrowth(membership, { ...record, purgeAfter: new Date(0) })).toBe(false);
    expect(canRestoreGrowth(membership, { ...record, status: 'ACTIVE' })).toBe(false);
  });

  function setup(row = record, role: FamilyMembership['role'] = 'MEMBER') {
    const baby = {
      id: '00000000-0000-4000-8000-000000000003',
      birthDate: new Date('2025-01-01'),
      sex: null,
    };
    const member = { ...membership, role };
    let reads = 0;
    const db = {
      $queryRaw: jest.fn(async () => {
        reads += 1;
        return reads === 1 ? [{ role, status: 'ACTIVE' }] : [{ id: row.id }];
      }),
      babyProfile: { findUniqueOrThrow: jest.fn(async () => baby) },
      growthRecord: {
        findFirst: jest.fn(async () => row),
        updateMany: jest.fn(async () => ({ count: 1 })),
        findUniqueOrThrow: jest.fn(async () => ({
          ...row,
          status: 'ACTIVE',
          createdAt: new Date(0),
          updatedAt: new Date(0),
        })),
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    const prisma = { $transaction: async (run: (tx: typeof db) => unknown) => run(db) };
    const policy = { requireBaby: jest.fn(async () => ({ membership: member, baby })) };
    const service = new GrowthService(prisma as never, policy as never);
    return { service, db, baby };
  }
  it('prevents a stale version from restoring or deleting', async () => {
    const { service, db } = setup();
    await expect(
      service.transition('account', 'family', 'baby', record.id, 2, 'restore'),
    ).rejects.toMatchObject({ response: { code: 'GROWTH_STATE_CONFLICT' } });
    expect(db.growthRecord.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a direct author restore of an administrator restriction', async () => {
    const { service, db } = setup({ ...record, trashedByRole: 'ADMIN' });
    await expect(
      service.transition('account', 'family', 'baby', record.id, 1, 'restore'),
    ).rejects.toMatchObject({ response: { code: 'GROWTH_RESTORE_ADMIN_REQUIRED' } });
    expect(db.growthRecord.updateMany).not.toHaveBeenCalled();
  });
  it('denies permanent removal to ordinary authors', async () => {
    const { service, db } = setup();
    await expect(
      service.transition('account', 'family', 'baby', record.id, 1, 'purge'),
    ).rejects.toMatchObject({ response: { code: 'GROWTH_PERMISSION_DENIED' } });
    expect(db.growthRecord.deleteMany).not.toHaveBeenCalled();
  });
  it('enforces expiry even before the cleanup job has deleted the row', async () => {
    const { service } = setup({ ...record, purgeAfter: new Date(0) }, 'ADMIN');
    await expect(
      service.transition('account', 'family', 'baby', record.id, 1, 'restore'),
    ).rejects.toMatchObject({ response: { code: 'GROWTH_RESTORE_EXPIRED' } });
  });
  it('rechecks an ACTIVE membership after taking its write lock', async () => {
    const { service, db } = setup();
    db.$queryRaw.mockImplementationOnce(async () => [{ role: 'MEMBER', status: 'LEFT' }] as never);
    await expect(
      service.transition('account', 'family', 'baby', record.id, 1, 'restore'),
    ).rejects.toMatchObject({ response: { code: 'GROWTH_NOT_FOUND' } });
    expect(db.growthRecord.findFirst).not.toHaveBeenCalled();
  });
  it('only deletes expired trash selected under lock and is safe to repeat', async () => {
    let selectCount = 0;
    const db = {
      $queryRaw: jest.fn(async () => {
        selectCount++;
        return selectCount % 2 ? [{ acquired: true }] : [{ id: record.id }];
      }),
      growthRecord: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    };
    const prisma = { $transaction: async (run: (tx: typeof db) => unknown) => run(db) };
    const service = new GrowthMaintenanceService(prisma as never, {} as never);
    const now = new Date();
    expect(await service.purgeExpired(10, now)).toBe(1);
    expect(db.growthRecord.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [record.id] }, status: 'TRASHED', purgeAfter: { lte: now } },
    });
    db.growthRecord.deleteMany.mockResolvedValueOnce({ count: 0 });
    expect(await service.purgeExpired(10, now)).toBe(0);
  });
});
