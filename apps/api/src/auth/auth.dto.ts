import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CsrfTokenResponseDto {
  @ApiProperty({ type: String }) csrfToken!: string;
}

export class PasswordLoginRequestDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 32, example: '小福-bao' })
  username!: string;
  @ApiProperty({ type: String, minLength: 6, maxLength: 128 }) password!: string;
  @ApiPropertyOptional({ type: Boolean, default: false }) remember?: boolean;
}

export class PasswordChangeRequestDto {
  @ApiProperty({ type: String, minLength: 6, maxLength: 128 }) currentPassword!: string;
  @ApiProperty({ type: String, minLength: 6, maxLength: 128 }) newPassword!: string;
  @ApiPropertyOptional({ type: Boolean, default: false }) acceptTerms?: boolean;
}

export class AccountSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String }) displayName!: string | null;
  @ApiProperty({ type: String }) username!: string;
  @ApiProperty({ type: String, enum: ['USER', 'SUPER_ADMIN'] }) siteRole!: 'USER' | 'SUPER_ADMIN';
  @ApiProperty({ type: Boolean }) mustChangePassword!: boolean;
  @ApiProperty({ type: Boolean }) mustAcceptTerms!: boolean;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) activeFamilyId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'uuid' }) activeBabyId!: string | null;
}
