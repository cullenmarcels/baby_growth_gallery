import { Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiExtraModels,
  getSchemaPath,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AccountSummaryDto } from '../auth/auth.dto.js';
import { parseBody } from '../auth/auth.schemas.js';
import { AuthSessionService } from '../auth/session.service.js';
import { ApiProblemDto } from '../health/health.dto.js';
import {
  ActiveFamilyActivityItemDto,
  ActivityActorDto,
  ActivitySubjectDto,
  FamilyActivityPageDto,
  FamilyCreatedSummaryDto,
  FamilyListResponseDto,
  FamilyMemberDto,
  FamilyMemberListResponseDto,
  FamilyMembershipSummaryDto,
  FamilySummaryDto,
  MemberJoinedSummaryDto,
  MemberLeftSummaryDto,
  MemberRoleChangedSummaryDto,
  PhotoUploadedActivitySummaryV1Dto,
  MilestoneRecordedActivitySummaryV1Dto,
  TombstonedFamilyActivityItemDto,
} from './family.dto.js';
import { activityQuerySchema, familyIdSchema } from './family.schemas.js';
import { FamilyService } from './family.service.js';

const extraModels = [
  ApiProblemDto,
  AccountSummaryDto,
  FamilyMembershipSummaryDto,
  FamilySummaryDto,
  FamilyMemberDto,
  FamilyCreatedSummaryDto,
  MemberJoinedSummaryDto,
  MemberRoleChangedSummaryDto,
  MemberLeftSummaryDto,
  PhotoUploadedActivitySummaryV1Dto,
  MilestoneRecordedActivitySummaryV1Dto,
  ActivityActorDto,
  ActivitySubjectDto,
  ActiveFamilyActivityItemDto,
  TombstonedFamilyActivityItemDto,
];

const problemContent = {
  'application/problem+json': {
    schema: { $ref: getSchemaPath(ApiProblemDto) },
  },
};

@ApiTags('families')
@ApiCookieAuth()
@ApiExtraModels(...extraModels)
@ApiResponse({ status: 400, content: problemContent })
@ApiResponse({ status: 401, content: problemContent })
@ApiResponse({ status: 403, content: problemContent })
@ApiResponse({ status: 404, content: problemContent })
@ApiResponse({ status: 409, content: problemContent })
@Controller('families')
export class FamilyController {
  constructor(
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @Get()
  @ApiResponse({ status: 200, type: FamilyListResponseDto })
  async list(@Req() request: Request): Promise<FamilyListResponseDto> {
    const account = await this.sessions.current(request);
    return { items: await this.families.listFamilies(account.id) };
  }

  @Post(':familyId/activate')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @HttpCode(200)
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async activate(
    @Param('familyId') rawFamilyId: string,
    @Req() request: Request,
  ): Promise<AccountSummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const account = await this.sessions.current(request);
    await this.families.getFamily(account.id, familyId);
    await this.sessions.setActiveFamily(request, familyId, account.id);
    return this.sessions.summaryForRequest(request, account);
  }

  @Get(':familyId')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: FamilySummaryDto })
  async detail(
    @Param('familyId') rawFamilyId: string,
    @Req() request: Request,
  ): Promise<FamilySummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const account = await this.sessions.current(request);
    return this.families.getFamily(account.id, familyId);
  }

  @Get(':familyId/members')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: FamilyMemberListResponseDto })
  async members(
    @Param('familyId') rawFamilyId: string,
    @Req() request: Request,
  ): Promise<FamilyMemberListResponseDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const account = await this.sessions.current(request);
    return { items: await this.families.listMembers(account.id, familyId) };
  }

  @Delete(':familyId/membership')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @HttpCode(200)
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async leave(
    @Param('familyId') rawFamilyId: string,
    @Req() request: Request,
  ): Promise<AccountSummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const account = await this.sessions.current(request);
    await this.families.leaveFamily(account.id, familyId);
    const fallback = await this.sessions.reconcileActiveFamily(request, account.id);
    await this.sessions.setActiveFamily(request, fallback, account.id);
    return this.sessions.summaryForRequest(request, account);
  }

  @Get(':familyId/activities')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 50 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOperation({ summary: 'List stable cursor-paginated family activity' })
  @ApiResponse({ status: 200, type: FamilyActivityPageDto })
  async activities(
    @Param('familyId') rawFamilyId: string,
    @Query() rawQuery: unknown,
    @Req() request: Request,
  ): Promise<FamilyActivityPageDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const query = parseBody(activityQuerySchema, rawQuery);
    const account = await this.sessions.current(request);
    return this.families.listActivities(account.id, familyId, query);
  }
}
