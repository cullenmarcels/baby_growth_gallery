import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PasswordLoginRequestDto } from '../auth/auth.dto.js';

export class ManagedUsernameDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 32, example: '小福-bao' })
  username!: PasswordLoginRequestDto['username'];
}

export class ManagedAccountInputDto extends ManagedUsernameDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 30 }) displayName!: string;
}

export class AddMemberDto extends ManagedAccountInputDto {
  @ApiPropertyOptional({ type: String, enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' }) role?:
    'ADMIN' | 'MEMBER';
}

export class ManagedFamilyInputDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 40 }) name!: string;
}

export class AccountStatusInputDto {
  @ApiProperty({ type: String, enum: ['ACTIVE', 'DISABLED'] }) status!: 'ACTIVE' | 'DISABLED';
}

export class MemberRoleInputDto {
  @ApiProperty({ type: String, enum: ['ADMIN', 'MEMBER'] }) role!: 'ADMIN' | 'MEMBER';
}

export class IssuedPasswordDto extends ManagedUsernameDto {
  @ApiProperty({ type: String }) temporaryPassword!: string;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: string;
}

export class ManagedAccountDto extends ManagedUsernameDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty({ type: String, enum: ['ACTIVE', 'DISABLED'] }) status!: 'ACTIVE' | 'DISABLED';
}

export class ManagedAccountFamilyDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String, enum: ['ADMIN', 'MEMBER'] }) role!: 'ADMIN' | 'MEMBER';
}

export class ManagedAccountDetailDto extends ManagedAccountDto {
  @ApiProperty({ type: () => [ManagedAccountFamilyDto] }) families!: ManagedAccountFamilyDto[];
}

export class ManagedFamilyDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: Boolean }) isOpen!: boolean;
}

export class ManagedFamilyListItemDto extends ManagedFamilyDto {
  @ApiProperty({ type: 'integer', minimum: 0 }) memberCount!: number;
}

export class ManagedMemberDto extends ManagedUsernameDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) displayName!: string;
  @ApiProperty({ type: String, enum: ['ADMIN', 'MEMBER'] }) role!: 'ADMIN' | 'MEMBER';
  @ApiProperty({ type: String, enum: ['ACTIVE', 'DISABLED'] }) accountStatus!:
    'ACTIVE' | 'DISABLED';
  @ApiProperty({ type: Boolean }) canResetPassword!: boolean;
}

export class ManagedFamilyDetailDto extends ManagedFamilyDto {
  @ApiProperty({ type: () => [ManagedMemberDto] }) members!: ManagedMemberDto[];
}
