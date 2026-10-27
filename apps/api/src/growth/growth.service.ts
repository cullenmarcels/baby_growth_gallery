import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BabyPolicyService } from '../baby/baby-policy.service.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import type {
  BabyProfile,
  FamilyMembership,
  GrowthRecord,
  Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import type {
  GrowthCurvePointDto,
  GrowthOverviewDto,
  GrowthPageDto,
  GrowthRecordDto,
  GrowthSeriesDto,
} from './growth.dto.js';
import {
  ageDays,
  calculateReference,
  rawValue,
  referenceParameters,
  valueAtZ,
  type ReferenceInput,
} from './growth-reference.js';
import {
  chinaToday,
  growthInputSchema,
  growthMetrics,
  type GrowthInput,
  type GrowthListQuery,
  type GrowthSeriesQuery,
  type GrowthUpdate,
} from './growth.schemas.js';

const DAY = 86_400_000;
const includeAuthor = { createdBy: { select: { displayName: true } } } as const;
type Row = GrowthRecord & { createdBy: { displayName: string } };
const cursorSchema = z.object({
  familyId: z.uuid(),
  babyId: z.uuid(),
  context: z.string(),
  measuredOn: z.iso.date(),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});
export const isManager = (member: Pick<FamilyMembership, 'role'>) =>
  member.role === 'OWNER' || member.role === 'ADMIN';
export function canRestoreGrowth(
  member: FamilyMembership,
  row: GrowthRecord,
  now = new Date(),
): boolean {
  return (
    row.status === 'TRASHED' &&
    !!row.purgeAfter &&
    row.purgeAfter > now &&
    (isManager(member) ||
      (row.createdByMembershipId === member.id &&
        row.trashedByMembershipId === member.id &&
        row.trashedByRole === 'MEMBER'))
  );
}

@Injectable()
export class GrowthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BabyPolicyService) private readonly babies: BabyPolicyService,
  ) {}

  async list(
    accountId: string,
    familyId: string,
    babyId: string,
    query: GrowthListQuery,
  ): Promise<GrowthPageDto> {
    const { membership, baby } = await this.babies.requireBaby(accountId, familyId, babyId);
    const where: Prisma.GrowthRecordWhereInput = {
      familyId,
      babyId,
      status: query.state,
      ...(query.state === 'TRASHED' && !isManager(membership)
        ? { createdByMembershipId: membership.id }
        : {}),
    };
    return this.page(where, familyId, babyId, `list:${query.state}`, query, membership, baby);
  }

  async detail(
    accountId: string,
    familyId: string,
    babyId: string,
    recordId: string,
  ): Promise<GrowthRecordDto> {
    const { membership, baby } = await this.babies.requireBaby(accountId, familyId, babyId);
    const row = await this.prisma.growthRecord.findFirst({
      where: { id: recordId, familyId, babyId },
      include: includeAuthor,
    });
    if (
      !row ||
      (row.status === 'TRASHED' &&
        !isManager(membership) &&
        row.createdByMembershipId !== membership.id)
    )
      this.fail(404, 'GROWTH_NOT_FOUND');
    return this.summary(row, membership, baby);
  }

  async overview(accountId: string, familyId: string, babyId: string): Promise<GrowthOverviewDto> {
    const { baby } = await this.babies.requireBaby(accountId, familyId, babyId);
    const latest = await Promise.all(
      growthMetrics.map(async (metric) => {
        const present =
          metric === 'BMI'
            ? { lengthCm: { not: null }, weightKg: { not: null } }
            : {
                [metric === 'LENGTH' ? 'lengthCm' : metric === 'WEIGHT' ? 'weightKg' : 'headCm']: {
                  not: null,
                },
              };
        const row = await this.prisma.growthRecord.findFirst({
          where: { familyId, babyId, status: 'ACTIVE', ...present },
          orderBy: [{ measuredOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        });
        if (!row) return null;
        const input = this.referenceInput(row, baby);
        return {
          metric,
          recordId: row.id,
          measuredOn: input.measuredOn,
          value: rawValue(input, metric),
          reference: calculateReference(input, metric),
        };
      }),
    );
    return { latest: latest.filter((item) => item !== null) };
  }

  async series(
    accountId: string,
    familyId: string,
    babyId: string,
    query: GrowthSeriesQuery,
  ): Promise<GrowthSeriesDto> {
    const { membership, baby } = await this.babies.requireBaby(accountId, familyId, babyId);
    const toOn = query.toOn ?? chinaToday();
    if ((query.fromOn && query.fromOn > toOn) || toOn > chinaToday())
      this.fail(400, 'GROWTH_DATE_INVALID');
    const where: Prisma.GrowthRecordWhereInput = {
      familyId,
      babyId,
      status: 'ACTIVE',
      measuredOn: {
        lte: this.date(toOn),
        ...(query.fromOn ? { gte: this.date(query.fromOn) } : {}),
      },
      ...(query.metric === 'BMI'
        ? { lengthCm: { not: null }, weightKg: { not: null } }
        : {
            [query.metric === 'LENGTH'
              ? 'lengthCm'
              : query.metric === 'WEIGHT'
                ? 'weightKg'
                : 'headCm']: { not: null },
          }),
    };
    const result = await this.page(
      where,
      familyId,
      babyId,
      `series:${query.metric}:${query.fromOn ?? ''}:${toOn}`,
      query,
      membership,
      baby,
    );
    const first = query.fromOn
      ? null
      : await this.prisma.growthRecord.findFirst({
          where,
          orderBy: { measuredOn: 'asc' },
          select: { measuredOn: true },
        });
    const fromOn = query.fromOn ?? first?.measuredOn.toISOString().slice(0, 10) ?? toOn;
    const referenceCurve: GrowthCurvePointDto[] = [];
    const birth = baby.birthDate.valueOf();
    const start = Math.max(0, Math.ceil((this.date(fromOn).valueOf() - birth) / DAY));
    // 228 completed months includes fractional ages below 229 months.
    const end = Math.min(
      Math.floor(229 * 30.4375),
      Math.floor((this.date(toOn).valueOf() - birth) / DAY),
    );
    const days = new Set<number>([start, end, 730, 731, 1856, 1857]);
    for (let day = start; day <= end; day += 30) days.add(day);
    for (const day of [...days].filter((day) => day >= start && day <= end).sort((a, b) => a - b)) {
      const measuredOn = new Date(birth + day * DAY).toISOString().slice(0, 10);
      const lms = referenceParameters(
        {
          birthDate: baby.birthDate.toISOString().slice(0, 10),
          measuredOn,
          sex: baby.sex,
          lengthCm: null,
          headCm: null,
          weightKg: null,
          measurementPosition: null,
        },
        query.metric,
      );
      if (lms)
        referenceCurve.push({
          measuredOn,
          median: lms.m,
          lower: valueAtZ(lms, -2),
          upper: valueAtZ(lms, 2),
          standard: lms.standard,
        });
    }
    return { ...result, referenceCurve };
  }

  async create(
    accountId: string,
    familyId: string,
    babyId: string,
    input: GrowthInput,
  ): Promise<GrowthRecordDto> {
    return this.prisma.$transaction(async (db) => {
      const { membership, baby } = await this.lockContext(db, accountId, familyId, babyId);
      const data = this.validateInput(input, baby);
      const row = await db.growthRecord.create({
        data: {
          ...data,
          measuredOn: this.date(data.measuredOn),
          familyId,
          babyId,
          createdByMembershipId: membership.id,
        },
        include: includeAuthor,
      });
      return this.summary(row, membership, baby);
    });
  }

  async update(
    accountId: string,
    familyId: string,
    babyId: string,
    recordId: string,
    input: GrowthUpdate,
  ): Promise<GrowthRecordDto> {
    return this.prisma.$transaction(async (db) => {
      const { membership, baby, row } = await this.lockRecord(
        db,
        accountId,
        familyId,
        babyId,
        recordId,
      );
      this.requireManage(membership, row);
      if (row.status !== 'ACTIVE' || row.version !== input.expectedVersion)
        this.fail(409, 'GROWTH_STATE_CONFLICT');
      const merged = this.validateInput(
        {
          measuredOn: row.measuredOn.toISOString().slice(0, 10),
          lengthCm: row.lengthCm?.toNumber() ?? null,
          weightKg: row.weightKg?.toNumber() ?? null,
          headCm: row.headCm?.toNumber() ?? null,
          measurementPosition: row.measurementPosition,
          note: row.note,
          ...Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'expectedVersion')),
        },
        baby,
      );
      const result = await db.growthRecord.updateMany({
        where: { id: row.id, version: input.expectedVersion, status: 'ACTIVE' },
        data: { ...merged, measuredOn: this.date(merged.measuredOn), version: { increment: 1 } },
      });
      if (result.count !== 1) this.fail(409, 'GROWTH_STATE_CONFLICT');
      return this.summary(
        await db.growthRecord.findUniqueOrThrow({ where: { id: row.id }, include: includeAuthor }),
        membership,
        baby,
      );
    });
  }

  async transition(
    accountId: string,
    familyId: string,
    babyId: string,
    recordId: string,
    expectedVersion: number,
    action: 'trash' | 'restore' | 'purge',
    correctedOn?: string,
  ): Promise<GrowthRecordDto | null> {
    return this.prisma.$transaction(async (db) => {
      const { membership, baby, row } = await this.lockRecord(
        db,
        accountId,
        familyId,
        babyId,
        recordId,
      );
      const now = new Date();
      if (
        row.version !== expectedVersion ||
        row.status !== (action === 'trash' ? 'ACTIVE' : 'TRASHED')
      )
        this.fail(409, 'GROWTH_STATE_CONFLICT');
      if (action === 'trash') this.requireManage(membership, row);
      if (action === 'purge' && !isManager(membership)) this.fail(403, 'GROWTH_PERMISSION_DENIED');
      if (action === 'restore') {
        if (!row.purgeAfter || row.purgeAfter <= now) this.fail(409, 'GROWTH_RESTORE_EXPIRED');
        if (!canRestoreGrowth(membership, row, now))
          this.fail(403, 'GROWTH_RESTORE_ADMIN_REQUIRED');
        this.validateDate(correctedOn ?? row.measuredOn.toISOString().slice(0, 10), baby);
      }
      if (action === 'purge') {
        const deleted = await db.growthRecord.deleteMany({
          where: { id: row.id, status: 'TRASHED', version: expectedVersion },
        });
        if (deleted.count !== 1) this.fail(409, 'GROWTH_STATE_CONFLICT');
        return null;
      }
      const result = await db.growthRecord.updateMany({
        where: {
          id: row.id,
          version: expectedVersion,
          status: row.status,
          ...(action === 'restore' ? { purgeAfter: { gt: now } } : {}),
        },
        data:
          action === 'trash'
            ? {
                status: 'TRASHED',
                trashedAt: now,
                trashedByMembershipId: membership.id,
                trashedByRole: membership.role,
                purgeAfter: new Date(now.valueOf() + 30 * DAY),
                version: { increment: 1 },
              }
            : {
                ...(correctedOn ? { measuredOn: this.date(correctedOn) } : {}),
                status: 'ACTIVE',
                trashedAt: null,
                trashedByMembershipId: null,
                trashedByRole: null,
                purgeAfter: null,
                version: { increment: 1 },
              },
      });
      if (result.count !== 1) this.fail(409, 'GROWTH_STATE_CONFLICT');
      return this.summary(
        await db.growthRecord.findUniqueOrThrow({ where: { id: row.id }, include: includeAuthor }),
        membership,
        baby,
      );
    });
  }

  private async lockContext(
    db: Prisma.TransactionClient,
    accountId: string,
    familyId: string,
    babyId: string,
  ) {
    const { membership } = await this.babies.requireBaby(
      accountId,
      familyId,
      babyId,
      ['ACTIVE'],
      db,
    );
    const [locked] = await db.$queryRaw<
      Array<{ role: FamilyMembership['role']; status: string }>
    >`SELECT role,status FROM family_memberships WHERE id=${membership.id}::uuid AND family_id=${familyId}::uuid FOR UPDATE`;
    if (!locked || locked.status !== 'ACTIVE') this.fail(404, 'GROWTH_NOT_FOUND');
    const rows = await db.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM baby_profiles WHERE id=${babyId}::uuid AND family_id=${familyId}::uuid AND status='ACTIVE' FOR UPDATE`;
    if (rows.length !== 1) this.fail(404, 'GROWTH_NOT_FOUND');
    const baby = await db.babyProfile.findUniqueOrThrow({ where: { id: babyId } });
    return { membership: { ...membership, role: locked.role }, baby };
  }

  private async lockRecord(
    db: Prisma.TransactionClient,
    accountId: string,
    familyId: string,
    babyId: string,
    recordId: string,
  ) {
    const context = await this.lockContext(db, accountId, familyId, babyId);
    await db.$queryRaw`SELECT id FROM growth_records WHERE id=${recordId}::uuid AND family_id=${familyId}::uuid AND baby_id=${babyId}::uuid FOR UPDATE`;
    const row = await db.growthRecord.findFirst({
      where: { id: recordId, familyId, babyId },
      include: includeAuthor,
    });
    if (
      !row ||
      (row.status === 'TRASHED' &&
        !isManager(context.membership) &&
        row.createdByMembershipId !== context.membership.id)
    )
      this.fail(404, 'GROWTH_NOT_FOUND');
    return { ...context, row };
  }

  private requireManage(member: FamilyMembership, row: GrowthRecord) {
    if (!isManager(member) && row.createdByMembershipId !== member.id)
      this.fail(403, 'GROWTH_PERMISSION_DENIED');
  }

  private validateInput(
    input: GrowthInput,
    baby: BabyProfile,
  ): {
    measuredOn: string;
    lengthCm: number | null;
    weightKg: number | null;
    headCm: number | null;
    measurementPosition: 'RECUMBENT' | 'STANDING' | null;
    note: string | null;
  } {
    const value = growthInputSchema.parse(input);
    if (value.lengthCm == null && value.weightKg == null && value.headCm == null)
      this.fail(400, 'GROWTH_MEASUREMENT_REQUIRED');
    if (value.lengthCm != null && !value.measurementPosition)
      this.fail(400, 'GROWTH_POSITION_REQUIRED');
    this.validateDate(value.measuredOn, baby);
    return {
      ...value,
      lengthCm: value.lengthCm ?? null,
      weightKg: value.weightKg ?? null,
      headCm: value.headCm ?? null,
      measurementPosition: value.lengthCm == null ? null : value.measurementPosition!,
      note: value.note || null,
    };
  }

  private validateDate(measuredOn: string, baby: BabyProfile) {
    if (measuredOn < baby.birthDate.toISOString().slice(0, 10) || measuredOn > chinaToday())
      this.fail(400, 'GROWTH_DATE_INVALID');
  }

  private referenceInput(row: GrowthRecord, baby: BabyProfile): ReferenceInput {
    return {
      birthDate: baby.birthDate.toISOString().slice(0, 10),
      measuredOn: row.measuredOn.toISOString().slice(0, 10),
      sex: baby.sex,
      lengthCm: row.lengthCm?.toNumber() ?? null,
      weightKg: row.weightKg?.toNumber() ?? null,
      headCm: row.headCm?.toNumber() ?? null,
      measurementPosition: row.measurementPosition,
    };
  }

  private summary(row: Row, membership: FamilyMembership, baby: BabyProfile): GrowthRecordDto {
    const input = this.referenceInput(row, baby);
    return {
      id: row.id,
      babyId: row.babyId,
      measuredOn: input.measuredOn,
      lengthCm: input.lengthCm,
      weightKg: input.weightKg,
      headCm: input.headCm,
      measurementPosition: row.measurementPosition,
      bmi: rawValue(input, 'BMI'),
      note: row.note,
      status: row.status,
      version: row.version,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      purgeAfter: row.purgeAfter?.toISOString() ?? null,
      canManage:
        row.status === 'ACTIVE' &&
        (isManager(membership) || row.createdByMembershipId === membership.id),
      canRestore: canRestoreGrowth(membership, row),
      canPurge: row.status === 'TRASHED' && isManager(membership),
      dateConflict: ageDays(input) < 0,
      measurements: growthMetrics.map((metric) => ({
        metric,
        value: rawValue(input, metric),
        reference: calculateReference(input, metric),
      })),
    };
  }

  private async page(
    where: Prisma.GrowthRecordWhereInput,
    familyId: string,
    babyId: string,
    context: string,
    query: { limit: number; cursor?: string | undefined },
    membership: FamilyMembership,
    baby: BabyProfile,
  ): Promise<GrowthPageDto> {
    if (query.cursor) {
      let decoded: z.infer<typeof cursorSchema>;
      try {
        decoded = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString()));
      } catch {
        this.fail(400, 'CURSOR_INVALID');
      }
      if (decoded.familyId !== familyId || decoded.babyId !== babyId || decoded.context !== context)
        this.fail(400, 'CURSOR_INVALID');
      where.AND = [
        {
          OR: [
            { measuredOn: { lt: this.date(decoded.measuredOn) } },
            {
              measuredOn: this.date(decoded.measuredOn),
              createdAt: { lt: new Date(decoded.createdAt) },
            },
            {
              measuredOn: this.date(decoded.measuredOn),
              createdAt: new Date(decoded.createdAt),
              id: { lt: decoded.id },
            },
          ],
        },
      ];
    }
    const rows = await this.prisma.growthRecord.findMany({
      where,
      include: includeAuthor,
      orderBy: [{ measuredOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items: items.map((row) => this.summary(row, membership, baby)),
      nextCursor:
        rows.length > query.limit && last
          ? Buffer.from(
              JSON.stringify({
                familyId,
                babyId,
                context,
                measuredOn: last.measuredOn.toISOString().slice(0, 10),
                createdAt: last.createdAt.toISOString(),
                id: last.id,
              }),
            ).toString('base64url')
          : null,
    };
  }

  private date(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  private fail(status: number, code: string): never {
    throw new ApiProblemException(status, '成长记录操作未完成，请检查内容、权限和当前状态。', code);
  }
}
