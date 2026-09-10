import { ApiProperty } from '@nestjs/swagger';

export class CsrfTokenResponseDto {
  @ApiProperty({ type: String }) csrfToken!: string;
}

export class VerificationChallengeRequestDto {
  @ApiProperty({ type: String, example: '13800138000' }) phone!: string;
  @ApiProperty({ type: String, enum: ['REGISTER', 'LOGIN', 'RESET_PASSWORD'] })
  purpose!: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD';
}

export class VerificationChallengeResponseDto {
  @ApiProperty({ type: String, format: 'uuid' }) challengeId!: string;
  @ApiProperty({ type: Number, example: 300 }) expiresInSeconds!: number;
  @ApiProperty({ type: Number, example: 60 }) resendAfterSeconds!: number;
}

export class RegisterRequestDto {
  @ApiProperty({ type: String, example: '13800138000' }) phone!: string;
  @ApiProperty({ type: String, format: 'uuid' }) challengeId!: string;
  @ApiProperty({ type: String, example: '123456' }) code!: string;
  @ApiProperty({ type: String, minLength: 12, maxLength: 128 }) password!: string;
  @ApiProperty({ type: String, example: 'draft-2026-09-10' }) termsVersion!: string;
  @ApiProperty({ type: String, example: 'draft-2026-09-10' }) privacyVersion!: string;
}

export class PasswordLoginRequestDto {
  @ApiProperty({ type: String, example: '13800138000' }) phone!: string;
  @ApiProperty({ type: String, minLength: 12, maxLength: 128 }) password!: string;
  @ApiProperty({ type: Boolean, default: false }) remember!: boolean;
}

export class CodeLoginRequestDto {
  @ApiProperty({ type: String, example: '13800138000' }) phone!: string;
  @ApiProperty({ type: String, format: 'uuid' }) challengeId!: string;
  @ApiProperty({ type: String, example: '123456' }) code!: string;
  @ApiProperty({ type: Boolean, default: false }) remember!: boolean;
}

export class PasswordResetRequestDto {
  @ApiProperty({ type: String, example: '13800138000' }) phone!: string;
  @ApiProperty({ type: String, format: 'uuid' }) challengeId!: string;
  @ApiProperty({ type: String, example: '123456' }) code!: string;
  @ApiProperty({ type: String, minLength: 12, maxLength: 128 }) newPassword!: string;
}

export class AccountSummaryDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String }) displayName!: string | null;
  @ApiProperty({ type: String, example: '+86 138****8000' }) phoneMasked!: string;
  @ApiProperty({ nullable: true, type: String }) activeFamilyId!: null;
}
