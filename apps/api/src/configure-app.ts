import { ForbiddenException, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { RedisStore } from 'connect-redis';
import type { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { ApiProblemException } from './common/api-problem.exception.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { StructuredLogger } from './common/structured-logger.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';
import { csrf } from './auth/csrf.js';
import { RedisService } from './infrastructure/redis.service.js';

export function configureApp(app: INestApplication): OpenAPIObject {
  const config = app.get<AppConfig>(APP_CONFIG);
  const redis = app.get(RedisService);
  if (config.auth.trustProxy > 0) {
    const httpServer = app.getHttpAdapter().getInstance() as {
      set(setting: string, value: number): void;
    };
    httpServer.set('trust proxy', config.auth.trustProxy);
  }
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
  app.use(
    session({
      name: config.auth.cookieName,
      secret: config.auth.sessionSecret,
      store: new RedisStore({
        client: redis.client,
        prefix: `${redis.prefix}:session:`,
        ttl(sessionData) {
          const expiresAt = sessionData.cookie.expires?.getTime();
          return expiresAt ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 1_000)) : 86_400;
        },
      }),
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.auth.cookieSecure,
        path: '/',
      },
    }),
  );
  app.use((request: Request, _response: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      next();
      return;
    }
    const origin = request.header('origin');
    if (!origin || !config.webOrigins.includes(origin)) {
      next(new ApiProblemException(403, 'Request verification failed.', 'ORIGIN_INVALID'));
      return;
    }
    next();
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    csrf.csrfSynchronisedProtection(request, response, (error?: unknown) => {
      if (error) {
        next(new ApiProblemException(403, 'Request verification failed.', 'CSRF_INVALID'));
        return;
      }
      next();
    });
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
