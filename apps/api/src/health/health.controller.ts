import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { InfrastructureService } from '../infrastructure/infrastructure.service.js';
import { ApiProblemDto, HealthResponseDto } from './health.dto.js';

@ApiTags('health')
@ApiExtraModels(ApiProblemDto)
@Controller('health')
export class HealthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(InfrastructureService) private readonly infrastructure: InfrastructureService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness probe' })
  @ApiOkResponse({ type: HealthResponseDto })
  live(): HealthResponseDto {
    return this.response();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Required infrastructure readiness probe' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiResponse({
    status: 503,
    content: {
      'application/problem+json': { schema: { $ref: getSchemaPath(ApiProblemDto) } },
    },
  })
  async ready(): Promise<HealthResponseDto> {
    const dependencies = await this.infrastructure.checkAll();
    const unavailable = Object.entries(dependencies)
      .filter(([, status]) => status === 'down')
      .map(([name]) => name);

    if (unavailable.length > 0) {
      throw new ServiceUnavailableException(`Dependencies unavailable: ${unavailable.join(', ')}`);
    }

    return this.response(dependencies);
  }

  private response(dependencies?: HealthResponseDto['dependencies']): HealthResponseDto {
    return {
      status: 'ok',
      service: 'baby-growth-gallery-api',
      version: this.config.version,
      timestamp: new Date().toISOString(),
      ...(dependencies ? { dependencies } : {}),
    };
  }
}
