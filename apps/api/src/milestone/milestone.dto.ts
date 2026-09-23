import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const milestoneSources = ['TEMPLATE', 'CUSTOM'] as const;
export const milestoneStates = ['PENDING', 'COMPLETED'] as const;

export class MilestoneTemplateDto {
  @ApiProperty({ type: String }) key!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: Boolean }) isAdded!: boolean;
}
export class MilestoneTemplateListDto {
  @ApiProperty({ type: () => [MilestoneTemplateDto] }) items!: MilestoneTemplateDto[];
}
export class MilestoneAuthorDto {
  @ApiProperty({ type: String, format: 'uuid' }) membershipId!: string;
  @ApiProperty({ type: String }) displayName!: string;
}
export class MilestoneSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) babyId!: string;
  @ApiProperty({ enum: milestoneSources }) source!: (typeof milestoneSources)[number];
  @ApiProperty({ type: String, nullable: true }) templateKey!: string | null;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ enum: milestoneStates }) state!: (typeof milestoneStates)[number];
  @ApiProperty({ type: String, format: 'date', nullable: true }) reminderOn!: string | null;
  @ApiProperty({ type: String, format: 'date', nullable: true }) completedOn!: string | null;
  @ApiProperty({ type: String, nullable: true }) completionNote!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt!: string | null;
  @ApiProperty({ type: Number }) photoCount!: number;
  @ApiProperty({ type: () => MilestoneAuthorDto }) createdBy!: MilestoneAuthorDto;
  @ApiProperty({ type: Boolean }) canManage!: boolean;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class MilestoneDetailDto extends MilestoneSummaryDto {
  @ApiProperty({ type: () => [MilestonePhotoDto] }) photos!: MilestonePhotoDto[];
}
export class MilestonePhotoDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ type: String, format: 'date' }) capturedOn!: string;
  @ApiProperty({ type: Number, nullable: true }) width!: number | null;
  @ApiProperty({ type: Number, nullable: true }) height!: number | null;
}
export class MilestonePageDto {
  @ApiProperty({ type: () => [MilestoneSummaryDto] }) items!: MilestoneSummaryDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class MilestoneProgressDto {
  @ApiProperty({ type: Number }) completed!: number;
  @ApiProperty({ type: Number }) total!: number;
}
export class MilestoneOverviewDto {
  @ApiProperty({ type: () => MilestoneProgressDto }) progress!: MilestoneProgressDto;
  @ApiProperty({ type: () => [MilestoneSummaryDto] }) reminders!: MilestoneSummaryDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class CreateTemplateMilestoneRequestDto {
  @ApiProperty({ enum: ['TEMPLATE'] }) source!: 'TEMPLATE';
  @ApiProperty({ type: String }) templateKey!: string;
  @ApiPropertyOptional({ type: String, format: 'date', nullable: true }) reminderOn?: string | null;
}
export class CreateCustomMilestoneRequestDto {
  @ApiProperty({ enum: ['CUSTOM'] }) source!: 'CUSTOM';
  @ApiProperty({ type: String, minLength: 1, maxLength: 40 }) title!: string;
  @ApiPropertyOptional({ type: String, format: 'date', nullable: true }) reminderOn?: string | null;
}
export class UpdateMilestoneRequestDto {
  @ApiProperty({ type: Number, minimum: 1 }) expectedVersion!: number;
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 40 }) title?: string;
  @ApiPropertyOptional({ type: String, format: 'date', nullable: true }) reminderOn?: string | null;
}
export class CompleteMilestoneRequestDto {
  @ApiProperty({ type: Number, minimum: 1 }) expectedVersion!: number;
  @ApiProperty({ type: String, format: 'date' }) completedOn!: string;
  @ApiPropertyOptional({ type: String, maxLength: 1000, nullable: true }) completionNote?:
    string | null;
  @ApiProperty({ type: [String], format: 'uuid', maxItems: 10 }) photoIds!: string[];
}
export class ReopenMilestoneRequestDto {
  @ApiProperty({ type: Number, minimum: 1 }) expectedVersion!: number;
}
