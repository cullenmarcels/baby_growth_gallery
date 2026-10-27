import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../src/infrastructure/prisma.service.js';
import type { AppConfig } from '../../../src/config/app-config.js';
import { FamilyPolicyService } from '../../../src/family/family-policy.service.js';
import { BabyPolicyService } from '../../../src/baby/baby-policy.service.js';
import { BabyMaintenanceService } from '../../../src/baby/baby-maintenance.service.js';
import { GrowthService } from '../../../src/growth/growth.service.js';
import { GrowthMaintenanceService } from '../../../src/growth/growth-maintenance.service.js';

// Explicit opt-in, disposable database only. Never runs against the development
// or production database as part of the ordinary unit-test command.
const databaseUrl = process.env.GROWTH_DATABASE_URL ?? '';
assert.match(new URL(databaseUrl).pathname, /^\/bgg_growth_check_[a-z0-9_]+$/);
const config = { databaseUrl, backgroundJobsEnabled: false } as AppConfig;
const db = new PrismaService(config);
const policy = new BabyPolicyService(db, new FamilyPolicyService(db));
const growth = new GrowthService(db, policy);
const cleanup = new GrowthMaintenanceService(db, config);
const babyCleanup = new BabyMaintenanceService(db, config);
const timestamp = new Date();
try {
  const account = await db.account.create({
    data: {
      phoneE164: `+1999${Date.now().toString().slice(-10)}`,
      passwordHash: 'synthetic-not-a-login-hash',
      phoneVerifiedAt: timestamp,
      passwordChangedAt: timestamp,
    },
  });
  const family = await db.family.create({
    data: { name: '合成清理测试家庭', createdByAccountId: account.id },
  });
  const membership = await db.familyMembership.create({
    data: { familyId: family.id, accountId: account.id, role: 'OWNER', displayName: '合成家长' },
  });
  const baby = await db.babyProfile.create({
    data: {
      familyId: family.id,
      createdByMembershipId: membership.id,
      birthDate: new Date('2000-01-01'),
      nickname: '合成宝宝',
      sex: 'MALE',
    },
  });
  const input = { measuredOn: '2020-01-01', weightKg: 50 };
  const record = await growth.create(account.id, family.id, baby.id, input);
  const trash = (await growth.transition(
    account.id,
    family.id,
    baby.id,
    record.id,
    record.version,
    'trash',
  ))!;
  const past = new Date(Date.now() - 86_400_000);
  await db.growthRecord.update({ where: { id: trash.id }, data: { purgeAfter: past } });
  await assert.rejects(
    growth.transition(account.id, family.id, baby.id, trash.id, trash.version, 'restore'),
    (error: unknown) =>
      (error as { response: { code: string } }).response.code === 'GROWTH_RESTORE_EXPIRED',
  );
  assert.equal(await cleanup.purgeExpired(), 1);
  assert.equal(await cleanup.purgeExpired(), 0);
  assert.equal(await db.growthRecord.findUnique({ where: { id: trash.id } }), null);

  // Real PostgreSQL locking: while a recovery owns the record lock, cleanup
  // skips it. A failed recovery rolls back and does not revive expired trash.
  const current = await growth.create(account.id, family.id, baby.id, input);
  const recycled = (await growth.transition(
    account.id,
    family.id,
    baby.id,
    current.id,
    current.version,
    'trash',
  ))!;
  await db.growthRecord.update({ where: { id: current.id }, data: { purgeAfter: past } });
  let release!: () => void;
  let signalLocked!: () => void;
  const unlocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const locked = new Promise<void>((resolve) => {
    signalLocked = resolve;
  });
  const locker = db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM growth_records WHERE id=${current.id}::uuid FOR UPDATE`;
    signalLocked();
    await unlocked;
  });
  await locked;
  try {
    assert.equal(await cleanup.purgeExpired(), 0);
  } finally {
    release();
  }
  await locker;
  const races = await Promise.allSettled([
    growth.transition(account.id, family.id, baby.id, current.id, recycled.version, 'restore'),
    cleanup.purgeExpired(),
  ]);
  assert.equal(races[0]!.status, 'rejected');
  assert.equal(await db.growthRecord.findUnique({ where: { id: current.id } }), null);

  // Real upgrade/domain checks: physical constraints reject empty/invalid
  // records; the same date is intentionally not unique.
  await growth.create(account.id, family.id, baby.id, input);
  await growth.create(account.id, family.id, baby.id, input);
  assert.equal(await db.growthRecord.count({ where: { babyId: baby.id } }), 2);
  await assert.rejects(
    db.growthRecord.create({
      data: {
        id: randomUUID(),
        familyId: family.id,
        babyId: baby.id,
        createdByMembershipId: membership.id,
        measuredOn: new Date('2020-01-01'),
      },
    }),
  );

  await db.babyProfile.update({
    where: { id: baby.id },
    data: { status: 'ARCHIVED', archivedAt: past, purgeAfter: new Date(Date.now() + 86_400_000) },
  });
  await assert.rejects(growth.create(account.id, family.id, baby.id, input));
  assert.equal(await babyCleanup.purgeExpired(), 0);
  await db.babyProfile.update({
    where: { id: baby.id },
    data: { status: 'ACTIVE', archivedAt: null, purgeAfter: null },
  });
  assert.equal(
    (await growth.list(account.id, family.id, baby.id, { state: 'ACTIVE', limit: 20 })).items
      .length,
    2,
  );
  await db.babyProfile.update({
    where: { id: baby.id },
    data: { status: 'ARCHIVED', archivedAt: past, purgeAfter: past },
  });
  assert.equal(await babyCleanup.purgeExpired(), 1);
  assert.equal(await db.growthRecord.count({ where: { babyId: baby.id } }), 0);
  console.log(
    'GROWTH_DATABASE_CHECK=PASSED: constraints, expiry, lock/cleanup race, archive, restore and cascade',
  );
} finally {
  await db.$disconnect();
}
