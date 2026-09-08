import 'dotenv/config';
import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortObject(item)]),
    );
  }
  return value;
}

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error'], abortOnError: false });
  const document = configureApp(app);
  await app.init();
  const output = resolve(process.cwd(), '../../packages/api-client/openapi.json');
  await writeFile(output, `${JSON.stringify(sortObject(document), null, 2)}\n`, 'utf8');
  await app.close();
}

exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
