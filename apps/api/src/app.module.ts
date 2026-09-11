import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { AuthRateLimitService } from './auth/rate-limit.service.js';
import { AuthSessionService } from './auth/session.service.js';
import { VerificationDeliveryService } from './auth/verification-delivery.service.js';
import { APP_CONFIG, loadAppConfig } from './config/app-config.js';
import { HealthController } from './health/health.controller.js';
import { FamilyActivityService } from './family/family-activity.service.js';
import { FamilyController, FamilyInvitationController } from './family/family.controller.js';
import { FamilyPolicyService } from './family/family-policy.service.js';
import { FamilyRateLimitService } from './family/family-rate-limit.service.js';
import { FamilyService } from './family/family.service.js';
import { InfrastructureService } from './infrastructure/infrastructure.service.js';
import { PrismaService } from './infrastructure/prisma.service.js';
import { RedisService } from './infrastructure/redis.service.js';

@Module({
  controllers: [HealthController, AuthController, FamilyController, FamilyInvitationController],
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadAppConfig() },
    PrismaService,
    RedisService,
    InfrastructureService,
    AuthService,
    AuthRateLimitService,
    AuthSessionService,
    VerificationDeliveryService,
    FamilyActivityService,
    FamilyPolicyService,
    FamilyRateLimitService,
    FamilyService,
  ],
})
export class AppModule {}
