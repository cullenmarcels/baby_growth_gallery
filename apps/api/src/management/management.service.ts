import { Inject, Injectable } from '@nestjs/common';
import type { Account, FamilyRole, Prisma } from '../generated/prisma/client.js';
import { LEGAL_DRAFT_VERSION } from '../auth/auth.schemas.js';
import { issueTemporaryPassword } from '../auth/password.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { FamilyActivityService } from '../family/family-activity.service.js';
import { FamilyPolicyService } from '../family/family-policy.service.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { databaseErrorKind, serializable } from '../infrastructure/serializable.js';
import type {
  IssuedPasswordDto,
  ManagedAccountDetailDto,
  ManagedAccountDto,
  ManagedFamilyDetailDto,
  ManagedFamilyDto,
  ManagedFamilyListItemDto,
} from './management.dto.js';

type Actor = Pick<Account, 'id' | 'authVersion'>;
type AccountInput = { username: string; displayName: string };
type TemporaryPassword = Awaited<ReturnType<typeof issueTemporaryPassword>>;
const accountSummary = { id: true, username: true, displayName: true, status: true } as const;
const effectiveAdmin = { role: 'ADMIN', status: 'ACTIVE', account: { status: 'ACTIVE' } } as const;
const managedMemberInclude = {
  account: {
    include: { _count: { select: { familyMemberships: { where: { status: 'ACTIVE' } } } } },
  },
} as const;

@Injectable()
export class ManagementService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FamilyPolicyService) private readonly policy: FamilyPolicyService,
    @Inject(FamilyActivityService) private readonly activities: FamilyActivityService,
  ) {}

  listAccounts(actor: Actor): Promise<ManagedAccountDto[]> {
    return serializable(this.prisma, async (db) => {
      await this.requireSiteAdmin(db, actor);
      return db.account.findMany({
        where: { siteRole: 'USER' },
        select: accountSummary,
        orderBy: { username: 'asc' },
      });
    });
  }

  accountDetail(actor: Actor, accountId: string): Promise<ManagedAccountDetailDto> {
    return serializable(this.prisma, async (db) => {
      await this.requireSiteAdmin(db, actor);
      const account = await db.account.findFirst({
        where: { id: accountId, siteRole: 'USER' },
        select: {
          ...accountSummary,
          familyMemberships: {
            where: { status: 'ACTIVE' },
            select: { role: true, family: { select: { id: true, name: true } } },
            orderBy: [{ family: { name: 'asc' } }, { familyId: 'asc' }],
          },
        },
      });
      if (!account) {
        throw new ApiProblemException(404, 'The account could not be found.', 'ACCOUNT_NOT_FOUND');
      }
      const { familyMemberships, ...summary } = account;
      return {
        ...summary,
        families: familyMemberships.map(({ family, role }) => ({ ...family, role })),
      };
    });
  }

  listFamilies(actor: Actor): Promise<ManagedFamilyListItemDto[]> {
    return serializable(this.prisma, async (db) => {
      await this.requireSiteAdmin(db, actor);
      const families = await db.family.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
          memberships: { where: effectiveAdmin, take: 1, select: { id: true } },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
      return families.map(({ id, name, _count, memberships }) => ({
        id,
        name,
        isOpen: memberships.length > 0,
        memberCount: _count.memberships,
      }));
    });
  }

  createFamily(actor: Actor, name: string): Promise<ManagedFamilyDto> {
    return serializable(this.prisma, async (db) => {
      await this.requireSiteAdmin(db, actor);
      const family = await db.family.create({ data: { name, createdByAccountId: actor.id } });
      await this.activities.record(db, {
        familyId: family.id,
        actorMembershipId: null,
        type: 'FAMILY_CREATED',
        subjectType: 'FAMILY',
        subjectId: family.id,
        summary: { familyName: family.name },
      });
      return { id: family.id, name: family.name, isOpen: false };
    });
  }

  familyDetail(actor: Actor, familyId: string): Promise<ManagedFamilyDetailDto> {
    return serializable(this.prisma, async (db) => {
      const manager = await this.requireManager(db, actor, familyId);
      const family = await this.findFamily(db, familyId);
      const members = await db.familyMembership.findMany({
        where: { familyId, status: 'ACTIVE' },
        include: managedMemberInclude,
        orderBy: [{ role: 'asc' }, { displayName: 'asc' }, { id: 'asc' }],
      });
      return {
        id: family.id,
        name: family.name,
        isOpen: members.some(
          (member) => member.role === 'ADMIN' && member.account.status === 'ACTIVE',
        ),
        members: members.map((member) => ({
          id: member.id,
          username: member.account.username,
          displayName: member.displayName,
          role: member.role,
          accountStatus: member.account.status,
          canResetPassword:
            manager !== null &&
            member.role === 'MEMBER' &&
            this.canFamilyReset(member.account, actor.id, familyId),
        })),
      };
    });
  }

  async createAccount(
    actor: Actor,
    input: AccountInput,
    familyId?: string,
  ): Promise<IssuedPasswordDto> {
    try {
      return await serializable(this.prisma, async (db) => {
        const manager = familyId
          ? await this.requireManager(db, actor, familyId)
          : await this.requireSiteAdmin(db, actor);
        if (familyId) await this.requireOpen(db, familyId);
        const credential = await issueTemporaryPassword();
        const account = await db.account.create({
          data: {
            ...input,
            ...this.credentialData(credential, manager !== null),
            createdByAccountId: actor.id,
            createdInFamilyId: familyId ?? null,
          },
        });
        if (familyId) {
          await this.addMembership(
            db,
            familyId,
            account,
            'MEMBER',
            input.displayName,
            manager?.id ?? null,
          );
        }
        return this.issued(input.username, credential);
      });
    } catch (error) {
      if (['P2002', 'UniqueConstraintViolation'].includes(databaseErrorKind(error) ?? '')) {
        throw new ApiProblemException(409, 'That username is already in use.', 'USERNAME_TAKEN');
      }
      throw error;
    }
  }

  async resetAccount(actor: Actor, accountId: string): Promise<IssuedPasswordDto> {
    return serializable(this.prisma, async (db) => {
      await this.requireSiteAdmin(db, actor);
      const target = await this.findManagedAccount(db, accountId);
      const credential = await issueTemporaryPassword();
      await this.writeCredential(db, target, credential, false);
      return this.issued(target.username, credential);
    });
  }

  async resetMember(
    actor: Actor,
    familyId: string,
    membershipId: string,
  ): Promise<IssuedPasswordDto> {
    return serializable(this.prisma, async (db) => {
      const manager = await this.requireManager(db, actor, familyId);
      const target = await db.familyMembership.findFirst({
        where: { id: membershipId, familyId, status: 'ACTIVE' },
        include: managedMemberInclude,
      });
      if (!target) this.policy.stateConflict();
      if (
        !manager ||
        target.role !== 'MEMBER' ||
        !this.canFamilyReset(target.account, actor.id, familyId)
      ) {
        this.policy.permissionDenied();
      }
      const credential = await issueTemporaryPassword();
      await this.writeCredential(db, target.account, credential, true);
      return this.issued(target.account.username, credential);
    });
  }

  setStatus(
    actor: Actor,
    accountId: string,
    status: Account['status'],
  ): Promise<ManagedAccountDto> {
    return serializable(this.prisma, async (db) => {
      await this.requireSiteAdmin(db, actor);
      const target = await this.findManagedAccount(db, accountId);
      if (target.status === status) {
        return {
          id: target.id,
          username: target.username,
          displayName: target.displayName,
          status,
        };
      }
      if (status === 'DISABLED') {
        const roles = await db.familyMembership.findMany({
          where: { accountId, role: 'ADMIN', status: 'ACTIVE' },
          select: { familyId: true },
        });
        for (const role of roles) await this.policy.requireOtherAdmin(db, role.familyId, accountId);
      }
      return db.account.update({
        where: { id: accountId },
        data: { status, authVersion: { increment: 1 } },
        select: accountSummary,
      });
    });
  }

  async addMember(
    actor: Actor,
    familyId: string,
    input: AccountInput & { role: FamilyRole },
  ): Promise<void> {
    await serializable(this.prisma, async (db) => {
      const manager = await this.requireManager(db, actor, familyId);
      if (manager && input.role !== 'MEMBER') this.policy.permissionDenied();
      await this.findFamily(db, familyId);
      if (input.role === 'MEMBER') await this.requireOpen(db, familyId);
      const target = await db.account.findFirst({
        where: {
          username: input.username,
          status: 'ACTIVE',
          ...(manager ? { siteRole: 'USER' } : {}),
        },
      });
      if (!target)
        throw new ApiProblemException(404, 'The account could not be found.', 'ACCOUNT_NOT_FOUND');
      await this.addMembership(
        db,
        familyId,
        target,
        input.role,
        input.displayName,
        manager?.id ?? null,
      );
    });
  }

  async setRole(
    actor: Actor,
    familyId: string,
    membershipId: string,
    role: FamilyRole,
  ): Promise<void> {
    await serializable(this.prisma, async (db) => {
      await this.requireSiteAdmin(db, actor);
      const target = await this.findMember(db, familyId, membershipId);
      if (target.role === role) return;
      if (role === 'ADMIN' && target.account.status !== 'ACTIVE') this.policy.stateConflict();
      this.checkTemporaryCredential(target.account, role);
      if (target.role === 'ADMIN' && target.account.status === 'ACTIVE') {
        await this.policy.requireOtherAdmin(db, familyId, target.accountId);
      }
      await db.familyMembership.update({ where: { id: target.id }, data: { role } });
      await this.activities.record(db, {
        familyId,
        actorMembershipId: null,
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
    });
  }

  async removeMember(actor: Actor, familyId: string, membershipId: string): Promise<void> {
    await serializable(this.prisma, async (db) => {
      const manager = await this.requireManager(db, actor, familyId);
      const target = await this.findMember(db, familyId, membershipId);
      if (manager && target.role !== 'MEMBER') this.policy.permissionDenied();
      if (target.role === 'ADMIN' && target.account.status === 'ACTIVE') {
        await this.policy.requireOtherAdmin(db, familyId, target.accountId);
      }
      const now = new Date();
      await db.familyMembership.update({
        where: { id: target.id },
        data: { status: 'REMOVED', leftAt: now },
      });
      await this.activities.record(db, {
        familyId,
        actorMembershipId: manager?.id ?? null,
        type: 'MEMBER_LEFT',
        subjectType: 'MEMBERSHIP',
        subjectId: target.id,
        occurredAt: now,
        summary: { membershipId: target.id, displayName: target.displayName, reason: 'REMOVED' },
      });
    });
  }

  private async addMembership(
    db: Prisma.TransactionClient,
    familyId: string,
    target: Account,
    role: FamilyRole,
    displayName: string,
    actorMembershipId: string | null,
  ): Promise<void> {
    const existing = await db.familyMembership.findUnique({
      where: { familyId_accountId: { familyId, accountId: target.id } },
    });
    if (existing?.status === 'ACTIVE') this.policy.stateConflict();
    if (target.familyIssuedPassword) {
      const otherMembership = await db.familyMembership.findFirst({
        where: { accountId: target.id, status: 'ACTIVE', familyId: { not: familyId } },
        select: { id: true },
      });
      // A family-issued credential may only be used in its issuing family until rotated.
      if (otherMembership || target.createdInFamilyId !== familyId) this.credentialRestricted();
    }
    this.checkTemporaryCredential(target, role);
    const data = {
      role,
      displayName,
      status: 'ACTIVE' as const,
      joinedAt: new Date(),
      leftAt: null,
    };
    const membership = existing
      ? await db.familyMembership.update({ where: { id: existing.id }, data })
      : await db.familyMembership.create({ data: { ...data, familyId, accountId: target.id } });
    await this.activities.record(db, {
      familyId,
      actorMembershipId,
      type: 'MEMBER_JOINED',
      subjectType: 'MEMBERSHIP',
      subjectId: membership.id,
      summary: {
        membershipId: membership.id,
        displayName,
        role,
        joinKind: existing ? 'REJOINED' : 'NEW',
      },
    });
  }

  private canFamilyReset(
    account: Account & { _count: { familyMemberships: number } },
    actorId: string,
    familyId: string,
  ): boolean {
    return (
      account.siteRole === 'USER' &&
      account.status === 'ACTIVE' &&
      account.createdByAccountId === actorId &&
      account.createdInFamilyId === familyId &&
      account._count.familyMemberships === 1
    );
  }

  private async requireCurrentActor(db: Prisma.TransactionClient, actor: Actor) {
    const current = await db.account.findFirst({
      where: {
        id: actor.id,
        authVersion: actor.authVersion,
        status: 'ACTIVE',
        temporaryPasswordExpiresAt: null,
        acceptedLegalVersion: LEGAL_DRAFT_VERSION,
      },
      select: { siteRole: true },
    });
    if (!current)
      throw new ApiProblemException(401, 'Authentication is required.', 'SESSION_REQUIRED');
    return current;
  }

  private async requireSiteAdmin(db: Prisma.TransactionClient, actor: Actor): Promise<null> {
    if ((await this.requireCurrentActor(db, actor)).siteRole !== 'SUPER_ADMIN')
      this.policy.permissionDenied();
    return null;
  }

  private async requireManager(db: Prisma.TransactionClient, actor: Actor, familyId: string) {
    if ((await this.requireCurrentActor(db, actor)).siteRole === 'SUPER_ADMIN') return null;
    const membership = await this.policy.requireMembership(actor.id, familyId, db);
    this.policy.requireAdmin(membership);
    return membership;
  }

  private async findFamily(db: Prisma.TransactionClient, id: string) {
    const family = await db.family.findUnique({ where: { id } });
    if (!family)
      throw new ApiProblemException(404, 'The family could not be found.', 'FAMILY_NOT_FOUND');
    return family;
  }

  private async requireOpen(db: Prisma.TransactionClient, familyId: string) {
    await this.findFamily(db, familyId);
    const administrator = await db.familyMembership.findFirst({
      where: { familyId, ...effectiveAdmin },
      select: { id: true },
    });
    if (!administrator)
      throw new ApiProblemException(
        409,
        'Appoint a family administrator first.',
        'FAMILY_ADMIN_REQUIRED',
      );
  }

  private async findMember(db: Prisma.TransactionClient, familyId: string, id: string) {
    const member = await db.familyMembership.findFirst({
      where: { id, familyId, status: 'ACTIVE' },
      include: { account: true },
    });
    if (!member) this.policy.stateConflict();
    return member;
  }

  private async findManagedAccount(db: Prisma.TransactionClient, id: string) {
    const account = await db.account.findFirst({ where: { id, siteRole: 'USER' } });
    if (!account)
      throw new ApiProblemException(404, 'The account could not be found.', 'ACCOUNT_NOT_FOUND');
    return account;
  }

  private checkTemporaryCredential(account: Account, role: FamilyRole) {
    if (account.familyIssuedPassword && role === 'ADMIN') this.credentialRestricted();
  }

  private credentialRestricted(): never {
    throw new ApiProblemException(
      409,
      'The member must choose a password different from the family-issued password.',
      'TEMPORARY_PASSWORD_RESTRICTED',
    );
  }

  private credentialData(credential: TemporaryPassword, issuedByFamily: boolean) {
    return {
      passwordHash: credential.passwordHash,
      passwordChangedAt: new Date(),
      temporaryPasswordExpiresAt: credential.expiresAt,
      familyIssuedPassword: issuedByFamily,
    };
  }

  private async writeCredential(
    db: Prisma.TransactionClient,
    target: Account,
    credential: TemporaryPassword,
    issuedByFamily: boolean,
  ) {
    await db.account.update({
      where: { id: target.id },
      data: { ...this.credentialData(credential, issuedByFamily), authVersion: { increment: 1 } },
    });
  }

  private issued(username: string, credential: TemporaryPassword): IssuedPasswordDto {
    return {
      username,
      temporaryPassword: credential.temporaryPassword,
      expiresAt: credential.expiresAt.toISOString(),
    };
  }
}
