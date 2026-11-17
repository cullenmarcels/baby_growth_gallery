import { Inject, Injectable } from '@nestjs/common';
import type { FamilyMembership, Prisma } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FamilyPolicyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async requireMembership(
    accountId: string,
    familyId: string,
    database: DatabaseClient = this.prisma,
  ): Promise<FamilyMembership> {
    const membership = await database.familyMembership.findFirst({
      where: { familyId, accountId, status: 'ACTIVE', account: { status: 'ACTIVE' } },
    });
    if (!membership) {
      throw new ApiProblemException(404, 'The family could not be found.', 'FAMILY_NOT_FOUND');
    }
    return membership;
  }

  requireAdmin(membership: FamilyMembership): void {
    if (membership.role !== 'ADMIN') this.permissionDenied();
  }

  async requireOtherAdmin(
    database: DatabaseClient,
    familyId: string,
    exceptAccountId: string,
  ): Promise<void> {
    const admin = await database.familyMembership.findFirst({
      where: {
        familyId,
        accountId: { not: exceptAccountId },
        status: 'ACTIVE',
        role: 'ADMIN',
        account: { status: 'ACTIVE' },
      },
      select: { id: true },
    });
    if (!admin) {
      throw new ApiProblemException(
        409,
        'The family needs an active administrator.',
        'FAMILY_ADMIN_REQUIRED',
      );
    }
  }

  permissionDenied(): never {
    throw new ApiProblemException(
      403,
      'You do not have permission to perform this action.',
      'FAMILY_PERMISSION_DENIED',
    );
  }

  stateConflict(): never {
    throw new ApiProblemException(
      409,
      'The family membership has changed. Please refresh and try again.',
      'FAMILY_STATE_CONFLICT',
    );
  }
}
