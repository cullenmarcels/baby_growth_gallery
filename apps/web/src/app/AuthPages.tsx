import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { api } from './api';
import styles from './AuthPages.module.css';
import { safeReturnPath } from './safe-return-path';
import { userFacingError } from './user-facing-error';

import { accountDestination } from './route-guards';
import { isUsername } from './username';

const passwordRules = {
  required: '请输入密码',
  minLength: { value: 6, message: '密码至少需要 6 个字符' },
  maxLength: { value: 128, message: '密码最多 128 个字符' },
};

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

export function LoginPage(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<{ username: string; password: string; remember: boolean }>({
    defaultValues: { username: '', password: '', remember: false },
  });
  const [error, setError] = useState<string>();

  const submit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const account = await api.loginPassword(values);
      auth.setAccount(account);
      const destination = accountDestination(account);
      const requested = safeReturnPath(
        (location.state as { returnPath?: unknown } | null)?.returnPath,
      );
      await navigate(destination === '/app' ? requested : destination, { replace: true });
    } catch (failure) {
      setError(userFacingError(failure));
    }
  });

  return (
    <div className={styles.formCard}>
      <h2>登录家庭成长空间</h2>
      <p className={styles.intro}>开户或找回密码，请联系管理员。</p>
      <form onSubmit={(event) => void submit(event)}>
        <div className={styles.errorSummary} role="alert">
          {error}
        </div>
        <label className={styles.field}>
          <span>账户名</span>
          <input
            {...form.register('username', {
              validate: (value) => isUsername(value) || '请输入有效的账户名',
            })}
            autoComplete="username"
            aria-invalid={Boolean(form.formState.errors.username)}
          />
          <FieldError message={form.formState.errors.username?.message} />
        </label>
        <PasswordField
          label="密码"
          autoComplete="current-password"
          registration={form.register('password', passwordRules)}
          error={form.formState.errors.password?.message}
        />
        <label className={styles.checkbox}>
          <input type="checkbox" {...form.register('remember')} />
          记住我
        </label>
        <button
          className={styles.primaryButton}
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? '登录中' : '登录'}
        </button>
      </form>
    </div>
  );
}

export function ChangePasswordPage(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const form = useForm<{ currentPassword: string; newPassword: string; acceptTerms: boolean }>({
    defaultValues: { currentPassword: '', newPassword: '', acceptTerms: false },
  });
  const [error, setError] = useState<string>();
  const submit = form.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const account = await api.changePassword(values);
      form.reset();
      auth.setAccount(account);
      await navigate(accountDestination(account), { replace: true });
    } catch (failure) {
      setError(userFacingError(failure));
    }
  });

  async function logout() {
    try {
      await api.logout();
      auth.setAccount(null);
      await navigate('/login', { replace: true });
    } catch (failure) {
      setError(userFacingError(failure));
    }
  }

  return (
    <div className={styles.formCard}>
      <h2>修改密码</h2>
      {auth.account?.mustChangePassword ? (
        <p className={styles.intro}>请确认要使用的密码。你也可以保留当前密码。</p>
      ) : null}
      <form onSubmit={(event) => void submit(event)}>
        <div className={styles.errorSummary} role="alert">
          {error}
        </div>
        <PasswordField
          label="当前密码"
          autoComplete="current-password"
          registration={form.register('currentPassword', passwordRules)}
          error={form.formState.errors.currentPassword?.message}
        />
        <PasswordField
          label="新密码"
          autoComplete="new-password"
          registration={form.register('newPassword', passwordRules)}
          error={form.formState.errors.newPassword?.message}
        />
        {auth.account?.mustAcceptTerms ? (
          <div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                {...form.register('acceptTerms', { required: '请先阅读并同意条款' })}
              />
              我已阅读并同意条款
            </label>
            <p className={styles.intro}>
              <Link to="/legal/terms" target="_blank" rel="noreferrer">
                用户协议
              </Link>
              {' · '}
              <Link to="/legal/privacy" target="_blank" rel="noreferrer">
                隐私政策
              </Link>
            </p>
            <FieldError message={form.formState.errors.acceptTerms?.message} />
          </div>
        ) : null}
        <div className={styles.passwordActions}>
          <button
            className={styles.primaryButton}
            disabled={form.formState.isSubmitting}
            type="submit"
          >
            保存密码
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => void logout()}>
            退出登录
          </button>
        </div>
      </form>
    </div>
  );
}
