import { jest } from '@jest/globals';
import { FamilyActivityService } from '../src/family/family-activity.service.js';
import { activityQuerySchema } from '../src/family/family.schemas.js';

describe('family domain boundaries', () => {
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
