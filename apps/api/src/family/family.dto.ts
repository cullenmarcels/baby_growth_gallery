import { ApiProperty } from '@nestjs/swagger';

export const familyRoles = ['ADMIN', 'MEMBER'] as const;
export const familyActivityTypes = [
  'FAMILY_CREATED',
  'MEMBER_JOINED',
  'MEMBER_ROLE_CHANGED',
  'MEMBER_LEFT',
  'PHOTO_UPLOADED',
  'COMMENT_ADDED',
  'REACTION_ADDED',
  'MILESTONE_RECORDED',
  'GROWTH_RECORDED',
] as const;

export class FamilyMembershipSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, minLength: 1, maxLength: 30 }) displayName!: string;
  @ApiProperty({ type: String, enum: familyRoles }) role!: (typeof familyRoles)[number];
}

export class FamilySummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, minLength: 1, maxLength: 40 }) name!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: () => FamilyMembershipSummaryDto })
  currentMembership!: FamilyMembershipSummaryDto;
}

export class FamilyListResponseDto {
  @ApiProperty({ type: () => [FamilySummaryDto] }) items!: FamilySummaryDto[];
}

export class FamilyMemberDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, minLength: 1, maxLength: 30 }) displayName!: string;
  @ApiProperty({ type: String, enum: familyRoles }) role!: (typeof familyRoles)[number];
  @ApiProperty({ type: String, enum: ['ACTIVE'] }) status!: 'ACTIVE';
  @ApiProperty({ type: String, format: 'date-time' }) joinedAt!: string;
  @ApiProperty({ type: Boolean }) isCurrentAccount!: boolean;
}

export class FamilyMemberListResponseDto {
  @ApiProperty({ type: () => [FamilyMemberDto] }) items!: FamilyMemberDto[];
}

export class ActivityActorDto {
  @ApiProperty({ nullable: true, format: 'uuid', type: String }) membershipId!: string | null;
  @ApiProperty({ type: String }) displayName!: string;
}

export class ActivitySubjectDto {
  @ApiProperty({ type: String }) type!: string;
  @ApiProperty({ type: String }) id!: string;
}

export class FamilyCreatedSummaryDto {
  @ApiProperty({ type: String }) familyName!: string;
}

export class MemberJoinedSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) membershipId!: string;
  @ApiProperty({ type: String }) displayName!: string;
  @ApiProperty({ type: String, enum: familyRoles }) role!: (typeof familyRoles)[number];
  @ApiProperty({ type: String, enum: ['NEW', 'REJOINED'] }) joinKind!: 'NEW' | 'REJOINED';
}

export class MemberRoleChangedSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) membershipId!: string;
  @ApiProperty({ type: String }) displayName!: string;
  @ApiProperty({ type: String, enum: familyRoles }) fromRole!: (typeof familyRoles)[number];
  @ApiProperty({ type: String, enum: familyRoles }) toRole!: (typeof familyRoles)[number];
}

export class MemberLeftSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) membershipId!: string;
  @ApiProperty({ type: String }) displayName!: string;
  @ApiProperty({ type: String, enum: ['LEFT', 'REMOVED'] }) reason!: 'LEFT' | 'REMOVED';
}

export class PhotoUploadedActivitySummaryV1Dto {
  @ApiProperty({ type: String, format: 'uuid' }) babyId!: string;
}

export class MilestoneRecordedActivitySummaryV1Dto {
  @ApiProperty({ type: String, format: 'uuid' }) babyId!: string;
}

export class ActiveFamilyActivityItemDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, enum: ['ACTIVE'] }) visibility!: 'ACTIVE';
  @ApiProperty({ type: String, enum: familyActivityTypes })
  type!: (typeof familyActivityTypes)[number];
  @ApiProperty({ type: Number, example: 1 }) schemaVersion!: number;
  @ApiProperty({ type: String, format: 'date-time' }) occurredAt!: string;
  @ApiProperty({ type: () => ActivityActorDto }) actor!: ActivityActorDto;
  @ApiProperty({ required: false, type: () => ActivitySubjectDto }) subject?: ActivitySubjectDto;
  @ApiProperty({
    type: Object,
    oneOf: [
      { $ref: '#/components/schemas/FamilyCreatedSummaryDto' },
      { $ref: '#/components/schemas/MemberJoinedSummaryDto' },
      { $ref: '#/components/schemas/MemberRoleChangedSummaryDto' },
      { $ref: '#/components/schemas/MemberLeftSummaryDto' },
      { $ref: '#/components/schemas/PhotoUploadedActivitySummaryV1Dto' },
      { $ref: '#/components/schemas/MilestoneRecordedActivitySummaryV1Dto' },
    ],
  })
  summary!: Record<string, unknown>;
}

export class TombstonedFamilyActivityItemDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, enum: ['TOMBSTONED'] }) visibility!: 'TOMBSTONED';
  @ApiProperty({ type: String, enum: ['CONTENT_DELETED'] }) type!: 'CONTENT_DELETED';
  @ApiProperty({ type: String, format: 'date-time' }) occurredAt!: string;
  @ApiProperty({ type: String, example: '内容已删除' }) message!: '内容已删除';
}

export class FamilyActivityPageDto {
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/ActiveFamilyActivityItemDto' },
        { $ref: '#/components/schemas/TombstonedFamilyActivityItemDto' },
      ],
    },
  })
  items!: Array<ActiveFamilyActivityItemDto | TombstonedFamilyActivityItemDto>;

  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}
