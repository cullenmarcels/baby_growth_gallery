import { Module } from '@nestjs/common';
import { BabyController } from './baby/baby.controller.js';
import { BabyMaintenanceService } from './baby/baby-maintenance.service.js';
import { BabyPolicyService } from './baby/baby-policy.service.js';
import { BabyService } from './baby/baby.service.js';
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
import { ObjectStorageService } from './infrastructure/object-storage.service.js';
import { PhotoController } from './photo/photo.controller.js';
import { PhotoMaintenanceService } from './photo/photo-maintenance.service.js';
import { PhotoPolicyService } from './photo/photo-policy.service.js';
import { PhotoProcessingService } from './photo/photo-processing.service.js';
import { PhotoRateLimitService } from './photo/photo-rate-limit.service.js';
import { PhotoService } from './photo/photo.service.js';

@Module({
  controllers: [
    HealthController,
    AuthController,
    FamilyController,
    FamilyInvitationController,
    BabyController,
    PhotoController,
  ],
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadAppConfig() },
    PrismaService,
    RedisService,
    InfrastructureService,
    ObjectStorageService,
    AuthService,
    AuthRateLimitService,
    AuthSessionService,
    VerificationDeliveryService,
    FamilyActivityService,
    FamilyPolicyService,
    FamilyRateLimitService,
    FamilyService,
    BabyPolicyService,
    BabyService,
    BabyMaintenanceService,
    PhotoPolicyService,
    PhotoRateLimitService,
    PhotoService,
    PhotoProcessingService,
    PhotoMaintenanceService,
  ],
})
export class AppModule {}
