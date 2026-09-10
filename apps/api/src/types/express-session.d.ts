import 'express-session';

declare module 'express-session' {
  interface SessionData {
    accountId?: string;
    authVersion?: number;
    authMethod?: 'password' | 'code' | 'register';
    issuedAt?: number;
    lastSeenAt?: number;
    absoluteExpiresAt?: number;
    idleTimeoutMs?: number;
    returnPath?: string;
  }
}

export {};
