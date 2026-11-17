import { Inject, Injectable } from '@nestjs/common';
import type { Family, FamilyMembership } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { serializable } from '../infrastructure/serializable.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { FamilyActivityService } from './family-activity.service.js';
import type { FamilyActivityPageDto, FamilyMemberDto, FamilySummaryDto } from './family.dto.js';
import type { ActivityQuery } from './family.schemas.js';
import { FamilyPolicyService } from './family-policy.service.js';

@Injectable()
export class FamilyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyPolicyService) private readonly policy: FamilyPolicyService,
    @Inject(FamilyActivityService) private readonly activities: FamilyActivityService,
  ) {}

  async listFamilies(accountId: string): Promise<FamilySummaryDto[]> {
    const memberships = await this.prisma.familyMembership.findMany({
      where: { accountId, status: 'ACTIVE' },
      include: { family: true },
      orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
    });
    return memberships.map((membership) => this.familySummary(membership.family, membership));
  }

  async getFamily(accountId: string, familyId: string): Promise<FamilySummaryDto> {
    const membership = await this.policy.requireMembership(accountId, familyId);
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      throw new ApiProblemException(404, 'The family could not be found.', 'FAMILY_NOT_FOUND');
    }
    return this.familySummary(family, membership);
  }

  async listMembers(accountId: string, familyId: string): Promise<FamilyMemberDto[]> {
    await this.policy.requireMembership(accountId, familyId);
    const memberships = await this.prisma.familyMembership.findMany({
      where: { familyId, status: 'ACTIVE', account: { status: 'ACTIVE' } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }, { id: 'asc' }],
    });
    return memberships.map((membership) => this.memberSummary(membership, accountId));
  }

  async listActivities(
    accountId: string,
    familyId: string,
    query: ActivityQuery,
  ): Promise<FamilyActivityPageDto> {
    await this.policy.requireMembership(accountId, familyId);
    return this.activities.list(familyId, query);
  }

  async leaveFamily(accountId: string, familyId: string): Promise<void> {
    await serializable(this.prisma, async (transaction) => {
      const actor = await this.policy.requireMembership(accountId, familyId, transaction);
      if (actor.role === 'ADMIN')
        await this.policy.requireOtherAdmin(transaction, familyId, accountId);
      const now = new Date();
      const result = await transaction.familyMembership.updateMany({
        where: { id: actor.id, status: 'ACTIVE', role: actor.role },
        data: { status: 'LEFT', leftAt: now },
      });
      if (result.count !== 1) this.policy.stateConflict();
      await this.activities.record(transaction, {
        familyId,
        actorMembershipId: actor.id,
        type: 'MEMBER_LEFT',
        subjectType: 'MEMBERSHIP',
        subjectId: actor.id,
        summary: {
          membershipId: actor.id,
          displayName: actor.displayName,
          reason: 'LEFT',
        },
        occurredAt: now,
      });
    });
  }

  private familySummary(family: Family, membership: FamilyMembership): FamilySummaryDto {
    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString(),
      currentMembership: {
        id: membership.id,
        displayName: membership.displayName,
        role: membership.role,
      },
    };
  }

  private memberSummary(membership: FamilyMembership, accountId: string): FamilyMemberDto {
    return {
      id: membership.id,
      displayName: membership.displayName,
      role: membership.role,
      status: 'ACTIVE',
      joinedAt: membership.joinedAt.toISOString(),
      isCurrentAccount: membership.accountId === accountId,
    };
  }
}
