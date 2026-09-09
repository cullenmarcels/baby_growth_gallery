import { ForbiddenException, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { StructuredLogger } from './common/structured-logger.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';

export function configureApp(app: INestApplication): OpenAPIObject {
  const config = app.get<AppConfig>(APP_CONFIG);
  app.useLogger(new StructuredLogger());
  app.use((request: Request & { id?: string }, response: Response, next: NextFunction) => {
    const supplied = request.header('x-request-id');
    const requestId = supplied && supplied.length <= 128 ? supplied : randomUUID();
    request.id = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  });
  app.use(helmet());
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || config.webOrigins.includes(origin)) callback(null, true);
      else callback(new ForbiddenException('Origin is not allowed by CORS'));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Baby Growth Gallery API')
    .setDescription('Public API contract for Baby Growth Gallery')
    .setVersion(config.version)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document, {
    ui: config.swaggerEnabled,
    raw: ['json'],
    jsonDocumentUrl: 'api/openapi.json',
    customSiteTitle: 'Baby Growth Gallery API Docs',
  });

  return document;
}
