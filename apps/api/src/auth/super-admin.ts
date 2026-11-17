import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { loadAppConfig } from '../config/app-config.js';
import { PrismaService } from '../infrastructure/prisma.service.js';
import { serializable } from '../infrastructure/serializable.js';
import { passwordSchema, usernameSchema } from './auth.schemas.js';
import { hashPassword, temporaryPasswordExpiry } from './password.js';

async function main(): Promise<void> {
  const action = process.argv[2];
  if (
    !process.stdin.isTTY ||
    !process.stdout.isTTY ||
    !['create', 'reset'].includes(action ?? '')
  ) {
    throw new Error('Use an interactive terminal: super-admin create or super-admin reset.');
  }

  let hideInput = false;
  const output = new Writable({
    write(chunk: Buffer, _encoding, done) {
      if (!hideInput) process.stdout.write(chunk);
      done();
    },
  });
  const input = createInterface({ input: process.stdin, output, terminal: true });
  let username: string;
  let passwordHash: string;
  try {
    username = usernameSchema.parse(await input.question('Super administrator username: '));
    process.stdout.write('Temporary password: ');
    hideInput = true;
    const password = await input.question('');
    hideInput = false;
    process.stdout.write('\nConfirm temporary password: ');
    hideInput = true;
    const confirmation = await input.question('');
    hideInput = false;
    process.stdout.write('\n');
    if (password !== confirmation) throw new Error('Temporary passwords did not match.');
    passwordHash = await hashPassword(passwordSchema.parse(password));
  } catch {
    throw new Error(
      'Input was cancelled, did not meet the username/password policy, or the two passwords did not match.',
    );
  } finally {
    input.close();
  }

  const database = new PrismaService(loadAppConfig());
  try {
    await serializable(database, async (transaction) => {
      const account = await transaction.account.findFirst({ where: { siteRole: 'SUPER_ADMIN' } });
      const credential = {
        passwordHash,
        passwordChangedAt: new Date(),
        temporaryPasswordExpiresAt: temporaryPasswordExpiry(),
      };
      if (action === 'create') {
        if (account) throw new Error('A super administrator already exists.');
        await transaction.account.create({
          data: { username, siteRole: 'SUPER_ADMIN', ...credential },
        });
      } else {
        if (!account || account.username !== username)
          throw new Error('No matching super administrator exists.');
        await transaction.account.update({
          where: { id: account.id },
          data: { ...credential, status: 'ACTIVE', authVersion: { increment: 1 } },
        });
      }
    });
  } finally {
    await database.$disconnect();
  }
  process.stdout.write(
    'Super administrator credential set. Change the temporary password after sign-in.\n',
  );
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error && !('code' in error)
      ? error.message
      : 'Super administrator operation failed.';
  process.stderr.write(message + '\n');
  process.exitCode = 1;
});
