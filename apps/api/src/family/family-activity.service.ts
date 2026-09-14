import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import type {
  ActiveFamilyActivityItemDto,
  FamilyActivityPageDto,
  TombstonedFamilyActivityItemDto,
} from './family.dto.js';
import type { ActivityQuery } from './family.schemas.js';

export type CurrentActivityType =
  'FAMILY_CREATED' | 'MEMBER_JOINED' | 'MEMBER_ROLE_CHANGED' | 'MEMBER_LEFT';

interface RecordActivityInput {
  familyId: string;
  actorMembershipId: string | null;
  type: CurrentActivityType;
  subjectType?: string;
  subjectId?: string;
  summary: Prisma.InputJsonValue;
  occurredAt?: Date;
}

const cursorSchema = z.object({
  v: z.literal(1),
  occurredAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

@Injectable()
export class FamilyActivityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(transaction: Prisma.TransactionClient, input: RecordActivityInput): Promise<void> {
    await transaction.familyActivity.create({
      data: {
        familyId: input.familyId,
        actorMembershipId: input.actorMembershipId,
        type: input.type,
        ...(input.subjectType ? { subjectType: input.subjectType } : {}),
        ...(input.subjectId ? { subjectId: input.subjectId } : {}),
        summaryPayload: input.summary,
        ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      },
    });
  }

  async list(familyId: string, query: ActivityQuery): Promise<FamilyActivityPageDto> {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : undefined;
    const rows = await this.prisma.familyActivity.findMany({
      where: {
        familyId,
        ...(cursor
          ? {
              OR: [
                { occurredAt: { lt: cursor.occurredAt } },
                { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: { actor: { select: { id: true, displayName: true } } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const items = pageRows.map((row) => {
      if (row.visibility === 'TOMBSTONED') {
        return {
          id: row.id,
          visibility: 'TOMBSTONED',
          type: 'CONTENT_DELETED',
          occurredAt: row.occurredAt.toISOString(),
          message: '内容已删除',
        } satisfies TombstonedFamilyActivityItemDto;
      }
      return {
        id: row.id,
        visibility: 'ACTIVE',
        type: row.type as ActiveFamilyActivityItemDto['type'],
        schemaVersion: row.schemaVersion,
        occurredAt: row.occurredAt.toISOString(),
        actor: {
          membershipId: row.actor?.id ?? null,
          displayName: row.actor?.displayName ?? '已退出成员',
        },
        ...(row.subjectType && row.subjectId
          ? { subject: { type: row.subjectType, id: row.subjectId } }
          : {}),
        summary: row.summaryPayload as unknown as Record<string, unknown>,
      } satisfies ActiveFamilyActivityItemDto;
    });
    const last = pageRows.at(-1);
    return {
      items,
      nextCursor: hasMore && last ? this.encodeCursor(last.occurredAt, last.id) : null,
    };
  }

  async tombstone(activityId: string): Promise<void> {
    await this.prisma.familyActivity.update({
      where: { id: activityId },
      data: {
        visibility: 'TOMBSTONED',
        subjectId: null,
        summaryPayload: {},
        tombstonedAt: new Date(),
      },
    });
  }

  private encodeCursor(occurredAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({ v: 1, occurredAt: occurredAt.toISOString(), id }),
      'utf8',
    ).toString('base64url');
  }

  private decodeCursor(value: string): { occurredAt: Date; id: string } {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid encoding');
      const parsed = cursorSchema.parse(
        JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
      );
      return { occurredAt: new Date(parsed.occurredAt), id: parsed.id };
    } catch {
      throw new ApiProblemException(400, 'The activity cursor is invalid.', 'CURSOR_INVALID');
    }
  }
}
