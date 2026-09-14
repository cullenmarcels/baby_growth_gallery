import { ApiClientError } from '@baby-growth-gallery/api-client';

const errorCopyByCode: Readonly<Record<string, string>> = {
  PHONE_INVALID: '请输入有效的中国大陆手机号。',
  VALIDATION_FAILED: '请检查填写内容后重新提交。',
  AUTH_REQUEST_INVALID: '手机号或登录凭据不正确。',
  AUTH_DEPENDENCY_UNAVAILABLE: '登录服务暂时不可用，请稍后再试。',
  VERIFICATION_INVALID: '验证码无效或已过期，请重新确认。',
  VERIFICATION_ATTEMPTS_EXHAUSTED: '验证码错误次数已用尽，请重新获取。',
  VERIFICATION_DELIVERY_UNAVAILABLE: '验证码服务暂未配置，请稍后再试。',
  RATE_LIMITED: '请求过于频繁，请稍后再试。',
  ORIGIN_INVALID: '页面安全状态已更新，请重新提交。',
  CSRF_INVALID: '页面安全状态已更新，请重新提交。',
  SESSION_REQUIRED: '登录状态已失效，请重新登录。',
  FAMILY_NOT_FOUND: '无法访问这个家庭，成员状态可能已经变化。',
  FAMILY_PERMISSION_DENIED: '你没有权限执行此操作。',
  FAMILY_STATE_CONFLICT: '家庭成员状态已经变化，请刷新后重试。',
  FAMILY_OWNER_REQUIRED: '家庭必须保留一位创建者，当前操作无法完成。',
  FAMILY_DEPENDENCY_UNAVAILABLE: '家庭邀请服务暂时不可用，请稍后再试。',
  FAMILY_INVITATION_NOT_FOUND: '找不到这条邀请，它可能已经失效。',
  ALREADY_FAMILY_MEMBER: '你已经是这个家庭的成员，无需重复加入。',
  INVITATION_INVALID: '邀请口令无效或已失效。',
  CURSOR_INVALID: '动态分页信息已失效，请刷新页面重试。',
};

export function userFacingError(error: unknown, fallback = '操作失败，请稍后重试。'): string {
  if (!(error instanceof ApiClientError)) return fallback;
  const code = (error.problem as { code?: string } | undefined)?.code;
  if (code && errorCopyByCode[code]) return errorCopyByCode[code];
  if (error.status === 401) return '手机号或登录凭据不正确。';
  return fallback;
}
