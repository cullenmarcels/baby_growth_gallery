import { Inject, Injectable } from '@nestjs/common';
import type { FamilyMembership, Milestone, Prisma } from '../generated/prisma/client.js';
import { BabyPolicyService } from '../baby/baby-policy.service.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class MilestonePolicyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BabyPolicyService) private readonly babies: BabyPolicyService,
  ) {}

  requireActiveBaby(
    accountId: string,
    familyId: string,
    babyId: string,
    db: DatabaseClient = this.prisma,
  ) {
    return this.babies.requireBaby(accountId, familyId, babyId, ['ACTIVE'], db);
  }

  canManage(
    membership: FamilyMembership,
    milestone: Pick<Milestone, 'createdByMembershipId'>,
  ): boolean {
    return (
      ['OWNER', 'ADMIN'].includes(membership.role) ||
      milestone.createdByMembershipId === membership.id
    );
  }

  notFound(): never {
    throw new ApiProblemException(404, '找不到这个里程碑，或你无权访问。', 'MILESTONE_NOT_FOUND');
  }
  permissionDenied(): never {
    throw new ApiProblemException(403, '你没有权限管理这个里程碑。', 'MILESTONE_PERMISSION_DENIED');
  }
  stateConflict(): never {
    throw new ApiProblemException(
      409,
      '里程碑已发生变化，请刷新后重试。',
      'MILESTONE_STATE_CONFLICT',
    );
  }
}
