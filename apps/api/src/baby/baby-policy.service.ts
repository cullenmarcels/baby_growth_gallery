import { Inject, Injectable } from '@nestjs/common';
import type { BabyProfile, FamilyMembership, Prisma } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { FamilyPolicyService } from '../family/family-policy.service.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BabyPolicyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyPolicyService) private readonly families: FamilyPolicyService,
  ) {}

  requireFamilyMembership(
    accountId: string,
    familyId: string,
    database: DatabaseClient = this.prisma,
  ): Promise<FamilyMembership> {
    return this.families.requireMembership(accountId, familyId, database);
  }

  async requireBabyManager(
    accountId: string,
    familyId: string,
    database: DatabaseClient = this.prisma,
  ): Promise<FamilyMembership> {
    const membership = await this.requireFamilyMembership(accountId, familyId, database);
    this.requireManager(membership);
    return membership;
  }

  requireManager(membership: FamilyMembership): void {
    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ApiProblemException(
        403,
        'You do not have permission to manage baby profiles.',
        'BABY_PERMISSION_DENIED',
      );
    }
  }

  async requireBaby(
    accountId: string,
    familyId: string,
    babyId: string,
    statuses: Array<BabyProfile['status']> = ['ACTIVE'],
    database: DatabaseClient = this.prisma,
  ): Promise<{ membership: FamilyMembership; baby: BabyProfile }> {
    const membership = await this.requireFamilyMembership(accountId, familyId, database);
    const baby = await database.babyProfile.findFirst({
      where: { id: babyId, familyId, status: { in: statuses } },
    });
    if (!baby) this.notFound();
    return { membership, baby };
  }

  notFound(): never {
    throw new ApiProblemException(404, 'The baby profile could not be found.', 'BABY_NOT_FOUND');
  }

  stateConflict(): never {
    throw new ApiProblemException(
      409,
      'The baby profile has changed. Please refresh and try again.',
      'BABY_STATE_CONFLICT',
    );
  }
}
