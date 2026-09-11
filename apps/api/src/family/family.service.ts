import { createHmac, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Family, FamilyMembership, Prisma } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { FamilyActivityService } from './family-activity.service.js';
import type {
  ActiveInvitationDto,
  CreatedInvitationDto,
  FamilyActivityPageDto,
  FamilyMemberDto,
  FamilySummaryDto,
} from './family.dto.js';
import type { ActivityQuery } from './family.schemas.js';
import { FamilyPolicyService } from './family-policy.service.js';

const INVITATION_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const INVITATION_TTL_MS = 7 * 86_400_000;

@Injectable()
export class FamilyService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyPolicyService) private readonly policy: FamilyPolicyService,
    @Inject(FamilyActivityService) private readonly activities: FamilyActivityService,
  ) {}

  async createFamily(
    accountId: string,
    input: { name: string; displayName: string },
  ): Promise<FamilySummaryDto> {
    return this.serializable(async (transaction) => {
      const family = await transaction.family.create({
        data: { name: input.name, createdByAccountId: accountId },
      });
      const membership = await transaction.familyMembership.create({
        data: {
          familyId: family.id,
          accountId,
          role: 'OWNER',
          displayName: input.displayName,
        },
      });
      await this.activities.record(transaction, {
        familyId: family.id,
        actorMembershipId: membership.id,
        type: 'FAMILY_CREATED',
        subjectType: 'FAMILY',
        subjectId: family.id,
        summary: { familyName: family.name },
      });
      return this.familySummary(family, membership);
    });
  }

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
      where: { familyId, status: 'ACTIVE' },
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

  async changeMemberRole(
    accountId: string,
    familyId: string,
    membershipId: string,
    role: 'ADMIN' | 'MEMBER',
  ): Promise<FamilyMemberDto> {
    return this.serializable(async (transaction) => {
      const actor = await this.policy.requireMembership(accountId, familyId, transaction);
      this.policy.requireOwner(actor);
      const target = await transaction.familyMembership.findFirst({
        where: { id: membershipId, familyId },
      });
      if (!target || target.status !== 'ACTIVE') this.policy.stateConflict();
      if (target.role === 'OWNER') this.policy.ownerRequired();
      if (target.role === role) return this.memberSummary(target, accountId);

      const result = await transaction.familyMembership.updateMany({
        where: { id: target.id, status: 'ACTIVE', role: target.role },
        data: { role },
      });
      if (result.count !== 1) this.policy.stateConflict();
      if (target.role === 'ADMIN' && role === 'MEMBER') {
        await this.revokeOutstandingInvitations(transaction, target.id);
      }
      const updated = { ...target, role };
      await this.activities.record(transaction, {
        familyId,
        actorMembershipId: actor.id,
        type: 'MEMBER_ROLE_CHANGED',
        subjectType: 'MEMBERSHIP',
        subjectId: target.id,
        summary: {
          membershipId: target.id,
          displayName: target.displayName,
          fromRole: target.role,
          toRole: role,
        },
      });
      return this.memberSummary(updated, accountId);
    });
  }

  async removeMember(accountId: string, familyId: string, membershipId: string): Promise<void> {
    await this.serializable(async (transaction) => {
      const actor = await this.policy.requireMembership(accountId, familyId, transaction);
      const target = await transaction.familyMembership.findFirst({
        where: { id: membershipId, familyId },
      });
      if (!target || target.status !== 'ACTIVE') this.policy.stateConflict();
      if (target.role === 'OWNER') this.policy.ownerRequired();
      if (!this.policy.canRemove(actor, target)) this.policy.permissionDenied();
      const now = new Date();
      const result = await transaction.familyMembership.updateMany({
        where: { id: target.id, status: 'ACTIVE', role: target.role },
        data: { status: 'REMOVED', leftAt: now },
      });
      if (result.count !== 1) this.policy.stateConflict();
      await this.revokeOutstandingInvitations(transaction, target.id, now);
      await this.activities.record(transaction, {
        familyId,
        actorMembershipId: actor.id,
        type: 'MEMBER_LEFT',
        subjectType: 'MEMBERSHIP',
        subjectId: target.id,
        summary: {
          membershipId: target.id,
          displayName: target.displayName,
          reason: 'REMOVED',
        },
        occurredAt: now,
      });
    });
  }

  async leaveFamily(accountId: string, familyId: string): Promise<void> {
    await this.serializable(async (transaction) => {
      const actor = await this.policy.requireMembership(accountId, familyId, transaction);
      if (actor.role === 'OWNER') this.policy.ownerRequired();
      const now = new Date();
      const result = await transaction.familyMembership.updateMany({
        where: { id: actor.id, status: 'ACTIVE', role: actor.role },
        data: { status: 'LEFT', leftAt: now },
      });
      if (result.count !== 1) this.policy.stateConflict();
      await this.revokeOutstandingInvitations(transaction, actor.id, now);
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

  async createInvitation(accountId: string, familyId: string): Promise<CreatedInvitationDto> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rawToken = this.generateToken();
      const tokenDigest = this.invitationDigest(rawToken);
      try {
        return await this.serializable(async (transaction) => {
          const actor = await this.policy.requireMembership(accountId, familyId, transaction);
          this.policy.requireInvitationManager(actor);
          const invitation = await transaction.familyInvitation.create({
            data: {
              familyId,
              createdByMembershipId: actor.id,
              tokenDigest,
              role: 'MEMBER',
              expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
            },
          });
          return {
            invitation: this.invitationSummary(invitation, actor),
            token: this.formatToken(rawToken),
          };
        });
      } catch (error) {
        if (['P2002', 'UniqueConstraintViolation'].includes(this.databaseErrorKind(error) ?? '')) {
          continue;
        }
        throw error;
      }
    }
    throw new ApiProblemException(
      503,
      'Family invitations are temporarily unavailable.',
      'FAMILY_DEPENDENCY_UNAVAILABLE',
    );
  }

  async listInvitations(accountId: string, familyId: string): Promise<ActiveInvitationDto[]> {
    const actor = await this.policy.requireMembership(accountId, familyId);
    this.policy.requireInvitationManager(actor);
    const now = new Date();
    const invitations = await this.prisma.familyInvitation.findMany({
      where: {
        familyId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
        createdBy: { status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
      },
      include: { createdBy: true },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
    });
    return invitations.map((invitation) =>
      this.invitationSummary(invitation, invitation.createdBy),
    );
  }

  async revokeInvitation(accountId: string, familyId: string, invitationId: string): Promise<void> {
    await this.serializable(async (transaction) => {
      const actor = await this.policy.requireMembership(accountId, familyId, transaction);
      this.policy.requireInvitationManager(actor);
      const invitation = await transaction.familyInvitation.findFirst({
        where: { id: invitationId, familyId },
        select: { id: true, revokedAt: true, usedAt: true },
      });
      if (!invitation) {
        throw new ApiProblemException(
          404,
          'The invitation could not be found.',
          'FAMILY_INVITATION_NOT_FOUND',
        );
      }
      if (!invitation.revokedAt && !invitation.usedAt) {
        await transaction.familyInvitation.update({
          where: { id: invitation.id },
          data: { revokedAt: new Date() },
        });
      }
    });
  }

  async acceptInvitation(
    accountId: string,
    token: string,
    displayName: string,
  ): Promise<FamilySummaryDto> {
    const normalized = this.normalizeToken(token);
    const tokenDigest = this.invitationDigest(normalized);
    return this.serializable(async (transaction) => {
      const now = new Date();
      const invitation = await transaction.familyInvitation.findUnique({
        where: { tokenDigest },
        include: { createdBy: true, family: true },
      });
      if (
        !invitation ||
        invitation.usedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= now ||
        invitation.role !== 'MEMBER' ||
        invitation.createdBy.status !== 'ACTIVE' ||
        !['OWNER', 'ADMIN'].includes(invitation.createdBy.role)
      ) {
        this.invitationInvalid();
      }
      const existing = await transaction.familyMembership.findUnique({
        where: { familyId_accountId: { familyId: invitation.familyId, accountId } },
      });
      if (existing?.status === 'ACTIVE') {
        throw new ApiProblemException(
          409,
          'This account is already a member of the family.',
          'ALREADY_FAMILY_MEMBER',
        );
      }
      const consumed = await transaction.familyInvitation.updateMany({
        where: {
          id: invitation.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now, usedByAccountId: accountId },
      });
      if (consumed.count !== 1) this.invitationInvalid();
      const membership = existing
        ? await transaction.familyMembership.update({
            where: { id: existing.id },
            data: {
              role: 'MEMBER',
              status: 'ACTIVE',
              displayName,
              joinedAt: now,
              leftAt: null,
            },
          })
        : await transaction.familyMembership.create({
            data: {
              familyId: invitation.familyId,
              accountId,
              role: 'MEMBER',
              status: 'ACTIVE',
              displayName,
              joinedAt: now,
            },
          });
      await this.activities.record(transaction, {
        familyId: invitation.familyId,
        actorMembershipId: membership.id,
        type: 'MEMBER_JOINED',
        subjectType: 'MEMBERSHIP',
        subjectId: membership.id,
        summary: {
          membershipId: membership.id,
          displayName: membership.displayName,
          role: membership.role,
          joinKind: existing ? 'REJOINED' : 'NEW',
        },
        occurredAt: now,
      });
      return this.familySummary(invitation.family, membership);
    });
  }

  normalizeToken(value: string): string {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '')
      .replace(/O/g, '0')
      .replace(/[IL]/g, '1');
    if (!/^[0-9A-HJKMNP-TV-Z]{12}$/.test(normalized)) this.invitationInvalid();
    return normalized;
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

  private invitationSummary(
    invitation: { id: string; expiresAt: Date; createdAt: Date },
    creator: Pick<FamilyMembership, 'id' | 'displayName'>,
  ): ActiveInvitationDto {
    return {
      id: invitation.id,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      createdBy: { membershipId: creator.id, displayName: creator.displayName },
    };
  }

  private async revokeOutstandingInvitations(
    transaction: Prisma.TransactionClient,
    membershipId: string,
    now = new Date(),
  ): Promise<void> {
    await transaction.familyInvitation.updateMany({
      where: { createdByMembershipId: membershipId, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  private generateToken(): string {
    return [...randomBytes(12)].map((value) => INVITATION_ALPHABET[value & 31]).join('');
  }

  private formatToken(value: string): string {
    return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`;
  }

  private invitationDigest(value: string): string {
    return createHmac('sha256', this.config.auth.hmacSecret)
      .update(`family-invitation:v1:${value}`)
      .digest('hex');
  }

  private invitationInvalid(): never {
    throw new ApiProblemException(
      400,
      'The invitation is invalid or no longer available.',
      'INVITATION_INVALID',
    );
  }

  private async serializable<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, { isolationLevel: 'Serializable' });
      } catch (error) {
        if (
          ['P2034', 'TransactionWriteConflict'].includes(this.databaseErrorKind(error) ?? '') &&
          attempt < 4
        ) {
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 10));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Unreachable transaction retry state');
  }

  private databaseErrorKind(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    if ('code' in error && typeof error.code === 'string') return error.code;
    if ('kind' in error && typeof error.kind === 'string') return error.kind;
    return 'cause' in error ? this.databaseErrorKind(error.cause) : undefined;
  }
}
