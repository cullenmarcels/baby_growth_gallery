import { ApiClientError, type ApiProblem } from '@baby-growth-gallery/api-client';
import { describe, expect, it } from 'vitest';
import { userFacingError } from './user-facing-error';

function apiError(code: string, detail = 'English server detail'): ApiClientError {
  const problem: ApiProblem = {
    type: 'about:blank',
    title: 'Request failed',
    status: 400,
    detail,
    instance: '/api/v1/test',
    traceId: 'synthetic-trace',
    code,
  };
  return new ApiClientError(detail, 400, problem);
}

describe('userFacingError', () => {
  it('maps a stable API code to Chinese without exposing the English detail', () => {
    const message = userFacingError(apiError('USERNAME_TAKEN'));
    expect(message).toBe('账户名已使用。');
    expect(message).not.toContain('English');
  });

  it('explains an administrator-controlled photo restore in Chinese', () => {
    expect(userFacingError(apiError('PHOTO_RESTORE_ADMIN_REQUIRED'))).toBe(
      '需要家庭管理员恢复此照片。',
    );
  });

  it('uses a Chinese fallback for unknown API codes and raw errors', () => {
    expect(userFacingError(apiError('UNKNOWN_CODE'))).toBe('操作失败，请稍后重试。');
    expect(userFacingError(new Error('raw English error'), '网络连接失败，请稍后再试。')).toBe(
      '网络连接失败，请稍后再试。',
    );
  });
});
