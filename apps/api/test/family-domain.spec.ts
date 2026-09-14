import type { FamilyMembership } from '../src/generated/prisma/client.js';
import { jest } from '@jest/globals';
import { ApiProblemException } from '../src/common/api-problem.exception.js';
import { FamilyPolicyService } from '../src/family/family-policy.service.js';
import { FamilyActivityService } from '../src/family/family-activity.service.js';
import { FamilyService } from '../src/family/family.service.js';
import { activityQuerySchema, createFamilySchema } from '../src/family/family.schemas.js';

function membership(role: FamilyMembership['role'], id = role): FamilyMembership {
  return {
    id,
    familyId: '00000000-0000-4000-8000-000000000001',
    accountId: '00000000-0000-4000-8000-000000000002',
    role,
    status: 'ACTIVE',
    displayName: role,
    joinedAt: new Date(0),
    leftAt: null,
    updatedAt: new Date(0),
  };
}

describe('family domain boundaries', () => {
  const policy = new FamilyPolicyService({} as never);

  it('trims Unicode family names and enforces their maximum lengths', () => {
    expect(createFamilySchema.parse({ name: '  星光之家  ', displayName: '  奶奶  ' })).toEqual({
      name: '星光之家',
      displayName: '奶奶',
    });
    expect(
      createFamilySchema.safeParse({ name: '家'.repeat(41), displayName: '成员' }).success,
    ).toBe(false);
    expect(
      createFamilySchema.safeParse({ name: '家庭', displayName: '人'.repeat(31) }).success,
    ).toBe(false);
  });

  it('applies the OWNER, ADMIN, and MEMBER removal matrix', () => {
    const owner = membership('OWNER', 'owner');
    const admin = membership('ADMIN', 'admin');
    const member = membership('MEMBER', 'member');
    expect(policy.canRemove(owner, admin)).toBe(true);
    expect(policy.canRemove(owner, member)).toBe(true);
    expect(policy.canRemove(admin, member)).toBe(true);
    expect(policy.canRemove(admin, owner)).toBe(false);
    expect(policy.canRemove(admin, membership('ADMIN', 'other-admin'))).toBe(false);
    expect(policy.canRemove(member, admin)).toBe(false);
    expect(policy.canRemove(owner, owner)).toBe(false);
  });

  it('normalizes Crockford separators and ambiguous characters', () => {
    const service = Object.create(FamilyService.prototype) as FamilyService;
    expect(service.normalizeToken(' abco-il23 mn45 ')).toBe('ABC01123MN45');
    expect(() => service.normalizeToken('not-a-token')).toThrow(ApiProblemException);
  });

  it('defaults activity pages to 20 and rejects limits above 50', () => {
    expect(activityQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(activityQuerySchema.parse({ limit: '50' })).toEqual({ limit: 50 });
    expect(activityQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
  });

  it('tombstones activity by clearing its subject and summary payload', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const activity = new FamilyActivityService({ familyActivity: { update } } as never);
    await activity.tombstone('00000000-0000-4000-8000-000000000005');
    expect(update).toHaveBeenCalledWith({
      where: { id: '00000000-0000-4000-8000-000000000005' },
      data: expect.objectContaining({
        visibility: 'TOMBSTONED',
        subjectId: null,
        summaryPayload: {},
      }),
    });
  });

  it('serializes tombstoned activity without its original type, actor, subject, or summary', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000006',
        familyId: '00000000-0000-4000-8000-000000000001',
        actorMembershipId: '00000000-0000-4000-8000-000000000002',
        actor: {
          id: '00000000-0000-4000-8000-000000000002',
          displayName: '不应返回的称呼',
        },
        type: 'PHOTO_UPLOADED',
        schemaVersion: 1,
        subjectType: 'PHOTO',
        subjectId: null,
        summaryPayload: {},
        visibility: 'TOMBSTONED',
        occurredAt: new Date('2026-09-11T00:00:00.000Z'),
        tombstonedAt: new Date('2026-09-11T00:01:00.000Z'),
      },
    ]);
    const activity = new FamilyActivityService({ familyActivity: { findMany } } as never);

    await expect(
      activity.list('00000000-0000-4000-8000-000000000001', { limit: 20 }),
    ).resolves.toEqual({
      items: [
        {
          id: '00000000-0000-4000-8000-000000000006',
          visibility: 'TOMBSTONED',
          type: 'CONTENT_DELETED',
          occurredAt: '2026-09-11T00:00:00.000Z',
          message: '内容已删除',
        },
      ],
      nextCursor: null,
    });
  });

  it('rejects malformed and unsupported activity cursors', async () => {
    const activity = new FamilyActivityService({
      familyActivity: { findMany: jest.fn() },
    } as never);
    await expect(
      activity.list('00000000-0000-4000-8000-000000000001', {
        limit: 20,
        cursor: 'not+a+base64url+cursor',
      }),
    ).rejects.toMatchObject({ response: { code: 'CURSOR_INVALID' } });

    const unsupported = Buffer.from(
      JSON.stringify({
        v: 2,
        occurredAt: '2026-09-11T00:00:00.000Z',
        id: '00000000-0000-4000-8000-000000000006',
      }),
    ).toString('base64url');
    await expect(
      activity.list('00000000-0000-4000-8000-000000000001', {
        limit: 20,
        cursor: unsupported,
      }),
    ).rejects.toMatchObject({ response: { code: 'CURSOR_INVALID' } });
  });
});
