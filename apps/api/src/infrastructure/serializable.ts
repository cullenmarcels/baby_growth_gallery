import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from './prisma.service.js';

export function databaseErrorKind(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  if ('kind' in error && typeof error.kind === 'string') return error.kind;
  return 'cause' in error ? databaseErrorKind(error.cause) : undefined;
}

export async function serializable<T>(
  prisma: PrismaService,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (
        attempt === 4 ||
        !['P2034', 'TransactionWriteConflict'].includes(databaseErrorKind(error) ?? '')
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 10));
    }
  }
}
