import { Inject, Injectable } from '@nestjs/common';
import type { FamilyMembership, FamilyRole, Prisma } from '../generated/prisma/client.js';
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
    const membership = await database.familyMembership.findUnique({
      where: { familyId_accountId: { familyId, accountId } },
    });
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ApiProblemException(404, 'The family could not be found.', 'FAMILY_NOT_FOUND');
    }
    return membership;
  }

  requireInvitationManager(membership: FamilyMembership): void {
    if (!this.hasRole(membership.role, ['OWNER', 'ADMIN'])) this.permissionDenied();
  }

  requireOwner(membership: FamilyMembership): void {
    if (membership.role !== 'OWNER') this.permissionDenied();
  }

  canRemove(actor: FamilyMembership, target: FamilyMembership): boolean {
    if (target.role === 'OWNER' || actor.id === target.id) return false;
    if (actor.role === 'OWNER') return true;
    return actor.role === 'ADMIN' && target.role === 'MEMBER';
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

  ownerRequired(): never {
    throw new ApiProblemException(
      409,
      'The family owner must remain active.',
      'FAMILY_OWNER_REQUIRED',
    );
  }

  private hasRole(role: FamilyRole, roles: FamilyRole[]): boolean {
    return roles.includes(role);
  }
}
