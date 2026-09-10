import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DependencyHealthDto {
  @ApiProperty({ type: String, enum: ['up', 'down'] })
  postgres!: 'up' | 'down';

  @ApiProperty({ type: String, enum: ['up', 'down'] })
  redis!: 'up' | 'down';

  @ApiProperty({ type: String, enum: ['up', 'down'] })
  objectStorage!: 'up' | 'down';
}

export class HealthResponseDto {
  @ApiProperty({ type: String, enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ type: String, example: 'baby-growth-gallery-api' })
  service!: 'baby-growth-gallery-api';

  @ApiProperty({ type: String, example: '0.1.0' })
  version!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;

  @ApiPropertyOptional({ type: DependencyHealthDto })
  dependencies?: DependencyHealthDto;
}

export class ApiProblemDto {
  @ApiProperty({ type: String }) type!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: Number }) status!: number;
  @ApiProperty({ type: String }) detail!: string;
  @ApiProperty({ type: String }) instance!: string;
  @ApiProperty({ type: String }) traceId!: string;
  @ApiPropertyOptional({ type: String }) code?: string;
  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      required: ['field', 'code'],
      properties: { field: { type: 'string' }, code: { type: 'string' } },
    },
  })
  violations?: Array<{ field: string; code: string }>;
}
