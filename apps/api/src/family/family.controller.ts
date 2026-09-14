import {
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
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
  ActiveFamilyActivityItemDto,
  ActiveInvitationDto,
  ActivityActorDto,
  ActivitySubjectDto,
  ChangeMemberRoleRequestDto,
  CreatedInvitationDto,
  CreateFamilyRequestDto,
  FamilyActivityPageDto,
  FamilyCreatedSummaryDto,
  FamilyListResponseDto,
  FamilyMemberDto,
  FamilyMemberListResponseDto,
  FamilyMembershipSummaryDto,
  FamilySummaryDto,
  InvitationCreatorDto,
  InvitationListResponseDto,
  MemberJoinedSummaryDto,
  MemberLeftSummaryDto,
  MemberRoleChangedSummaryDto,
  TombstonedFamilyActivityItemDto,
} from './family.dto.js';
import { FamilyRateLimitService } from './family-rate-limit.service.js';
import {
  acceptInvitationSchema,
  activityQuerySchema,
  changeMemberRoleSchema,
  createFamilySchema,
  familyIdSchema,
} from './family.schemas.js';
import { FamilyService } from './family.service.js';

const extraModels = [
  ApiProblemDto,
  AccountSummaryDto,
  FamilyMembershipSummaryDto,
  FamilySummaryDto,
  FamilyMemberDto,
  InvitationCreatorDto,
  ActiveInvitationDto,
  FamilyCreatedSummaryDto,
  MemberJoinedSummaryDto,
  MemberRoleChangedSummaryDto,
  MemberLeftSummaryDto,
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

  @Post()
  @ApiBody({ type: CreateFamilyRequestDto })
  @ApiResponse({ status: 201, type: FamilySummaryDto })
  async create(@Body() body: unknown, @Req() request: Request): Promise<FamilySummaryDto> {
    const account = await this.sessions.current(request);
    const input = parseBody(createFamilySchema, body);
    const family = await this.families.createFamily(account.id, input);
    await this.sessions.setActiveFamily(request, family.id);
    return family;
  }

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
    await this.sessions.setActiveFamily(request, familyId);
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

  @Patch(':familyId/members/:membershipId/role')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'membershipId', type: String, format: 'uuid' })
  @ApiBody({ type: ChangeMemberRoleRequestDto })
  @ApiResponse({ status: 200, type: FamilyMemberDto })
  async changeRole(
    @Param('familyId') rawFamilyId: string,
    @Param('membershipId') rawMembershipId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<FamilyMemberDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const membershipId = parseBody(familyIdSchema, rawMembershipId);
    const input = parseBody(changeMemberRoleSchema, body);
    const account = await this.sessions.current(request);
    return this.families.changeMemberRole(account.id, familyId, membershipId, input.role);
  }

  @Delete(':familyId/members/:membershipId')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'membershipId', type: String, format: 'uuid' })
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async removeMember(
    @Param('familyId') rawFamilyId: string,
    @Param('membershipId') rawMembershipId: string,
    @Req() request: Request,
  ): Promise<void> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const membershipId = parseBody(familyIdSchema, rawMembershipId);
    const account = await this.sessions.current(request);
    await this.families.removeMember(account.id, familyId, membershipId);
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
    await this.sessions.setActiveFamily(request, fallback);
    return this.sessions.summaryForRequest(request, account);
  }

  @Post(':familyId/invitations')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 201, type: CreatedInvitationDto })
  async createInvitation(
    @Param('familyId') rawFamilyId: string,
    @Req() request: Request,
  ): Promise<CreatedInvitationDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const account = await this.sessions.current(request);
    return this.families.createInvitation(account.id, familyId);
  }

  @Get(':familyId/invitations')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: InvitationListResponseDto })
  async invitations(
    @Param('familyId') rawFamilyId: string,
    @Req() request: Request,
  ): Promise<InvitationListResponseDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const account = await this.sessions.current(request);
    return { items: await this.families.listInvitations(account.id, familyId) };
  }

  @Delete(':familyId/invitations/:invitationId')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'invitationId', type: String, format: 'uuid' })
  @HttpCode(204)
  @ApiResponse({ status: 204 })
  async revokeInvitation(
    @Param('familyId') rawFamilyId: string,
    @Param('invitationId') rawInvitationId: string,
    @Req() request: Request,
  ): Promise<void> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const invitationId = parseBody(familyIdSchema, rawInvitationId);
    const account = await this.sessions.current(request);
    await this.families.revokeInvitation(account.id, familyId, invitationId);
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

@ApiTags('family-invitations')
@ApiCookieAuth()
@ApiExtraModels(...extraModels)
@ApiResponse({ status: 400, content: problemContent })
@ApiResponse({ status: 401, content: problemContent })
@ApiResponse({ status: 409, content: problemContent })
@ApiResponse({ status: 429, content: problemContent })
@ApiResponse({ status: 503, content: problemContent })
@Controller('family-invitations')
export class FamilyInvitationController {
  constructor(
    @Inject(FamilyService) private readonly families: FamilyService,
    @Inject(FamilyRateLimitService) private readonly rateLimits: FamilyRateLimitService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @Post('accept')
  @HttpCode(200)
  @ApiBody({ type: AcceptInvitationRequestDto })
  @ApiResponse({ status: 200, type: AcceptInvitationResponseDto })
  async accept(
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<AcceptInvitationResponseDto> {
    const account = await this.sessions.current(request);
    await this.rateLimits.consumeInvitationAttempt(account.id, request.ip ?? 'unknown');
    const input = parseBody(acceptInvitationSchema, body);
    const family = await this.families.acceptInvitation(account.id, input.token, input.displayName);
    await this.sessions.setActiveFamily(request, family.id);
    return { family, account: this.sessions.summaryForRequest(request, account) };
  }
}
