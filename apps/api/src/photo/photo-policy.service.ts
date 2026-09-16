import { Inject, Injectable } from '@nestjs/common';
import type { FamilyMembership, Photo, Prisma } from '../generated/prisma/client.js';
import { ApiProblemException } from '../common/api-problem.exception.js';
import { BabyPolicyService } from '../baby/baby-policy.service.js';
import { PrismaService } from '../infrastructure/prisma.service.js';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PhotoPolicyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(BabyPolicyService) private readonly babies: BabyPolicyService,
  ) {}

  async requireActiveBaby(
    accountId: string,
    familyId: string,
    babyId: string,
    database: DatabaseClient = this.prisma,
  ) {
    return this.babies.requireBaby(accountId, familyId, babyId, ['ACTIVE'], database);
  }

  async requirePhoto(
    accountId: string,
    familyId: string,
    babyId: string,
    photoId: string,
    database: DatabaseClient = this.prisma,
  ): Promise<{ membership: FamilyMembership; photo: Photo }> {
    const { membership } = await this.requireActiveBaby(accountId, familyId, babyId, database);
    const photo = await database.photo.findFirst({ where: { id: photoId, familyId, babyId } });
    if (!photo) this.notFound();
    return { membership, photo };
  }

  canManagePublished(membership: FamilyMembership, photo: Photo): boolean {
    return (
      photo.createdByMembershipId === membership.id || ['OWNER', 'ADMIN'].includes(membership.role)
    );
  }

  requirePrivateOwner(membership: FamilyMembership, photo: Photo): void {
    if (photo.createdByMembershipId !== membership.id) this.notFound();
  }

  notFound(): never {
    throw new ApiProblemException(404, '未找到这张照片。', 'PHOTO_NOT_FOUND');
  }
  permissionDenied(): never {
    throw new ApiProblemException(403, '你没有权限执行此照片操作。', 'PHOTO_PERMISSION_DENIED');
  }
  stateConflict(): never {
    throw new ApiProblemException(
      409,
      '照片状态已发生变化，请刷新后重试。',
      'PHOTO_STATE_CONFLICT',
    );
  }
}
