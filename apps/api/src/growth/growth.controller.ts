import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { parseBody } from '../auth/auth.schemas.js';
import { AuthSessionService } from '../auth/session.service.js';
import { familyIdSchema } from '../family/family.schemas.js';
import {
  RestoreGrowthRequestDto,
  CreateGrowthRequestDto,
  GrowthOverviewDto,
  GrowthPageDto,
  GrowthRecordDto,
  GrowthSeriesDto,
  GrowthVersionRequestDto,
  UpdateGrowthRequestDto,
} from './growth.dto.js';
import {
  growthRestoreSchema,
  growthInputSchema,
  growthListSchema,
  growthSeriesSchema,
  growthUpdateSchema,
  growthVersionSchema,
  growthMetrics,
} from './growth.schemas.js';
import { GrowthService } from './growth.service.js';
const Scope = () =>
  applyDecorators(
    ApiParam({ name: 'familyId', type: String, format: 'uuid' }),
    ApiParam({ name: 'babyId', type: String, format: 'uuid' }),
  );
const RecordScope = () =>
  applyDecorators(Scope(), ApiParam({ name: 'recordId', type: String, format: 'uuid' }));
@ApiTags('growth')
@ApiCookieAuth()
@Controller('families/:familyId/babies/:babyId/growth-records')
export class GrowthController {
  constructor(
    @Inject(GrowthService) private readonly growth: GrowthService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}
  @Get('')
  @Scope()
  @ApiResponse({ status: 200, type: GrowthPageDto })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  @ApiQuery({ name: 'state', enum: ['ACTIVE', 'TRASHED'], required: false })
  list(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Req() request: Request,
    @Query() query: unknown,
  ) {
    return this.withAccount(request, (account) =>
      this.growth.list(
        account,
        this.uuid(family),
        this.uuid(baby),
        parseBody(growthListSchema, query),
      ),
    );
  }
  @Get('overview')
  @Scope()
  @ApiResponse({ status: 200, type: GrowthOverviewDto })
  overview(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (account) =>
      this.growth.overview(account, this.uuid(family), this.uuid(baby)),
    );
  }
  @Get('series')
  @Scope()
  @ApiResponse({ status: 200, type: GrowthSeriesDto })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  @ApiQuery({ name: 'metric', enum: growthMetrics })
  @ApiQuery({ name: 'fromOn', type: String, format: 'date', required: false })
  @ApiQuery({ name: 'toOn', type: String, format: 'date', required: false })
  series(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Req() request: Request,
    @Query() query: unknown,
  ) {
    return this.withAccount(request, (account) =>
      this.growth.series(
        account,
        this.uuid(family),
        this.uuid(baby),
        parseBody(growthSeriesSchema, query),
      ),
    );
  }
  @Get(':recordId')
  @RecordScope()
  @ApiResponse({ status: 200, type: GrowthRecordDto })
  detail(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('recordId') record: string,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (account) =>
      this.growth.detail(account, this.uuid(family), this.uuid(baby), this.uuid(record)),
    );
  }
  @Post('')
  @Scope()
  @HttpCode(201)
  @ApiBody({ type: CreateGrowthRequestDto })
  @ApiResponse({ status: 201, type: GrowthRecordDto })
  create(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const input = parseBody(growthInputSchema, body);
    return this.withAccount(request, (account) =>
      this.growth.create(account, this.uuid(family), this.uuid(baby), input),
    );
  }
  @Patch(':recordId')
  @RecordScope()
  @HttpCode(200)
  @ApiBody({ type: UpdateGrowthRequestDto })
  @ApiResponse({ status: 200, type: GrowthRecordDto })
  update(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('recordId') record: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const input = parseBody(growthUpdateSchema, body);
    return this.withAccount(request, (account) =>
      this.growth.update(account, this.uuid(family), this.uuid(baby), this.uuid(record), input),
    );
  }
  @Post(':recordId/trash')
  @RecordScope()
  @HttpCode(200)
  @ApiBody({ type: GrowthVersionRequestDto })
  @ApiResponse({ status: 200, type: GrowthRecordDto })
  trash(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('recordId') record: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const input = parseBody(growthVersionSchema, body);
    return this.withAccount(request, (account) =>
      this.growth.transition(
        account,
        this.uuid(family),
        this.uuid(baby),
        this.uuid(record),
        input.expectedVersion,
        'trash',
      ),
    );
  }
  @Post(':recordId/restore')
  @RecordScope()
  @HttpCode(200)
  @ApiBody({ type: RestoreGrowthRequestDto })
  @ApiResponse({ status: 200, type: GrowthRecordDto })
  restore(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('recordId') record: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const input = parseBody(growthRestoreSchema, body);
    return this.withAccount(request, (account) =>
      this.growth.transition(
        account,
        this.uuid(family),
        this.uuid(baby),
        this.uuid(record),
        input.expectedVersion,
        'restore',
        input.measuredOn,
      ),
    );
  }
  @Delete(':recordId')
  @RecordScope()
  @HttpCode(204)
  @ApiQuery({ name: 'expectedVersion', type: Number })
  @ApiResponse({ status: 204 })
  async purge(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('recordId') record: string,
    @Query() query: unknown,
    @Req() request: Request,
  ): Promise<void> {
    const input = parseBody(growthVersionSchema, query);
    await this.withAccount(request, (account) =>
      this.growth.transition(
        account,
        this.uuid(family),
        this.uuid(baby),
        this.uuid(record),
        input.expectedVersion,
        'purge',
      ),
    );
  }
  private uuid(value: string): string {
    return parseBody(familyIdSchema, value);
  }
  private async withAccount<T>(request: Request, run: (account: string) => Promise<T>): Promise<T> {
    const account = await this.sessions.current(request);
    return run(account.id);
  }
}
