import { Module } from '@nestjs/common';
import { APP_CONFIG, loadAppConfig } from './config/app-config.js';
import { HealthController } from './health/health.controller.js';
import { InfrastructureService } from './infrastructure/infrastructure.service.js';
import { PrismaService } from './infrastructure/prisma.service.js';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadAppConfig() },
    PrismaService,
    InfrastructureService,
  ],
})
export class AppModule {}
