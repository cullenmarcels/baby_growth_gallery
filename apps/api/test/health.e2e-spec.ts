import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { APP_CONFIG, loadAppConfig } from '../src/config/app-config.js';
import {
  InfrastructureService,
  type DependencyStatus,
} from '../src/infrastructure/infrastructure.service.js';

describe('health API', () => {
  let app: INestApplication;
  let dependencies: DependencyStatus;

  beforeEach(async () => {
    dependencies = { postgres: 'up', redis: 'up', objectStorage: 'up' };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(
        loadAppConfig({
          NODE_ENV: 'test',
          WEB_ORIGIN: 'http://localhost:5173',
          SWAGGER_ENABLED: 'true',
        }),
      )
      .overrideProvider(InfrastructureService)
      .useValue({ checkAll: async () => dependencies })
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    app.useLogger(false);
    await app.init();
  });

  afterEach(async () => app.close());

  it('keeps live successful without consulting dependencies', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'baby-growth-gallery-api',
      version: '0.1.0',
    });
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
  });

  it('returns dependency details when ready', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(response.body.dependencies).toEqual(dependencies);
  });

  it.each(['postgres', 'redis', 'objectStorage'] as const)(
    'returns Problem Details when %s is down',
    async (dependency) => {
      dependencies = { postgres: 'up', redis: 'up', objectStorage: 'up', [dependency]: 'down' };
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .set('x-request-id', 'test-trace-id')
        .expect(503)
        .expect('content-type', /application\/problem\+json/);
      expect(response.body).toMatchObject({
        status: 503,
        traceId: 'test-trace-id',
        instance: '/api/v1/health/ready',
      });
      expect(response.body.detail).toContain(dependency);
    },
  );

  it('allows configured credentialed CORS requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('rejects an origin outside the allowlist', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set('Origin', 'https://untrusted.example')
      .expect(403)
      .expect('content-type', /application\/problem\+json/);
  });

  it('serves OpenAPI JSON and Swagger UI', async () => {
    await request(app.getHttpServer()).get('/api/openapi.json').expect(200);
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });
});
