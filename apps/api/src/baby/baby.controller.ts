import {
  Body,
  Controller,
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
import { AccountSummaryDto } from '../auth/auth.dto.js';
import { parseBody } from '../auth/auth.schemas.js';
import { AuthSessionService } from '../auth/session.service.js';
import { familyIdSchema } from '../family/family.schemas.js';
import {
  BabyListResponseDto,
  BabySummaryDto,
  CreateBabyRequestDto,
  SetBabyAvatarRequestDto,
  UpdateBabyRequestDto,
} from './baby.dto.js';
import { BabyService } from './baby.service.js';
import {
  babyListQuerySchema,
  createBabySchema,
  setBabyAvatarSchema,
  updateBabySchema,
} from './baby.schemas.js';

@ApiTags('babies')
@ApiCookieAuth()
@Controller('families/:familyId/babies')
export class BabyController {
  constructor(
    @Inject(BabyService) private readonly babies: BabyService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @Post()
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiBody({ type: CreateBabyRequestDto })
  @ApiResponse({ status: 201, type: BabySummaryDto })
  async create(
    @Param('familyId') rawFamilyId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<BabySummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const account = await this.sessions.current(request);
    const baby = await this.babies.create(account.id, familyId, parseBody(createBabySchema, body));
    if (request.session.activeFamilyId !== familyId) {
      await this.sessions.setActiveFamily(request, familyId, account.id);
    }
    await this.sessions.setActiveBaby(request, baby.id);
    return baby;
  }

  @Get()
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: BabyListResponseDto })
  async list(
    @Param('familyId') rawFamilyId: string,
    @Query() rawQuery: unknown,
    @Req() request: Request,
  ): Promise<BabyListResponseDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const query = parseBody(babyListQuerySchema, rawQuery);
    const account = await this.sessions.current(request);
    return { items: await this.babies.list(account.id, familyId, query.includeArchived) };
  }

  @Get(':babyId')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'babyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: BabySummaryDto })
  async detail(
    @Param('familyId') rawFamilyId: string,
    @Param('babyId') rawBabyId: string,
    @Req() request: Request,
  ): Promise<BabySummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const babyId = parseBody(familyIdSchema, rawBabyId);
    const account = await this.sessions.current(request);
    return this.babies.get(account.id, familyId, babyId);
  }

  @Patch(':babyId')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'babyId', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateBabyRequestDto })
  @ApiResponse({ status: 200, type: BabySummaryDto })
  async update(
    @Param('familyId') rawFamilyId: string,
    @Param('babyId') rawBabyId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<BabySummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const babyId = parseBody(familyIdSchema, rawBabyId);
    const account = await this.sessions.current(request);
    return this.babies.update(account.id, familyId, babyId, parseBody(updateBabySchema, body));
  }

  @Patch(':babyId/avatar')
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'babyId', type: String, format: 'uuid' })
  @ApiBody({ type: SetBabyAvatarRequestDto })
  @ApiResponse({ status: 200, type: BabySummaryDto })
  async setAvatar(
    @Param('familyId') rawFamilyId: string,
    @Param('babyId') rawBabyId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ): Promise<BabySummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const babyId = parseBody(familyIdSchema, rawBabyId);
    const account = await this.sessions.current(request);
    return this.babies.setAvatar(
      account.id,
      familyId,
      babyId,
      parseBody(setBabyAvatarSchema, body).photoId,
    );
  }

  @Post(':babyId/activate')
  @HttpCode(200)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'babyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async activate(
    @Param('familyId') rawFamilyId: string,
    @Param('babyId') rawBabyId: string,
    @Req() request: Request,
  ): Promise<AccountSummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const babyId = parseBody(familyIdSchema, rawBabyId);
    const account = await this.sessions.current(request);
    await this.babies.get(account.id, familyId, babyId);
    if (request.session.activeFamilyId !== familyId) {
      await this.sessions.setActiveFamily(request, familyId, account.id);
    }
    await this.sessions.setActiveBaby(request, babyId);
    return this.sessions.summaryForRequest(request, account);
  }

  @Post(':babyId/archive')
  @HttpCode(200)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'babyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: AccountSummaryDto })
  async archive(
    @Param('familyId') rawFamilyId: string,
    @Param('babyId') rawBabyId: string,
    @Req() request: Request,
  ): Promise<AccountSummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const babyId = parseBody(familyIdSchema, rawBabyId);
    const account = await this.sessions.current(request);
    await this.babies.archive(account.id, familyId, babyId);
    await this.sessions.reconcileActiveBaby(request, account.id);
    await this.sessions.saveSession(request);
    return this.sessions.summaryForRequest(request, account);
  }

  @Post(':babyId/restore')
  @HttpCode(200)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'babyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: BabySummaryDto })
  async restore(
    @Param('familyId') rawFamilyId: string,
    @Param('babyId') rawBabyId: string,
    @Req() request: Request,
  ): Promise<BabySummaryDto> {
    const familyId = parseBody(familyIdSchema, rawFamilyId);
    const babyId = parseBody(familyIdSchema, rawBabyId);
    const account = await this.sessions.current(request);
    const baby = await this.babies.restore(account.id, familyId, babyId);
    if (request.session.activeFamilyId !== familyId) {
      await this.sessions.setActiveFamily(request, familyId, account.id);
    }
    await this.sessions.setActiveBaby(request, baby.id);
    return baby;
  }
}
