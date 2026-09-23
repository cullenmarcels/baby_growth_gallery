import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  Prisma,
  type FamilyMembership,
  type Milestone,
  type Photo,
} from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { FamilyActivityService } from '../family/family-activity.service.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import type {
  MilestoneDetailDto,
  MilestonePhotoDto,
  MilestoneOverviewDto,
  MilestonePageDto,
  MilestoneSummaryDto,
  MilestoneTemplateListDto,
} from './milestone.dto.js';
import type {
  CompleteMilestoneInput,
  CreateMilestoneInput,
  MilestoneListQuery,
  MilestoneOverviewQuery,
  UpdateMilestoneInput,
} from './milestone.schemas.js';
import { MilestonePolicyService } from './milestone-policy.service.js';

export const MILESTONE_TEMPLATES = [
  ['FIRST_ROLL_OVER', '第一次翻身'],
  ['FIRST_SIT_UNASSISTED', '第一次独坐'],
  ['FIRST_CRAWL', '第一次爬行'],
  ['FIRST_STAND', '第一次站立'],
  ['FIRST_STEP', '迈出第一步'],
  ['FIRST_LAUGH_OUT_LOUD', '第一次笑出声'],
  ['FIRST_CALL_FAMILY', '第一次叫家人'],
  ['FIRST_WAVE', '第一次挥手'],
  ['FIRST_GRASP', '第一次抓握'],
  ['FIRST_SOLID_FOOD', '第一次吃辅食'],
  ['FIRST_TOOTH', '长出第一颗牙'],
  ['FIRST_SELF_FEED', '第一次自己吃饭'],
] as const;

const listCursorSchema = z.discriminatedUnion('state', [
  z.object({
    v: z.literal(1),
    state: z.literal('PENDING'),
    createdAt: z.iso.datetime(),
    id: z.uuid(),
  }),
  z.object({
    v: z.literal(1),
    state: z.literal('COMPLETED'),
    completedOn: z.iso.date(),
    completedAt: z.iso.datetime(),
    id: z.uuid(),
  }),
]);
const reminderCursorSchema = z.object({
  v: z.literal(1),
  reminderOn: z.iso.date(),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

type MilestoneRow = Prisma.MilestoneGetPayload<{
  include: {
    createdBy: { select: { id: true; displayName: true } };
    _count: { select: { photos: true } };
  };
}>;
type MilestoneDetailRow = Prisma.MilestoneGetPayload<{
  include: {
    createdBy: { select: { id: true; displayName: true } };
    _count: { select: { photos: true } };
    photos: { include: { photo: true } };
  };
}>;

@Injectable()
export class MilestoneService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MilestonePolicyService) private readonly policy: MilestonePolicyService,
    @Inject(FamilyActivityService) private readonly activities: FamilyActivityService,
  ) {}

  async templates(
    accountId: string,
    familyId: string,
    babyId: string,
  ): Promise<MilestoneTemplateListDto> {
    await this.policy.requireActiveBaby(accountId, familyId, babyId);
    const rows = await this.prisma.milestone.findMany({
      where: { familyId, babyId, templateKey: { not: null } },
      select: { templateKey: true },
    });
    const added = new Set(rows.flatMap(({ templateKey }) => (templateKey ? [templateKey] : [])));
    return {
      items: MILESTONE_TEMPLATES.map(([key, title]) => ({ key, title, isAdded: added.has(key) })),
    };
  }

  async list(
    accountId: string,
    familyId: string,
    babyId: string,
    query: MilestoneListQuery,
  ): Promise<MilestonePageDto> {
    const { membership } = await this.policy.requireActiveBaby(accountId, familyId, babyId);
    const cursor = query.cursor ? this.decodeListCursor(query.cursor, query.state) : null;
    const where: Prisma.MilestoneWhereInput = {
      familyId,
      babyId,
      state: query.state,
      ...(cursor?.state === 'PENDING'
        ? {
            OR: [
              { createdAt: { lt: new Date(cursor.createdAt) } },
              { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
            ],
          }
        : cursor?.state === 'COMPLETED'
          ? {
              OR: [
                { completedOn: { lt: this.date(cursor.completedOn) } },
                {
                  completedOn: this.date(cursor.completedOn),
                  completedAt: { lt: new Date(cursor.completedAt) },
                },
                {
                  completedOn: this.date(cursor.completedOn),
                  completedAt: new Date(cursor.completedAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
    };
    const rows = await this.prisma.milestone.findMany({
      where,
      include: this.summaryInclude(),
      orderBy:
        query.state === 'PENDING'
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : [{ completedOn: 'desc' }, { completedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);
    return {
      items: items.map((row) => this.summary(row, membership)),
      nextCursor: hasMore && last ? this.encodeListCursor(last) : null,
    };
  }

  async overview(
    accountId: string,
    familyId: string,
    babyId: string,
    query: MilestoneOverviewQuery,
  ): Promise<MilestoneOverviewDto> {
    const { membership } = await this.policy.requireActiveBaby(accountId, familyId, babyId);
    const cursor = query.cursor ? this.decodeReminderCursor(query.cursor) : null;
    const [total, completed, rows] = await Promise.all([
      this.prisma.milestone.count({ where: { familyId, babyId } }),
      this.prisma.milestone.count({ where: { familyId, babyId, state: 'COMPLETED' } }),
      this.prisma.milestone.findMany({
        where: {
          familyId,
          babyId,
          state: 'PENDING',
          reminderOn: { gte: this.date(query.fromOn) },
          ...(cursor
            ? {
                OR: [
                  { reminderOn: { gt: this.date(cursor.reminderOn) } },
                  {
                    reminderOn: this.date(cursor.reminderOn),
                    createdAt: { gt: new Date(cursor.createdAt) },
                  },
                  {
                    reminderOn: this.date(cursor.reminderOn),
                    createdAt: new Date(cursor.createdAt),
                    id: { gt: cursor.id },
                  },
                ],
              }
            : {}),
        },
        include: this.summaryInclude(),
        orderBy: [{ reminderOn: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: query.limit + 1,
      }),
    ]);
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);
    return {
      progress: { completed, total },
      reminders: items.map((row) => this.summary(row, membership)),
      nextCursor: hasMore && last ? this.encodeReminderCursor(last) : null,
    };
  }

  async detail(
    accountId: string,
    familyId: string,
    babyId: string,
    milestoneId: string,
  ): Promise<MilestoneDetailDto> {
    const { membership } = await this.policy.requireActiveBaby(accountId, familyId, babyId);
    const row = await this.detailRow(this.prisma, familyId, babyId, milestoneId);
    if (!row) this.policy.notFound();
    return this.detailSummary(row, membership);
  }

  async create(
    accountId: string,
    familyId: string,
    babyId: string,
    input: CreateMilestoneInput,
  ): Promise<MilestoneDetailDto> {
    this.validateReminder(input.reminderOn);
    return this.prisma.$transaction(async (transaction) => {
      const { membership } = await this.policy.requireActiveBaby(
        accountId,
        familyId,
        babyId,
        transaction,
      );
      await this.lockActiveContext(transaction, membership, familyId, babyId);
      const template =
        input.source === 'TEMPLATE'
          ? MILESTONE_TEMPLATES.find(([key]) => key === input.templateKey)
          : null;
      try {
        const row = await transaction.milestone.create({
          data: {
            familyId,
            babyId,
            createdByMembershipId: membership.id,
            source: input.source,
            ...(input.source === 'TEMPLATE'
              ? { templateKey: input.templateKey, title: template![1] }
              : { title: input.title }),
            ...(input.reminderOn !== undefined
              ? { reminderOn: input.reminderOn ? this.date(input.reminderOn) : null }
              : {}),
          },
          include: this.detailInclude(),
        });
        return this.detailSummary(row, membership);
      } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          throw new ApiProblemException(
            409,
            '这个模板已经加入清单。',
            'MILESTONE_TEMPLATE_ALREADY_ADDED',
          );
        }
        throw error;
      }
    });
  }

  async update(
    accountId: string,
    familyId: string,
    babyId: string,
    milestoneId: string,
    input: UpdateMilestoneInput,
  ): Promise<MilestoneDetailDto> {
    this.validateReminder(input.reminderOn);
    return this.prisma.$transaction(async (transaction) => {
      const { membership, milestone } = await this.lockManageable(
        transaction,
        accountId,
        familyId,
        babyId,
        milestoneId,
      );
      if (input.title !== undefined && milestone.source !== 'CUSTOM') {
        throw new ApiProblemException(400, '模板里程碑标题不能修改。', 'MILESTONE_STATE_CONFLICT');
      }
      const result = await transaction.milestone.updateMany({
        where: { id: milestoneId, version: input.expectedVersion },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.reminderOn !== undefined
            ? { reminderOn: input.reminderOn ? this.date(input.reminderOn) : null }
            : {}),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) this.policy.stateConflict();
      return this.detailSummary(
        (await this.detailRow(transaction, familyId, babyId, milestoneId))!,
        membership,
      );
    });
  }

  async complete(
    accountId: string,
    familyId: string,
    babyId: string,
    milestoneId: string,
    input: CompleteMilestoneInput,
  ): Promise<MilestoneDetailDto> {
    return this.prisma.$transaction(async (transaction) => {
      const { membership, milestone, baby } = await this.lockManageable(
        transaction,
        accountId,
        familyId,
        babyId,
        milestoneId,
      );
      if (milestone.state !== 'PENDING') this.policy.stateConflict();
      this.validateCompletion(input.completedOn, baby.birthDate);
      await this.validatePhotos(transaction, familyId, babyId, input.photoIds);
      const now = new Date();
      const result = await transaction.milestone.updateMany({
        where: { id: milestoneId, version: input.expectedVersion, state: 'PENDING' },
        data: {
          state: 'COMPLETED',
          completedOn: this.date(input.completedOn),
          completionNote: input.completionNote || null,
          completedAt: now,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) this.policy.stateConflict();
      await this.replacePhotos(transaction, milestoneId, input.photoIds);
      await this.activities.record(transaction, {
        familyId,
        actorMembershipId: membership.id,
        type: 'MILESTONE_RECORDED',
        subjectType: 'MILESTONE',
        subjectId: milestoneId,
        summary: { babyId },
        occurredAt: now,
      });
      return this.detailSummary(
        (await this.detailRow(transaction, familyId, babyId, milestoneId))!,
        membership,
      );
    });
  }

  async updateCompletion(
    accountId: string,
    familyId: string,
    babyId: string,
    milestoneId: string,
    input: CompleteMilestoneInput,
  ): Promise<MilestoneDetailDto> {
    return this.prisma.$transaction(async (transaction) => {
      const { membership, milestone, baby } = await this.lockManageable(
        transaction,
        accountId,
        familyId,
        babyId,
        milestoneId,
      );
      if (milestone.state !== 'COMPLETED') this.policy.stateConflict();
      this.validateCompletion(input.completedOn, baby.birthDate);
      await this.validatePhotos(transaction, familyId, babyId, input.photoIds);
      const result = await transaction.milestone.updateMany({
        where: { id: milestoneId, version: input.expectedVersion, state: 'COMPLETED' },
        data: {
          completedOn: this.date(input.completedOn),
          completionNote: input.completionNote || null,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) this.policy.stateConflict();
      await this.replacePhotos(transaction, milestoneId, input.photoIds);
      return this.detailSummary(
        (await this.detailRow(transaction, familyId, babyId, milestoneId))!,
        membership,
      );
    });
  }

  async reopen(
    accountId: string,
    familyId: string,
    babyId: string,
    milestoneId: string,
    expectedVersion: number,
  ): Promise<MilestoneDetailDto> {
    return this.prisma.$transaction(async (transaction) => {
      const { membership, milestone } = await this.lockManageable(
        transaction,
        accountId,
        familyId,
        babyId,
        milestoneId,
      );
      if (milestone.state !== 'COMPLETED') this.policy.stateConflict();
      const result = await transaction.milestone.updateMany({
        where: { id: milestoneId, version: expectedVersion, state: 'COMPLETED' },
        data: {
          state: 'PENDING',
          completedOn: null,
          completionNote: null,
          completedAt: null,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) this.policy.stateConflict();
      await transaction.milestonePhoto.deleteMany({ where: { milestoneId } });
      await this.activities.tombstoneSubject(transaction, familyId, 'MILESTONE', milestoneId);
      return this.detailSummary(
        (await this.detailRow(transaction, familyId, babyId, milestoneId))!,
        membership,
      );
    });
  }

  async remove(
    accountId: string,
    familyId: string,
    babyId: string,
    milestoneId: string,
    expectedVersion: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.lockManageable(transaction, accountId, familyId, babyId, milestoneId);
      const result = await transaction.milestone.deleteMany({
        where: { id: milestoneId, version: expectedVersion },
      });
      if (result.count !== 1) this.policy.stateConflict();
      await this.activities.tombstoneSubject(transaction, familyId, 'MILESTONE', milestoneId);
    });
  }

  private async lockManageable(
    transaction: Prisma.TransactionClient,
    accountId: string,
    familyId: string,
    babyId: string,
    milestoneId: string,
  ) {
    const { membership, baby } = await this.policy.requireActiveBaby(
      accountId,
      familyId,
      babyId,
      transaction,
    );
    const lockedMembership = await this.lockActiveContext(
      transaction,
      membership,
      familyId,
      babyId,
    );
    const locked = { ...membership, role: lockedMembership.role };
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM milestones WHERE id = ${milestoneId}::uuid AND family_id = ${familyId}::uuid AND baby_id = ${babyId}::uuid FOR UPDATE
    `;
    if (rows.length !== 1) this.policy.notFound();
    const milestone = await transaction.milestone.findFirst({
      where: { id: milestoneId, familyId, babyId },
    });
    if (!milestone) this.policy.notFound();
    if (!this.policy.canManage(locked, milestone)) this.policy.permissionDenied();
    return { membership: locked, milestone, baby };
  }

  private async validatePhotos(
    transaction: Prisma.TransactionClient,
    familyId: string,
    babyId: string,
    photoIds: string[],
  ) {
    if (photoIds.length > 10)
      throw new ApiProblemException(400, '最多关联 10 张照片。', 'MILESTONE_PHOTO_LIMIT_EXCEEDED');
    if (new Set(photoIds).size !== photoIds.length)
      throw new ApiProblemException(400, '照片不能重复选择。', 'MILESTONE_PHOTO_DUPLICATED');
    for (const photoId of [...photoIds].sort()) {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM photos
        WHERE id = ${photoId}::uuid
          AND family_id = ${familyId}::uuid
          AND baby_id = ${babyId}::uuid
          AND status = 'PUBLISHED'
        FOR UPDATE
      `);
      if (rows.length !== 1)
        throw new ApiProblemException(
          404,
          '部分照片不存在或不可关联。',
          'MILESTONE_PHOTO_NOT_FOUND',
        );
    }
  }

  private async lockActiveContext(
    transaction: Prisma.TransactionClient,
    membership: FamilyMembership,
    familyId: string,
    babyId: string,
  ): Promise<FamilyMembership> {
    const [lockedMembership] = await transaction.$queryRaw<
      Array<{ role: FamilyMembership['role']; status: string }>
    >`
      SELECT role, status FROM family_memberships
      WHERE id = ${membership.id}::uuid AND family_id = ${familyId}::uuid
      FOR UPDATE
    `;
    if (!lockedMembership || lockedMembership.status !== 'ACTIVE') this.policy.notFound();
    const babies = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM baby_profiles
      WHERE id = ${babyId}::uuid AND family_id = ${familyId}::uuid AND status = 'ACTIVE'
      FOR UPDATE
    `;
    if (babies.length !== 1) this.policy.notFound();
    return { ...membership, role: lockedMembership.role };
  }

  private async replacePhotos(
    transaction: Prisma.TransactionClient,
    milestoneId: string,
    photoIds: string[],
  ) {
    await transaction.milestonePhoto.deleteMany({ where: { milestoneId } });
    if (photoIds.length)
      await transaction.milestonePhoto.createMany({
        data: photoIds.map((photoId, displayOrder) => ({ milestoneId, photoId, displayOrder })),
      });
  }

  private validateReminder(value: string | null | undefined) {
    if (value && value < this.today())
      throw new ApiProblemException(400, '提醒日期不能早于今天。', 'MILESTONE_DATE_INVALID');
  }
  private validateCompletion(value: string, birthDate: Date) {
    const birth = birthDate.toISOString().slice(0, 10);
    if (value < birth || value > this.today())
      throw new ApiProblemException(
        400,
        '完成日期必须在宝宝出生日至今天之间。',
        'MILESTONE_DATE_INVALID',
      );
  }
  private today(): string {
    return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  }
  private date(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private summaryInclude() {
    return {
      createdBy: { select: { id: true, displayName: true } },
      _count: { select: { photos: true } },
    } as const;
  }
  private detailInclude() {
    return {
      ...this.summaryInclude(),
      photos: { include: { photo: true }, orderBy: { displayOrder: 'asc' as const } },
    } as const;
  }
  private detailRow(
    db: PrismaService | Prisma.TransactionClient,
    familyId: string,
    babyId: string,
    id: string,
  ) {
    return db.milestone.findFirst({
      where: { id, familyId, babyId },
      include: this.detailInclude(),
    });
  }

  private summary(
    row: MilestoneRow | MilestoneDetailRow,
    membership: FamilyMembership,
  ): MilestoneSummaryDto {
    return {
      id: row.id,
      babyId: row.babyId,
      source: row.source,
      templateKey: row.templateKey,
      title: row.title,
      state: row.state,
      reminderOn: row.reminderOn?.toISOString().slice(0, 10) ?? null,
      completedOn: row.completedOn?.toISOString().slice(0, 10) ?? null,
      completionNote: row.completionNote,
      completedAt: row.completedAt?.toISOString() ?? null,
      photoCount: row._count.photos,
      createdBy: { membershipId: row.createdBy.id, displayName: row.createdBy.displayName },
      canManage: this.policy.canManage(membership, row),
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
  private detailSummary(row: MilestoneDetailRow, membership: FamilyMembership): MilestoneDetailDto {
    return {
      ...this.summary(row, membership),
      photos: row.photos.map(({ photo }) => this.photoSummary(photo)),
    };
  }
  private photoSummary(photo: Photo): MilestonePhotoDto {
    return {
      id: photo.id,
      title: photo.title,
      capturedOn: photo.capturedOn.toISOString().slice(0, 10),
      width: photo.sourceWidth,
      height: photo.sourceHeight,
    };
  }

  private encodeListCursor(row: Milestone): string {
    const value =
      row.state === 'PENDING'
        ? { v: 1, state: 'PENDING', createdAt: row.createdAt.toISOString(), id: row.id }
        : {
            v: 1,
            state: 'COMPLETED',
            completedOn: row.completedOn!.toISOString().slice(0, 10),
            completedAt: row.completedAt!.toISOString(),
            id: row.id,
          };
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  }
  private decodeListCursor(value: string, state: 'PENDING' | 'COMPLETED') {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid');
      const parsed = listCursorSchema.parse(
        JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
      );
      if (parsed.state !== state) throw new Error('state');
      return parsed;
    } catch {
      throw new ApiProblemException(400, '里程碑分页游标无效。', 'CURSOR_INVALID');
    }
  }
  private encodeReminderCursor(row: Milestone): string {
    return Buffer.from(
      JSON.stringify({
        v: 1,
        reminderOn: row.reminderOn!.toISOString().slice(0, 10),
        createdAt: row.createdAt.toISOString(),
        id: row.id,
      }),
      'utf8',
    ).toString('base64url');
  }
  private decodeReminderCursor(value: string) {
    try {
      if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid');
      return reminderCursorSchema.parse(
        JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
      );
    } catch {
      throw new ApiProblemException(400, '提醒分页游标无效。', 'CURSOR_INVALID');
    }
  }
}
