import { ApiProperty } from '@nestjs/swagger';

export const babySexes = ['MALE', 'FEMALE'] as const;
export const babyStatuses = ['ACTIVE', 'ARCHIVED'] as const;

export class CreateBabyRequestDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 30 }) nickname!: string;
  @ApiProperty({ type: String, format: 'date' }) birthDate!: string;
  @ApiProperty({ nullable: true, required: false, type: String, enum: babySexes })
  sex?: (typeof babySexes)[number] | null;
}

export class UpdateBabyRequestDto {
  @ApiProperty({ required: false, type: String, minLength: 1, maxLength: 30 })
  nickname?: string;
  @ApiProperty({ required: false, type: String, format: 'date' }) birthDate?: string;
  @ApiProperty({ nullable: true, required: false, type: String, enum: babySexes })
  sex?: (typeof babySexes)[number] | null;
}

export class BabySummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) familyId!: string;
  @ApiProperty({ type: String, minLength: 1, maxLength: 30 }) nickname!: string;
  @ApiProperty({ type: String, format: 'date' }) birthDate!: string;
  @ApiProperty({ nullable: true, type: String, enum: babySexes })
  sex!: (typeof babySexes)[number] | null;
  @ApiProperty({ type: String, enum: babyStatuses }) status!: (typeof babyStatuses)[number];
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) archivedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) purgeAfter!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}

export class BabyListResponseDto {
  @ApiProperty({ type: () => [BabySummaryDto] }) items!: BabySummaryDto[];
}
