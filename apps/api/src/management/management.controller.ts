import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExtraModels,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';
import { parseBody, usernameSchema } from '../auth/auth.schemas.js';
import { AuthSessionService } from '../auth/session.service.js';
import { ApiProblemDto } from '../health/health.dto.js';
import {
  AccountStatusInputDto,
  AddMemberDto,
  IssuedPasswordDto,
  ManagedAccountDetailDto,
  ManagedAccountDto,
  ManagedAccountInputDto,
  ManagedFamilyDetailDto,
  ManagedFamilyDto,
  ManagedFamilyInputDto,
  ManagedFamilyListItemDto,
  MemberRoleInputDto,
} from './management.dto.js';
import { ManagementService } from './management.service.js';

const id = z.uuid();
const role = z.enum(['ADMIN', 'MEMBER']);
const roleInput = z.strictObject({ role });
const statusInput = z.strictObject({ status: z.enum(['ACTIVE', 'DISABLED']) });
const familyInput = z.strictObject({ name: z.string().trim().min(1).max(40) });
const accountInput = z.strictObject({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(30),
});
const addInput = accountInput.extend({ role: role.default('MEMBER') });
const problemContent = {
  'application/problem+json': { schema: { $ref: getSchemaPath(ApiProblemDto) } },
};

@ApiTags('management')
@ApiCookieAuth()
@ApiExtraModels(ApiProblemDto)
@ApiResponse({ status: 400, content: problemContent })
@ApiResponse({ status: 401, content: problemContent })
@ApiResponse({ status: 403, content: problemContent })
@ApiResponse({ status: 404, content: problemContent })
@ApiResponse({ status: 409, content: problemContent })
@Controller('management')
export class ManagementController {
  constructor(
    @Inject(ManagementService) private readonly management: ManagementService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService,
  ) {}

  @Get('accounts')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: [ManagedAccountDto] })
  async listAccounts(@Req() request: Request) {
    const actor = await this.sessions.current(request);
    return this.management.listAccounts(actor);
  }

  @Get('accounts/:accountId')
  @HttpCode(200)
  @ApiParam({ name: 'accountId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: ManagedAccountDetailDto })
  async getAccount(@Req() request: Request, @Param('accountId') rawAccountId: string) {
    const actor = await this.sessions.current(request);
    return this.management.accountDetail(actor, parseBody(id, rawAccountId));
  }

  @Post('accounts')
  @HttpCode(201)
  @ApiBody({ type: ManagedAccountInputDto })
  @ApiResponse({ status: 201, type: IssuedPasswordDto })
  @Header('Cache-Control', 'no-store')
  async createAccount(@Req() request: Request, @Body() body: unknown) {
    const actor = await this.sessions.current(request);
    const input = parseBody(accountInput, body);
    return this.management.createAccount(actor, input);
  }

  @Patch('accounts/:accountId/status')
  @HttpCode(200)
  @ApiParam({ name: 'accountId', type: String, format: 'uuid' })
  @ApiBody({ type: AccountStatusInputDto })
  @ApiResponse({ status: 200, type: ManagedAccountDto })
  async setStatus(
    @Req() request: Request,
    @Param('accountId') rawAccountId: string,
    @Body() body: unknown,
  ) {
    const actor = await this.sessions.current(request);
    const accountId = parseBody(id, rawAccountId);
    const input = parseBody(statusInput, body);
    return this.management.setStatus(actor, accountId, input.status);
  }

  @Post('accounts/:accountId/password')
  @HttpCode(200)
  @ApiParam({ name: 'accountId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: IssuedPasswordDto })
  @Header('Cache-Control', 'no-store')
  async resetAccount(@Req() request: Request, @Param('accountId') rawAccountId: string) {
    const actor = await this.sessions.current(request);
    const accountId = parseBody(id, rawAccountId);
    return this.management.resetAccount(actor, accountId);
  }

  @Get('families')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: [ManagedFamilyListItemDto] })
  async listFamilies(@Req() request: Request) {
    const actor = await this.sessions.current(request);
    return this.management.listFamilies(actor);
  }

  @Post('families')
  @HttpCode(201)
  @ApiBody({ type: ManagedFamilyInputDto })
  @ApiResponse({ status: 201, type: ManagedFamilyDto })
  async createFamily(@Req() request: Request, @Body() body: unknown) {
    const actor = await this.sessions.current(request);
    const input = parseBody(familyInput, body);
    return this.management.createFamily(actor, input.name);
  }

  @Get('families/:familyId')
  @HttpCode(200)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: ManagedFamilyDetailDto })
  async familyDetail(@Req() request: Request, @Param('familyId') rawFamilyId: string) {
    const actor = await this.sessions.current(request);
    const familyId = parseBody(id, rawFamilyId);
    return this.management.familyDetail(actor, familyId);
  }

  @Post('families/:familyId/accounts')
  @HttpCode(201)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiBody({ type: ManagedAccountInputDto })
  @ApiResponse({ status: 201, type: IssuedPasswordDto })
  @Header('Cache-Control', 'no-store')
  async createFamilyAccount(
    @Req() request: Request,
    @Param('familyId') rawFamilyId: string,
    @Body() body: unknown,
  ) {
    const actor = await this.sessions.current(request);
    const familyId = parseBody(id, rawFamilyId);
    const input = parseBody(accountInput, body);
    return this.management.createAccount(actor, input, familyId);
  }

  @Post('families/:familyId/members')
  @HttpCode(204)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiBody({ type: AddMemberDto })
  @ApiResponse({ status: 204 })
  async addMember(
    @Req() request: Request,
    @Param('familyId') rawFamilyId: string,
    @Body() body: unknown,
  ) {
    const actor = await this.sessions.current(request);
    const familyId = parseBody(id, rawFamilyId);
    const input = parseBody(addInput, body);
    await this.management.addMember(actor, familyId, input);
  }

  @Patch('families/:familyId/members/:membershipId')
  @HttpCode(204)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'membershipId', type: String, format: 'uuid' })
  @ApiBody({ type: MemberRoleInputDto })
  @ApiResponse({ status: 204 })
  async setRole(
    @Req() request: Request,
    @Param('familyId') rawFamilyId: string,
    @Param('membershipId') rawMembershipId: string,
    @Body() body: unknown,
  ) {
    const actor = await this.sessions.current(request);
    const familyId = parseBody(id, rawFamilyId);
    const membershipId = parseBody(id, rawMembershipId);
    const input = parseBody(roleInput, body);
    await this.management.setRole(actor, familyId, membershipId, input.role);
  }

  @Delete('families/:familyId/members/:membershipId')
  @HttpCode(204)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'membershipId', type: String, format: 'uuid' })
  @ApiResponse({ status: 204 })
  async removeMember(
    @Req() request: Request,
    @Param('familyId') rawFamilyId: string,
    @Param('membershipId') rawMembershipId: string,
  ) {
    const actor = await this.sessions.current(request);
    const familyId = parseBody(id, rawFamilyId);
    const membershipId = parseBody(id, rawMembershipId);
    await this.management.removeMember(actor, familyId, membershipId);
  }

  @Post('families/:familyId/members/:membershipId/password')
  @HttpCode(200)
  @ApiParam({ name: 'familyId', type: String, format: 'uuid' })
  @ApiParam({ name: 'membershipId', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: IssuedPasswordDto })
  @Header('Cache-Control', 'no-store')
  async resetMember(
    @Req() request: Request,
    @Param('familyId') rawFamilyId: string,
    @Param('membershipId') rawMembershipId: string,
  ) {
    const actor = await this.sessions.current(request);
    const familyId = parseBody(id, rawFamilyId);
    const membershipId = parseBody(id, rawMembershipId);
    return this.management.resetMember(actor, familyId, membershipId);
  }
}
