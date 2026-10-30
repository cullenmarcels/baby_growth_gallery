import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { growthMetrics, growthStates, positions } from './growth.schemas.js';

export class GrowthReferenceDto {
  @ApiProperty({ type: String, nullable: true }) standard!: string | null;
  @ApiProperty({ type: Number, nullable: true }) zScore!: number | null;
  @ApiProperty({ type: Number, nullable: true }) percentile!: number | null;
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
}
export class GrowthValueDto {
  @ApiProperty({ enum: growthMetrics }) metric!: (typeof growthMetrics)[number];
  @ApiProperty({ type: Number, nullable: true }) value!: number | null;
  @ApiProperty({ type: () => GrowthReferenceDto }) reference!: GrowthReferenceDto;
}
export class GrowthAuthorDto {
  @ApiProperty({ type: String }) displayName!: string;
}
export class GrowthRecordDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) babyId!: string;
  @ApiProperty({ type: String, format: 'date' }) measuredOn!: string;
  @ApiProperty({ type: Number, nullable: true }) lengthCm!: number | null;
  @ApiProperty({ type: Number, nullable: true }) weightKg!: number | null;
  @ApiProperty({ type: Number, nullable: true }) headCm!: number | null;
  @ApiProperty({ type: Number, nullable: true }) bmi!: number | null;
  @ApiProperty({ enum: positions, nullable: true }) measurementPosition!:
    (typeof positions)[number] | null;
  @ApiProperty({ type: String, nullable: true }) note!: string | null;
  @ApiProperty({ enum: growthStates }) status!: (typeof growthStates)[number];
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: () => GrowthAuthorDto }) createdBy!: GrowthAuthorDto;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true }) purgeAfter!: string | null;
  @ApiProperty({ type: Boolean }) canManage!: boolean;
  @ApiProperty({ type: Boolean }) canRestore!: boolean;
  @ApiProperty({ type: Boolean }) canPurge!: boolean;
  @ApiProperty({ type: Boolean }) dateConflict!: boolean;
  @ApiProperty({ type: () => [GrowthValueDto] }) measurements!: GrowthValueDto[];
}
export class GrowthPageDto {
  @ApiProperty({ type: () => [GrowthRecordDto] }) items!: GrowthRecordDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class GrowthLatestDto extends GrowthValueDto {
  @ApiProperty({ type: String }) recordId!: string;
  @ApiProperty({ type: String, format: 'date' }) measuredOn!: string;
}
export class GrowthOverviewDto {
  @ApiProperty({ type: () => [GrowthLatestDto] }) latest!: GrowthLatestDto[];
}
export class GrowthCurvePointDto {
  @ApiProperty({ type: String, format: 'date' }) measuredOn!: string;
  @ApiProperty({ type: Number }) median!: number;
  @ApiProperty({ type: Number }) lower!: number;
  @ApiProperty({ type: Number }) upper!: number;
  @ApiProperty({ type: String }) standard!: string;
}
export class GrowthSeriesDto extends GrowthPageDto {
  @ApiProperty({ type: () => [GrowthCurvePointDto] }) referenceCurve!: GrowthCurvePointDto[];
}
export class CreateGrowthRequestDto {
  @ApiProperty({ type: String, format: 'date' }) measuredOn!: string;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0.1,
    maximum: 999999.9,
    multipleOf: 0.1,
  })
  lengthCm?: number | null;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0.01,
    maximum: 999999.99,
    multipleOf: 0.01,
  })
  weightKg?: number | null;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0.1,
    maximum: 999999.9,
    multipleOf: 0.1,
  })
  headCm?: number | null;
  @ApiPropertyOptional({ enum: positions, nullable: true }) measurementPosition?:
    (typeof positions)[number] | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 1000 }) note?: string | null;
}
export class GrowthVersionRequestDto {
  @ApiProperty({ type: Number, minimum: 1 }) expectedVersion!: number;
}
export class UpdateGrowthRequestDto extends PartialType(CreateGrowthRequestDto) {
  @ApiProperty({ type: Number, minimum: 1 }) expectedVersion!: number;
}

export class RestoreGrowthRequestDto extends GrowthVersionRequestDto {
  @ApiPropertyOptional({ type: String, format: 'date' }) measuredOn?: string;
}
