import { ApiClientError } from '@baby-growth-gallery/api-client';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { api } from './api';
import styles from './AuthPages.module.css';
import { safeReturnPath } from './safe-return-path';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^1[3-9]\d{9}$/, '请输入有效的中国大陆手机号');
const passwordSchema = z
  .string()
  .min(6, '密码至少需要 6 个字符')
  .max(128, '密码不能超过 128 个字符');
const codeSchema = z.string().regex(/^\d{6}$/, '请输入 6 位验证码');

function errorCopy(error: unknown): string {
  if (!(error instanceof ApiClientError)) return '网络连接失败，请稍后再试。';
  const code = (error.problem as { code?: string } | undefined)?.code;
  if (code === 'RATE_LIMITED') return '请求过于频繁，请稍后再试。';
  if (code === 'VERIFICATION_INVALID') return '验证码无效或已过期，请重新确认。';
  if (code === 'VERIFICATION_ATTEMPTS_EXHAUSTED') return '验证码错误次数已用尽，请重新获取。';
  if (code === 'VERIFICATION_DELIVERY_UNAVAILABLE') return '验证码服务暂未配置，请稍后再试。';
  if (code === 'CSRF_INVALID' || code === 'ORIGIN_INVALID') {
    return '页面安全状态已更新，请重新提交。';
  }
  if (error.status === 401) return '手机号或登录凭据不正确。';
  return '暂时无法完成操作，请稍后再试。';
}

function applyZodErrors<T extends FieldValues>(
  error: z.ZodError,
  setError: UseFormSetError<T>,
): void {
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string') setError(field as Path<T>, { message: issue.message });
  }
}

function FieldError({ message }: { message: string | undefined }): React.JSX.Element | null {
  return message ? (
    <span className={styles.fieldError} role="alert">
      {message}
    </span>
  ) : null;
}

function PasswordField({
  label,
  error,
  registration,
  autoComplete,
}: {
  label: string;
  error: string | undefined;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
  autoComplete: string;
}): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <span className={styles.passwordControl}>
        <input
          {...registration}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          type={visible ? 'text' : 'password'}
        />
        <button
          aria-label={visible ? '隐藏密码' : '显示密码'}
          className={styles.reveal}
          type="button"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>
      <FieldError message={error} />
    </label>
  );
}

function useChallenge(purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD') {
  const [challengeId, setChallengeId] = useState<string>();
  const [remaining, setRemaining] = useState(0);
  const [expiresRemaining, setExpiresRemaining] = useState(0);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  useEffect(() => {
    if (expiresRemaining <= 0) return undefined;
    const timer = window.setInterval(
      () => setExpiresRemaining((value) => Math.max(0, value - 1)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [expiresRemaining]);

  return {
    challengeId: expiresRemaining > 0 ? challengeId : undefined,
    remaining,
    requesting,
    error,
    async request(phone: string): Promise<void> {
      const checked = phoneSchema.safeParse(phone);
      if (!checked.success) {
        setError(checked.error.issues[0]?.message ?? '请输入手机号');
        return;
      }
      setRequesting(true);
      setError(undefined);
      try {
        const result = await api.requestChallenge({ phone: checked.data, purpose });
        setChallengeId(result.challengeId);
        setRemaining(result.resendAfterSeconds);
        setExpiresRemaining(result.expiresInSeconds);
      } catch (requestError) {
        setError(errorCopy(requestError));
      } finally {
        setRequesting(false);
      }
    },
  };
}

interface PasswordLoginValues {
  phone: string;
  password: string;
  remember: boolean;
}

function PasswordLoginForm(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<PasswordLoginValues>({
    defaultValues: { phone: '', password: '', remember: false },
  });
  const [summary, setSummary] = useState<string>();

  async function submit(values: PasswordLoginValues): Promise<void> {
    setSummary(undefined);
    const checked = z
      .object({ phone: phoneSchema, password: passwordSchema, remember: z.boolean() })
      .safeParse(values);
    if (!checked.success) {
      applyZodErrors(checked.error, form.setError);
      return;
    }
    try {
      const account = await api.loginPassword(checked.data);
      auth.setAccount(account);
      const state = location.state as { returnPath?: unknown } | null;
      await navigate(safeReturnPath(state?.returnPath), { replace: true });
    } catch (error) {
      setSummary(errorCopy(error));
    }
  }

  return (
    <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
      <div className={styles.errorSummary} aria-live="assertive">
        {summary}
      </div>
      <label className={styles.field}>
        <span>手机号</span>
        <input
          {...form.register('phone')}
          aria-invalid={Boolean(form.formState.errors.phone)}
          autoComplete="tel"
          inputMode="tel"
          placeholder="请输入 11 位手机号"
        />
        <FieldError message={form.formState.errors.phone?.message} />
      </label>
      <PasswordField
        label="密码"
        autoComplete="current-password"
        registration={form.register('password')}
        error={form.formState.errors.password?.message}
      />
      <div className={styles.formRow}>
        <label className={styles.checkbox}>
          <input type="checkbox" {...form.register('remember')} />
          记住我
        </label>
        <Link to="/forgot-password">忘记密码？</Link>
      </div>
      <button className={styles.primaryButton} disabled={form.formState.isSubmitting} type="submit">
        {form.formState.isSubmitting ? '正在登录…' : '登录'}
      </button>
    </form>
  );
}

interface CodeLoginValues {
  phone: string;
  code: string;
  remember: boolean;
}

function CodeLoginForm(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const challenge = useChallenge('LOGIN');
  const form = useForm<CodeLoginValues>({
    defaultValues: { phone: '', code: '', remember: false },
  });
  const [summary, setSummary] = useState<string>();

  async function submit(values: CodeLoginValues): Promise<void> {
    setSummary(undefined);
    const checked = z
      .object({ phone: phoneSchema, code: codeSchema, remember: z.boolean() })
      .safeParse(values);
    if (!checked.success) {
      applyZodErrors(checked.error, form.setError);
      return;
    }
    if (!challenge.challengeId) {
      setSummary('请先获取有效的验证码。');
      return;
    }
    try {
      const account = await api.loginCode({ ...checked.data, challengeId: challenge.challengeId });
      auth.setAccount(account);
      const state = location.state as { returnPath?: unknown } | null;
      await navigate(safeReturnPath(state?.returnPath), { replace: true });
    } catch (error) {
      setSummary(errorCopy(error));
    }
  }

  return (
    <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
      <div className={styles.errorSummary} aria-live="assertive">
        {summary ?? challenge.error}
      </div>
      <label className={styles.field}>
        <span>手机号</span>
        <input
          {...form.register('phone')}
          autoComplete="tel"
          inputMode="tel"
          placeholder="请输入 11 位手机号"
        />
        <FieldError message={form.formState.errors.phone?.message} />
      </label>
      <label className={styles.field}>
        <span>验证码</span>
        <span className={styles.codeControl}>
          <input
            {...form.register('code')}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="6 位数字"
          />
          <button
            type="button"
            disabled={challenge.requesting || challenge.remaining > 0}
            onClick={() => void challenge.request(form.getValues('phone'))}
          >
            {challenge.requesting
              ? '发送中…'
              : challenge.remaining > 0
                ? `${challenge.remaining} 秒`
                : '获取验证码'}
          </button>
        </span>
        <FieldError message={form.formState.errors.code?.message} />
      </label>
      <label className={styles.checkbox}>
        <input type="checkbox" {...form.register('remember')} />
        记住我
      </label>
      <button className={styles.primaryButton} disabled={form.formState.isSubmitting} type="submit">
        {form.formState.isSubmitting ? '正在登录…' : '登录'}
      </button>
    </form>
  );
}

export function LoginPage(): React.JSX.Element {
  const [mode, setMode] = useState<'password' | 'code'>('password');
  return (
    <div className={styles.formCard}>
      <p className={styles.eyebrow}>欢迎回来</p>
      <h2>登录家庭成长空间</h2>
      <p className={styles.intro}>继续记录属于一家人的珍贵时光。</p>
      <div className={styles.tabs} role="tablist" aria-label="登录方式">
        <button
          role="tab"
          aria-selected={mode === 'password'}
          type="button"
          onClick={() => setMode('password')}
        >
          密码登录
        </button>
        <button
          role="tab"
          aria-selected={mode === 'code'}
          type="button"
          onClick={() => setMode('code')}
        >
          验证码登录
        </button>
      </div>
      {mode === 'password' ? <PasswordLoginForm /> : <CodeLoginForm />}
      <p className={styles.switchHint}>
        还没有账号？<Link to="/register">立即注册</Link>
      </p>
    </div>
  );
}

interface RegistrationValues {
  phone: string;
  code: string;
  password: string;
  confirmPassword: string;
  accepted: boolean;
}

export function RegisterPage(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const challenge = useChallenge('REGISTER');
  const form = useForm<RegistrationValues>({
    defaultValues: { phone: '', code: '', password: '', confirmPassword: '', accepted: false },
  });
  const [summary, setSummary] = useState<string>();
  async function submit(values: RegistrationValues): Promise<void> {
    setSummary(undefined);
    const checked = z
      .object({
        phone: phoneSchema,
        code: codeSchema,
        password: passwordSchema,
        confirmPassword: z.string(),
        accepted: z.literal(true, { error: '请先阅读并同意协议与隐私政策' }),
      })
      .refine((value) => value.password === value.confirmPassword, {
        path: ['confirmPassword'],
        message: '两次输入的密码不一致',
      })
      .safeParse(values);
    if (!checked.success) {
      applyZodErrors(checked.error, form.setError);
      return;
    }
    if (!challenge.challengeId) {
      setSummary('请先获取有效的验证码。');
      return;
    }
    try {
      const account = await api.register({
        phone: checked.data.phone,
        code: checked.data.code,
        password: checked.data.password,
        challengeId: challenge.challengeId,
        termsVersion: 'draft-2026-09-10',
        privacyVersion: 'draft-2026-09-10',
      });
      auth.setAccount(account);
      await navigate('/app', { replace: true });
    } catch (error) {
      setSummary(errorCopy(error));
    }
  }
  return (
    <div className={styles.formCard}>
      <p className={styles.eyebrow}>创建账号</p>
      <h2>开始记录成长</h2>
      <p className={styles.intro}>首版仅支持中国大陆手机号。</p>
      <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
        <div className={styles.errorSummary} aria-live="assertive">
          {summary ?? challenge.error}
        </div>
        <label className={styles.field}>
          <span>手机号</span>
          <input
            {...form.register('phone')}
            autoComplete="tel"
            inputMode="tel"
            placeholder="请输入 11 位手机号"
          />
          <FieldError message={form.formState.errors.phone?.message} />
        </label>
        <label className={styles.field}>
          <span>验证码</span>
          <span className={styles.codeControl}>
            <input
              {...form.register('code')}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="button"
              disabled={challenge.requesting || challenge.remaining > 0}
              onClick={() => void challenge.request(form.getValues('phone'))}
            >
              {challenge.requesting
                ? '发送中…'
                : challenge.remaining > 0
                  ? `${challenge.remaining} 秒`
                  : '获取验证码'}
            </button>
          </span>
          <FieldError message={form.formState.errors.code?.message} />
        </label>
        <PasswordField
          label="设置密码"
          autoComplete="new-password"
          registration={form.register('password')}
          error={form.formState.errors.password?.message}
        />
        <PasswordField
          label="确认密码"
          autoComplete="new-password"
          registration={form.register('confirmPassword')}
          error={form.formState.errors.confirmPassword?.message}
        />
        <label className={styles.checkbox}>
          <input type="checkbox" {...form.register('accepted')} />
          我已阅读并同意 <Link to="/legal/terms">用户协议</Link> 与{' '}
          <Link to="/legal/privacy">隐私政策</Link>
        </label>
        <FieldError message={form.formState.errors.accepted?.message} />
        <button
          className={styles.primaryButton}
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? '正在创建…' : '注册并登录'}
        </button>
      </form>
      <p className={styles.switchHint}>
        已有账号？<Link to="/login">返回登录</Link>
      </p>
    </div>
  );
}

interface ResetValues {
  phone: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export function ForgotPasswordPage(): React.JSX.Element {
  const navigate = useNavigate();
  const challenge = useChallenge('RESET_PASSWORD');
  const form = useForm<ResetValues>({
    defaultValues: { phone: '', code: '', newPassword: '', confirmPassword: '' },
  });
  const [summary, setSummary] = useState<string>();
  async function submit(values: ResetValues): Promise<void> {
    setSummary(undefined);
    const checked = z
      .object({
        phone: phoneSchema,
        code: codeSchema,
        newPassword: passwordSchema,
        confirmPassword: z.string(),
      })
      .refine((value) => value.newPassword === value.confirmPassword, {
        path: ['confirmPassword'],
        message: '两次输入的密码不一致',
      })
      .safeParse(values);
    if (!checked.success) {
      applyZodErrors(checked.error, form.setError);
      return;
    }
    if (!challenge.challengeId) {
      setSummary('请先获取有效的验证码。');
      return;
    }
    try {
      await api.resetPassword({
        phone: checked.data.phone,
        code: checked.data.code,
        newPassword: checked.data.newPassword,
        challengeId: challenge.challengeId,
      });
      await navigate('/login', { replace: true, state: { resetComplete: true } });
    } catch (error) {
      setSummary(errorCopy(error));
    }
  }
  return (
    <div className={styles.formCard}>
      <p className={styles.eyebrow}>找回密码</p>
      <h2>设置新的登录密码</h2>
      <p className={styles.intro}>验证手机号后，已有会话会全部失效。</p>
      <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
        <div className={styles.errorSummary} aria-live="assertive">
          {summary ?? challenge.error}
        </div>
        <label className={styles.field}>
          <span>手机号</span>
          <input {...form.register('phone')} autoComplete="tel" inputMode="tel" />
          <FieldError message={form.formState.errors.phone?.message} />
        </label>
        <label className={styles.field}>
          <span>验证码</span>
          <span className={styles.codeControl}>
            <input
              {...form.register('code')}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="button"
              disabled={challenge.requesting || challenge.remaining > 0}
              onClick={() => void challenge.request(form.getValues('phone'))}
            >
              {challenge.requesting
                ? '发送中…'
                : challenge.remaining > 0
                  ? `${challenge.remaining} 秒`
                  : '获取验证码'}
            </button>
          </span>
          <FieldError message={form.formState.errors.code?.message} />
        </label>
        <PasswordField
          label="新密码"
          autoComplete="new-password"
          registration={form.register('newPassword')}
          error={form.formState.errors.newPassword?.message}
        />
        <PasswordField
          label="确认新密码"
          autoComplete="new-password"
          registration={form.register('confirmPassword')}
          error={form.formState.errors.confirmPassword?.message}
        />
        <button
          className={styles.primaryButton}
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? '正在重置…' : '重置密码'}
        </button>
      </form>
      <p className={styles.switchHint}>
        <Link to="/login">返回登录</Link>
      </p>
    </div>
  );
}
