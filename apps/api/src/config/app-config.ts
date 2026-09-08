import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  APP_VERSION: z.string().min(1).default('0.1.0'),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      'postgresql://baby_gallery:baby_gallery_dev_password@localhost:5432/baby_growth_gallery',
    ),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(3).default('baby-growth-gallery-dev'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('baby_gallery_minio'),
  S3_SECRET_ACCESS_KEY: z.string().min(8).default('baby_gallery_minio_dev_password'),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  version: string;
  webOrigins: string[];
  swaggerEnabled: boolean;
  databaseUrl: string;
  redisUrl: string;
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadAppConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new Error(`Invalid application configuration: ${z.prettifyError(parsed.error)}`);
  }

  const values = parsed.data;
  const webOrigins = values.WEB_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (values.NODE_ENV === 'production' && webOrigins.includes('*')) {
    throw new Error('Invalid application configuration: WEB_ORIGIN cannot contain * in production');
  }

  return {
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    version: values.APP_VERSION,
    webOrigins,
    swaggerEnabled: values.SWAGGER_ENABLED,
    databaseUrl: values.DATABASE_URL,
    redisUrl: values.REDIS_URL,
    s3: {
      endpoint: values.S3_ENDPOINT,
      region: values.S3_REGION,
      bucket: values.S3_BUCKET,
      accessKeyId: values.S3_ACCESS_KEY_ID,
      secretAccessKey: values.S3_SECRET_ACCESS_KEY,
      forcePathStyle: values.S3_FORCE_PATH_STYLE,
    },
  };
}
