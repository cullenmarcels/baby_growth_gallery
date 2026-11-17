import assert from 'node:assert/strict';
import { hashPassword } from '../../src/auth/password.js';
import { LEGAL_DRAFT_VERSION } from '../../src/auth/auth.schemas.js';
import type { AppConfig } from '../../src/config/app-config.js';
import { PrismaService } from '../../src/infrastructure/prisma.service.js';

const databaseUrl = process.env.E2E_DATABASE_URL;
assert(databaseUrl, 'Set E2E_DATABASE_URL to an isolated bgg_e2e_* database.');
const target = new URL(databaseUrl);
assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
assert.match(target.pathname, /^\/bgg_e2e_[a-z0-9_]+$/);
const password = process.env.BGG_E2E_ADMIN_PASSWORD;
assert(password);

const database = new PrismaService({ databaseUrl } as AppConfig);
try {
  const username = 'synthetic-e2e-admin';
  const prior = await database.account.findFirst({ where: { siteRole: 'SUPER_ADMIN' } });
  assert(!prior || prior.username === username, 'Refusing to replace a non-fixture administrator.');
  const passwordHash = await hashPassword(password);
  const data = {
    passwordHash,
    passwordChangedAt: new Date(),
    acceptedLegalVersion: LEGAL_DRAFT_VERSION,
  };
  await database.account.upsert({
    where: { username },
    create: { ...data, username, siteRole: 'SUPER_ADMIN' },
    update: { ...data, authVersion: { increment: 1 } },
  });
} finally {
  await database.$disconnect();
}
