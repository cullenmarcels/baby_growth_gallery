import { Inject, Injectable } from '@nestjs/common';
import type { BabyProfile } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { BabyPolicyService } from './baby-policy.service.js';
import type { BabySummaryDto } from './baby.dto.js';
import type { CreateBabyInput, UpdateBabyInput } from './baby.schemas.js';

const ARCHIVE_RETENTION_MS = 30 * 86_400_000;

@Injectable()
export class BabyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BabyPolicyService) private readonly policy: BabyPolicyService,
  ) {}

  async create(
    accountId: string,
    familyId: string,
    input: CreateBabyInput,
  ): Promise<BabySummaryDto> {
    const membership = await this.policy.requireBabyManager(accountId, familyId);
    const baby = await this.prisma.babyProfile.create({
      data: {
        familyId,
        createdByMembershipId: membership.id,
        nickname: input.nickname,
        birthDate: this.asDate(input.birthDate),
        sex: input.sex ?? null,
      },
    });
    return this.summary(baby);
  }

  async list(
    accountId: string,
    familyId: string,
    includeArchived: boolean,
  ): Promise<BabySummaryDto[]> {
    const membership = await this.policy.requireFamilyMembership(accountId, familyId);
    if (includeArchived) this.policy.requireManager(membership);
    const now = new Date();
    const babies = await this.prisma.babyProfile.findMany({
      where: {
        familyId,
        ...(includeArchived
          ? { OR: [{ status: 'ACTIVE' }, { status: 'ARCHIVED' as const, purgeAfter: { gt: now } }] }
          : { status: 'ACTIVE' as const }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return babies.map((baby) => this.summary(baby));
  }

  async get(accountId: string, familyId: string, babyId: string): Promise<BabySummaryDto> {
    const { baby } = await this.policy.requireBaby(accountId, familyId, babyId);
    return this.summary(baby);
  }

  async update(
    accountId: string,
    familyId: string,
    babyId: string,
    input: UpdateBabyInput,
  ): Promise<BabySummaryDto> {
    const { membership } = await this.policy.requireBaby(accountId, familyId, babyId);
    this.policy.requireManager(membership);
    const updated = await this.prisma.babyProfile.updateMany({
      where: { id: babyId, familyId, status: 'ACTIVE' },
      data: {
        ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
        ...(input.birthDate !== undefined ? { birthDate: this.asDate(input.birthDate) } : {}),
        ...(input.sex !== undefined ? { sex: input.sex } : {}),
      },
    });
    if (updated.count !== 1) this.policy.stateConflict();
    return this.get(accountId, familyId, babyId);
  }

  async setAvatar(
    accountId: string,
    familyId: string,
    babyId: string,
    photoId: string | null,
  ): Promise<BabySummaryDto> {
    return this.prisma.$transaction(async (transaction) => {
      const { membership } = await this.policy.requireBaby(
        accountId,
        familyId,
        babyId,
        ['ACTIVE'],
        transaction,
      );
      const [currentMembership] = await transaction.$queryRaw<
        Array<{ role: string; status: string }>
      >`
        SELECT role, status FROM family_memberships WHERE id = ${membership.id}::uuid FOR UPDATE
      `;
      if (!currentMembership || currentMembership.status !== 'ACTIVE') this.policy.notFound();
      this.policy.requireManager({
        ...membership,
        role: currentMembership.role as typeof membership.role,
      });
      if (photoId) {
        const [photo] = await transaction.$queryRaw<Array<{ status: string }>>`
          SELECT status FROM photos
          WHERE id = ${photoId}::uuid AND family_id = ${familyId}::uuid
            AND baby_id = ${babyId}::uuid
          FOR UPDATE
        `;
        if (!photo) {
          throw new ApiProblemException(404, '未找到这张照片。', 'PHOTO_NOT_FOUND');
        }
        if (photo.status !== 'PUBLISHED') {
          throw new ApiProblemException(
            409,
            '照片状态已发生变化，请刷新后重试。',
            'PHOTO_STATE_CONFLICT',
          );
        }
      }
      const result = await transaction.babyProfile.updateMany({
        where: { id: babyId, familyId, status: 'ACTIVE' },
        data: { avatarPhotoId: photoId },
      });
      if (result.count !== 1) this.policy.stateConflict();
      const baby = await transaction.babyProfile.findUniqueOrThrow({ where: { id: babyId } });
      return this.summary(baby);
    });
  }

  async archive(accountId: string, familyId: string, babyId: string): Promise<void> {
    const { membership } = await this.policy.requireBaby(accountId, familyId, babyId);
    this.policy.requireManager(membership);
    const now = new Date();
    const result = await this.prisma.babyProfile.updateMany({
      where: { id: babyId, familyId, status: 'ACTIVE' },
      data: {
        status: 'ARCHIVED',
        archivedAt: now,
        purgeAfter: new Date(now.valueOf() + ARCHIVE_RETENTION_MS),
      },
    });
    if (result.count !== 1) this.policy.stateConflict();
  }

  async restore(accountId: string, familyId: string, babyId: string): Promise<BabySummaryDto> {
    const { membership, baby } = await this.policy.requireBaby(accountId, familyId, babyId, [
      'ARCHIVED',
    ]);
    this.policy.requireManager(membership);
    const now = new Date();
    if (!baby.purgeAfter || baby.purgeAfter <= now) {
      throw new ApiProblemException(
        409,
        'The recovery period for this baby profile has expired.',
        'BABY_RESTORE_EXPIRED',
      );
    }
    const result = await this.prisma.babyProfile.updateMany({
      where: { id: babyId, familyId, status: 'ARCHIVED', purgeAfter: { gt: now } },
      data: { status: 'ACTIVE', archivedAt: null, purgeAfter: null },
    });
    if (result.count !== 1) this.policy.stateConflict();
    return this.get(accountId, familyId, babyId);
  }

  private asDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private summary(baby: BabyProfile): BabySummaryDto {
    return {
      id: baby.id,
      familyId: baby.familyId,
      nickname: baby.nickname,
      birthDate: baby.birthDate.toISOString().slice(0, 10),
      sex: baby.sex,
      avatarPhotoId: baby.avatarPhotoId,
      status: baby.status === 'ACTIVE' ? 'ACTIVE' : 'ARCHIVED',
      archivedAt: baby.archivedAt?.toISOString() ?? null,
      purgeAfter: baby.purgeAfter?.toISOString() ?? null,
      createdAt: baby.createdAt.toISOString(),
      updatedAt: baby.updatedAt.toISOString(),
    };
  }
}
