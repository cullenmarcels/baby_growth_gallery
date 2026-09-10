import { loadAppConfig } from '../src/config/app-config.js';

describe('authentication configuration', () => {
  it('allows explicitly enabled fixed verification delivery in test only', () => {
    const config = loadAppConfig({
      NODE_ENV: 'test',
      WEB_ORIGIN: 'http://127.0.0.1:5173',
      VERIFICATION_DELIVERY_MODE: 'fixed',
      TEST_VERIFICATION_CODE: '246810',
    });
    expect(config.auth.verificationDeliveryMode).toBe('fixed');
    expect(config.auth.testVerificationCode).toBe('246810');
    expect(config.auth.cookieName).toBe('bgg_dev_session');
  });

  it('rejects fixed codes in production', () => {
    expect(() =>
      loadAppConfig({
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://gallery.example',
        AUTH_COOKIE_SECURE: 'true',
        AUTH_SESSION_SECRET: 'production-session-secret-with-32-characters',
        AUTH_HMAC_SECRET: 'production-hmac-secret-with-more-than-32-characters',
        VERIFICATION_DELIVERY_MODE: 'fixed',
        TEST_VERIFICATION_CODE: '246810',
      }),
    ).toThrow(/forbidden in production/);
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
