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
  BABY_NOT_FOUND: '找不到这个宝宝档案，它可能已归档或被清理。',
  BABY_PERMISSION_DENIED: '你没有权限管理宝宝档案。',
  BABY_STATE_CONFLICT: '宝宝档案状态已经变化，请刷新后重试。',
  BABY_RESTORE_EXPIRED: '宝宝档案的 30 天恢复期限已过，无法恢复。',
  PHOTO_NOT_FOUND: '找不到这张照片，或你无权访问。',
  PHOTO_PERMISSION_DENIED: '你没有权限执行此照片操作。',
  PHOTO_STATE_CONFLICT: '照片状态已经变化，请刷新后重试。',
  PHOTO_BATCH_INVALID: '照片批次内容无效，请重新选择。',
  PHOTO_UPLOAD_LIMIT: '照片上传次数已达上限，请稍后再试。',
  PHOTO_UPLOAD_EXPIRED: '照片上传窗口已过期，请重新上传。',
  PHOTO_FILE_TOO_LARGE: '照片大小不符合要求，单张最多 20 MiB。',
  PHOTO_FORMAT_UNSUPPORTED: '照片真实格式不受支持。',
  PHOTO_ANIMATION_UNSUPPORTED: '暂不支持动画图片或多图 HEIF。',
  PHOTO_PIXEL_LIMIT_EXCEEDED: '照片像素超过 5000 万，无法处理。',
  PHOTO_DIMENSIONS_UNSUPPORTED: '照片单边尺寸超过处理上限。',
  PHOTO_PROCESSING_FAILED: '照片损坏或无法安全处理。',
  PHOTO_NOT_READY: '照片尚未处理完成，请稍后再试。',
  PHOTO_RESTORE_EXPIRED: '照片的 30 天恢复期限已过。',
  PHOTO_RESTORE_ADMIN_REQUIRED: '需要家庭管理员恢复此照片。',
  PHOTO_STORAGE_UNAVAILABLE: '照片存储暂时不可用，请稍后再试。',
  PHOTO_DEPENDENCY_UNAVAILABLE: '照片服务依赖暂时不可用，请稍后再试。',
};

export function userFacingError(error: unknown, fallback = '操作失败，请稍后重试。'): string {
  if (!(error instanceof ApiClientError)) return fallback;
  const code = (error.problem as { code?: string } | undefined)?.code;
  if (code && errorCopyByCode[code]) return errorCopyByCode[code];
  if (error.status === 401) return '手机号或登录凭据不正确。';
  return fallback;
}
