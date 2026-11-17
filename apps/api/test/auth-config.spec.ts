import { loadAppConfig } from '../src/config/app-config.js';
import {
  passwordChangeSchema,
  passwordLoginSchema,
  usernameSchema,
} from '../src/auth/auth.schemas.js';

describe('authentication configuration', () => {
  it('normalizes ASCII case and supports Han and numeric usernames', () => {
    expect(usernameSchema.parse('爸妈-User_1')).toBe('爸妈-user_1');
    expect(usernameSchema.parse('13800138000')).toBe('13800138000');
    expect(usernameSchema.parse('妈')).toBe('妈');
    for (const invalid of [
      '',
      '-',
      '_',
      '+8613800138000',
      '家 人',
      '家.人',
      '家人\n',
      '宝宝😀',
      'é',
      'a'.repeat(33),
    ]) {
      expect(usernameSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('enforces the shared 6 to 128 character password boundary', () => {
    expect(passwordLoginSchema.safeParse({ username: '家庭', password: 'abcde' }).success).toBe(
      false,
    );
    expect(passwordLoginSchema.safeParse({ username: '家庭', password: 'abcdef' }).success).toBe(
      true,
    );
    expect(
      passwordLoginSchema.safeParse({ phone: '13800138000', password: 'abcdef' }).success,
    ).toBe(false);
    expect(
      passwordChangeSchema.safeParse({ currentPassword: 'abcdef', newPassword: '长口令 允许空格' })
        .success,
    ).toBe(true);
    expect(
      passwordChangeSchema.safeParse({ currentPassword: 'abcdef', newPassword: 'a'.repeat(129) })
        .success,
    ).toBe(false);
  });

  it('rejects insecure production cookies and default secrets', () => {
    expect(() =>
      loadAppConfig({
        NODE_ENV: 'production',
        WEB_ORIGIN: 'http://localhost:8080',
      }),
    ).toThrow(/production authentication secrets/);
    expect(() =>
      loadAppConfig({
        NODE_ENV: 'production',
        WEB_ORIGIN: 'http://localhost:8080',
        AUTH_SESSION_SECRET: 'production-session-secret-with-32-characters',
        AUTH_HMAC_SECRET: 'production-hmac-secret-with-more-than-32-characters',
      }),
    ).toThrow(/production cookies must be Secure/);
  });

  it('rejects insecure cookies for non-loopback origins in development', () => {
    expect(() =>
      loadAppConfig({ NODE_ENV: 'development', WEB_ORIGIN: 'https://dev.example' }),
    ).toThrow(/insecure cookies require loopback/);
  });
});
