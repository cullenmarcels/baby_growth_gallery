import { ApiProperty } from '@nestjs/swagger';
import { MilestoneSummaryDto } from '../milestone/milestone.dto.js';

export const photoStatuses = [
  'AWAITING_UPLOAD',
  'QUEUED',
  'PROCESSING',
  'DRAFT',
  'PUBLISHED',
  'TRASHED',
  'FAILED',
] as const;
export const variantKinds = ['THUMBNAIL', 'DISPLAY', 'ARCHIVE'] as const;

export class PhotoFileDescriptorDto {
  @ApiProperty({ type: String }) contentType!: string;
  @ApiProperty({ type: Number, minimum: 1, maximum: 20 * 1024 * 1024 }) sizeBytes!: number;
  @ApiProperty({ type: String, format: 'date' }) capturedOn!: string;
}
export class CreatePhotoBatchRequestDto {
  @ApiProperty({ type: () => [PhotoFileDescriptorDto], minItems: 1, maxItems: 20 })
  files!: PhotoFileDescriptorDto[];
}
export class PhotoUploadInstructionDto {
  @ApiProperty({ type: String, format: 'uuid' }) photoId!: string;
  @ApiProperty({ type: String }) url!: string;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  fields!: Record<string, string>;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: string;
}
export class PhotoSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) batchId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) babyId!: string;
  @ApiProperty({ type: String, enum: photoStatuses }) status!: (typeof photoStatuses)[number];
  @ApiProperty({ type: String, nullable: true }) title!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, format: 'date' }) capturedOn!: string;
  @ApiProperty({ type: String, nullable: true }) location!: string | null;
  @ApiProperty({ type: String, nullable: true, enum: ['JPEG', 'PNG', 'WEBP', 'HEIC', 'HEIF'] })
  sourceFormat!: string | null;
  @ApiProperty({ type: Number, nullable: true }) width!: number | null;
  @ApiProperty({ type: Number, nullable: true }) height!: number | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) draftExpiresAt!:
    string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) publishedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) trashedAt!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) purgeAfter!: string | null;
  @ApiProperty({ type: Boolean }) canRestore!: boolean;
  @ApiProperty({ type: String, nullable: true }) failureCode!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class PhotoUploadBatchDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) babyId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: () => [PhotoSummaryDto] }) photos!: PhotoSummaryDto[];
  @ApiProperty({ type: () => [PhotoUploadInstructionDto], required: false })
  uploadInstructions?: PhotoUploadInstructionDto[];
}
export class UpdatePhotoRequestDto {
  @ApiProperty({ type: String, required: false, nullable: true, maxLength: 80 }) title?:
    string | null;
  @ApiProperty({ type: String, required: false, nullable: true, maxLength: 1000 }) description?:
    string | null;
  @ApiProperty({ type: String, required: false, format: 'date' }) capturedOn?: string;
  @ApiProperty({ type: String, required: false, nullable: true, maxLength: 80 }) location?:
    string | null;
}
export class BatchUpdatePhotosRequestDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: 20 }) photoIds!: string[];
  @ApiProperty({ type: String, required: false, format: 'date' }) capturedOn?: string;
  @ApiProperty({ type: String, required: false, nullable: true, maxLength: 80 }) location?:
    string | null;
  @ApiProperty({ type: String, required: false, nullable: true, maxLength: 1000 }) description?:
    string | null;
}
export class PublishPhotosRequestDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: 20 }) photoIds!: string[];
}
export class PhotoListResponseDto {
  @ApiProperty({ type: () => [PhotoSummaryDto] }) items!: PhotoSummaryDto[];
}
export class PhotoManagementPageDto extends PhotoListResponseDto {
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class PublishedPhotoPageDto extends PhotoManagementPageDto {}
export class TimelinePhotoEntryDto {
  @ApiProperty({ type: String, enum: ['PHOTO'] }) kind!: 'PHOTO';
  @ApiProperty({ type: String, format: 'date' }) eventOn!: string;
  @ApiProperty({ type: () => PhotoSummaryDto }) photo!: PhotoSummaryDto;
}
export class TimelineMilestoneEntryDto {
  @ApiProperty({ type: String, enum: ['MILESTONE'] }) kind!: 'MILESTONE';
  @ApiProperty({ type: String, format: 'date' }) eventOn!: string;
  @ApiProperty({ type: () => MilestoneSummaryDto }) milestone!: MilestoneSummaryDto;
}
export class TimelinePageDto {
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: [
        { $ref: '#/components/schemas/TimelinePhotoEntryDto' },
        { $ref: '#/components/schemas/TimelineMilestoneEntryDto' },
      ],
      discriminator: { propertyName: 'kind' },
    },
  })
  items!: Array<TimelinePhotoEntryDto | TimelineMilestoneEntryDto>;
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class PublishedPhotoDetailDto {
  @ApiProperty({ type: () => PhotoSummaryDto }) photo!: PhotoSummaryDto;
  @ApiProperty({ type: Boolean }) canManage!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) previousPhotoId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) nextPhotoId!: string | null;
}
export class PhotoPreviewDto {
  @ApiProperty({ type: String }) url!: string;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: string;
}
