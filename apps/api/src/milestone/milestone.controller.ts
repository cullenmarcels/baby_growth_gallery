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
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { parseBody } from '../auth/auth.schemas.js';
import { AuthSessionService } from '../auth/session.service.js';
import { familyIdSchema } from '../family/family.schemas.js';
import {
  CompleteMilestoneRequestDto,
  CreateCustomMilestoneRequestDto,
  CreateTemplateMilestoneRequestDto,
  MilestoneDetailDto,
  MilestoneOverviewDto,
  MilestonePageDto,
  MilestoneTemplateListDto,
  ReopenMilestoneRequestDto,
  UpdateMilestoneRequestDto,
} from './milestone.dto.js';
import {
  completeMilestoneSchema,
  createMilestoneSchema,
  deleteMilestoneQuerySchema,
  milestoneIdSchema,
  milestoneListQuerySchema,
  milestoneOverviewQuerySchema,
  reopenMilestoneSchema,
  updateMilestoneSchema,
} from './milestone.schemas.js';
import { MilestoneService } from './milestone.service.js';

const FamilyBabyParams = () =>
  applyDecorators(
    ApiParam({ name: 'familyId', type: String, format: 'uuid' }),
    ApiParam({ name: 'babyId', type: String, format: 'uuid' }),
  );
const MilestoneParams = () =>
  applyDecorators(
    FamilyBabyParams(),
    ApiParam({ name: 'milestoneId', type: String, format: 'uuid' }),
  );

@ApiTags('milestones')
@ApiCookieAuth()
@ApiExtraModels(CreateTemplateMilestoneRequestDto, CreateCustomMilestoneRequestDto)
@Controller('families/:familyId/babies/:babyId')
export class MilestoneController {
  constructor(
    @Inject(MilestoneService) private readonly milestones: MilestoneService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @Get('milestone-templates')
  @FamilyBabyParams()
  @ApiResponse({ status: 200, type: MilestoneTemplateListDto })
  templates(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.templates(accountId, this.uuid(family), this.uuid(baby)),
    );
  }

  @Get('milestones')
  @FamilyBabyParams()
  @ApiQuery({ name: 'state', enum: ['PENDING', 'COMPLETED'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, type: MilestonePageDto })
  list(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Query() query: unknown,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.list(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneListQuerySchema, query),
      ),
    );
  }

  @Get('milestones/overview')
  @FamilyBabyParams()
  @ApiQuery({ name: 'fromOn', type: String, format: 'date' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, type: MilestoneOverviewDto })
  overview(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Query() query: unknown,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.overview(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneOverviewQuerySchema, query),
      ),
    );
  }

  @Get('milestones/:milestoneId')
  @MilestoneParams()
  @ApiResponse({ status: 200, type: MilestoneDetailDto })
  detail(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('milestoneId') milestone: string,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.detail(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneIdSchema, milestone),
      ),
    );
  }

  @Post('milestones')
  @FamilyBabyParams()
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/CreateTemplateMilestoneRequestDto' },
        { $ref: '#/components/schemas/CreateCustomMilestoneRequestDto' },
      ],
    },
  })
  @ApiResponse({ status: 201, type: MilestoneDetailDto })
  create(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.create(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(createMilestoneSchema, body),
      ),
    );
  }

  @Patch('milestones/:milestoneId')
  @MilestoneParams()
  @ApiBody({ type: UpdateMilestoneRequestDto })
  @ApiResponse({ status: 200, type: MilestoneDetailDto })
  update(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('milestoneId') milestone: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.update(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneIdSchema, milestone),
        parseBody(updateMilestoneSchema, body),
      ),
    );
  }

  @Post('milestones/:milestoneId/complete')
  @MilestoneParams()
  @HttpCode(200)
  @ApiBody({ type: CompleteMilestoneRequestDto })
  @ApiResponse({ status: 200, type: MilestoneDetailDto })
  complete(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('milestoneId') milestone: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.complete(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneIdSchema, milestone),
        parseBody(completeMilestoneSchema, body),
      ),
    );
  }

  @Patch('milestones/:milestoneId/completion')
  @MilestoneParams()
  @ApiBody({ type: CompleteMilestoneRequestDto })
  @ApiResponse({ status: 200, type: MilestoneDetailDto })
  updateCompletion(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('milestoneId') milestone: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return this.withAccount(request, (accountId) =>
      this.milestones.updateCompletion(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneIdSchema, milestone),
        parseBody(completeMilestoneSchema, body),
      ),
    );
  }

  @Post('milestones/:milestoneId/reopen')
  @MilestoneParams()
  @HttpCode(200)
  @ApiBody({ type: ReopenMilestoneRequestDto })
  @ApiResponse({ status: 200, type: MilestoneDetailDto })
  reopen(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('milestoneId') milestone: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const parsed = parseBody(reopenMilestoneSchema, body);
    return this.withAccount(request, (accountId) =>
      this.milestones.reopen(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneIdSchema, milestone),
        parsed.expectedVersion,
      ),
    );
  }

  @Delete('milestones/:milestoneId')
  @MilestoneParams()
  @HttpCode(204)
  @ApiQuery({ name: 'expectedVersion', type: Number })
  async remove(
    @Param('familyId') family: string,
    @Param('babyId') baby: string,
    @Param('milestoneId') milestone: string,
    @Query() query: unknown,
    @Req() request: Request,
  ): Promise<void> {
    const parsed = parseBody(deleteMilestoneQuerySchema, query);
    await this.withAccount(request, (accountId) =>
      this.milestones.remove(
        accountId,
        this.uuid(family),
        this.uuid(baby),
        parseBody(milestoneIdSchema, milestone),
        parsed.expectedVersion,
      ),
    );
  }

  private uuid(value: string): string {
    return parseBody(familyIdSchema, value);
  }
  private async withAccount<T>(
    request: Request,
    run: (accountId: string) => Promise<T>,
  ): Promise<T> {
    const account = await this.sessions.current(request);
    return run(account.id);
  }
}
