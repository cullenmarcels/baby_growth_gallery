import { csrfSync } from 'csrf-sync';

export const csrf = csrfSync({
  size: 32,
  errorConfig: { statusCode: 403, message: 'Request verification failed.', code: 'CSRF_INVALID' },
});
