import type { BabySummary, FamilySummary } from '@baby-growth-gallery/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Baby, CalendarDays, Camera, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { api } from './api';
import { babyKeys } from './baby-query';
import { ConfirmDialog } from './FamilyApp';
import styles from './FamilyApp.module.css';
import { userFacingError } from './user-facing-error';

const babySchema = z.object({
  nickname: z.string().trim().min(1, '请输入宝宝昵称').max(30, '宝宝昵称最多 30 个字符'),
  birthDate: z
    .string()
    .min(1, '请选择出生日期')
    .refine((value) => value <= today(), '出生日期不能晚于今天'),
  sex: z.enum(['', 'MALE', 'FEMALE']),
});

type BabyFormValues = z.infer<typeof babySchema>;

function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sexLabel(sex: BabySummary['sex']): string {
  return sex === 'MALE' ? '男宝宝' : sex === 'FEMALE' ? '女宝宝' : '未填写性别';
}

function ageLabel(birthDate: string): string {
  const birth = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 1) {
    const days = Math.max(0, Math.floor((now.valueOf() - birth.valueOf()) / 86_400_000));
    return `${days} 天`;
  }
  if (months < 24) return `${months} 个月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} 岁 ${rest} 个月` : `${years} 岁`;
}

function useCurrentFamily(): {
  familyId: string;
  family: FamilySummary | undefined;
  pending: boolean;
  error: boolean;
} {
  const auth = useAuth();
  const familyId = auth.account?.activeFamilyId ?? '';
  const family = useQuery({
    queryKey: ['family', familyId, 'detail'],
    queryFn: () => api.getFamily(familyId),
    enabled: Boolean(familyId),
  });
  return { familyId, family: family.data, pending: family.isPending, error: family.isError };
}

export function BabyEntryRedirect(): React.JSX.Element {
  const auth = useAuth();
  const familyId = auth.account?.activeFamilyId ?? '';
  const family = useQuery({
    queryKey: ['family', familyId, 'detail'],
    queryFn: () => api.getFamily(familyId),
    enabled: Boolean(familyId),
  });
  const babies = useQuery({
    queryKey: babyKeys.family(familyId),
    queryFn: () => api.listBabies(familyId),
    enabled: Boolean(familyId),
  });
  if (!familyId) return <Navigate replace to="/app/onboarding" />;
  if (family.isPending || babies.isPending)
    return <BabyPageState message="正在准备宝宝空间…" busy />;
  if (family.isError || babies.isError)
    return <BabyPageState message="宝宝档案加载失败，请刷新页面重试。" />;
  if (babies.data.items.length === 0) {
    const canManage = ['OWNER', 'ADMIN'].includes(family.data.currentMembership.role);
    return <Navigate replace to={canManage ? '/app/babies/new' : '/app/babies/waiting'} />;
  }
  const current = babies.data.items.find((baby) => baby.id === auth.account?.activeBabyId);
  if (!current) return <SessionBabyRepair />;
  return <Navigate replace to="/app/home" />;
}

function SessionBabyRepair(): React.JSX.Element {
  const auth = useAuth();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void api
      .getSession()
      .then((account) => {
        if (active) auth.setAccount(account);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [auth]);
  return error ? (
    <BabyPageState
      message="当前宝宝状态同步失败，请重新选择。"
      action={<Link to="/app/babies/manage">查看宝宝档案</Link>}
    />
  ) : (
    <BabyPageState message="正在同步当前宝宝…" busy />
  );
}

export function BabyHomePage(): React.JSX.Element {
  const auth = useAuth();
  const familyId = auth.account?.activeFamilyId ?? '';
  const babyId = auth.account?.activeBabyId ?? '';
  const baby = useQuery({
    queryKey: babyKeys.detail(familyId, babyId),
    queryFn: () => api.getBaby(familyId, babyId),
    enabled: Boolean(familyId && babyId),
  });
  if (!familyId || !babyId) return <Navigate replace to="/app" />;
  if (baby.isPending) return <BabyPageState message="正在打开宝宝档案…" busy />;
  if (baby.isError)
    return (
      <BabyPageState
        message="当前宝宝档案已发生变化，正在重新选择。"
        action={<Link to="/app">重新进入</Link>}
      />
    );
  return (
    <div className={styles.babyPage}>
      <section className={styles.babyHero}>
        <div className={styles.babyAvatar} aria-hidden="true">
          {baby.data.nickname.slice(0, 1)}
        </div>
        <div>
          <p className={styles.eyebrow}>宝宝档案</p>
          <h1>{baby.data.nickname}</h1>
          <p>
            {ageLabel(baby.data.birthDate)} · {sexLabel(baby.data.sex)}
          </p>
        </div>
        <Link className={styles.secondaryButton} to="/app/babies/manage">
          <Pencil size={16} /> 查看与管理
        </Link>
      </section>
      <section className={styles.foundationGrid} aria-label="成长功能进度">
        <FeatureCard
          title="珍贵照片"
          text="上传照片，安全处理后再发布给家人。"
          to="/app/photos/upload"
          icon="photo"
        />
        <FeatureCard title="成长里程碑" text="里程碑记录将在后续阶段开放。" />
        <FeatureCard title="成长数据" text="身高、体重和头围记录将在后续阶段开放。" />
      </section>
    </div>
  );
}

export function BabyCreatePage(): React.JSX.Element {
  const context = useCurrentFamily();
  if (!context.familyId) return <Navigate replace to="/app/onboarding" />;
  if (context.pending) return <BabyPageState message="正在读取家庭权限…" busy />;
  if (context.error || !context.family)
    return <BabyPageState message="无法访问当前家庭，请返回家庭空间重试。" />;
  if (!['OWNER', 'ADMIN'].includes(context.family.currentMembership.role)) {
    return <Navigate replace to="/app/babies/waiting" />;
  }
  return (
    <section className={styles.babyFormPage}>
      <div className={styles.heroIcon}>
        <Baby size={30} />
      </div>
      <p className={styles.eyebrow}>新建宝宝档案</p>
      <h1>记录成长故事的主角</h1>
      <p className={styles.lead}>昵称和出生日期用于家庭内展示；性别可以稍后再填写。</p>
      <BabyForm familyId={context.familyId} />
    </section>
  );
}

export function BabyWaitingPage(): React.JSX.Element {
  return (
    <section className={styles.comingSoon}>
      <span>
        <Baby size={30} />
      </span>
      <p className={styles.eyebrow}>等待宝宝档案</p>
      <h1>家庭管理员还没有创建宝宝档案</h1>
      <p>创建者或管理员完成档案后，你就可以在这里查看和切换宝宝。</p>
      <Link className={styles.secondaryButton} to="/app">
        重新检查
      </Link>
    </section>
  );
}

export function BabyManagePage(): React.JSX.Element {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { familyId, family, pending, error } = useCurrentFamily();
  const canManage = Boolean(family && ['OWNER', 'ADMIN'].includes(family.currentMembership.role));
  const babies = useQuery({
    queryKey: canManage ? babyKeys.familyWithArchived(familyId) : babyKeys.family(familyId),
    queryFn: () => api.listBabies(familyId, canManage),
    enabled: Boolean(familyId && family),
  });
  const [editing, setEditing] = useState<BabySummary>();
  const [confirmArchive, setConfirmArchive] = useState<BabySummary>();
  const [notice, setNotice] = useState<string>();

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: babyKeys.all });
  };
  const activate = useMutation({
    mutationFn: (baby: BabySummary) => api.activateBaby(familyId, baby.id),
    async onSuccess(account) {
      auth.setAccount(account);
      await refresh();
      await navigate('/app/home');
    },
    onError(err) {
      setNotice(userFacingError(err, '切换宝宝失败，请重试。'));
    },
  });
  const archive = useMutation({
    mutationFn: (baby: BabySummary) => api.archiveBaby(familyId, baby.id),
    async onSuccess(account) {
      auth.setAccount(account);
      setConfirmArchive(undefined);
      setNotice('宝宝档案已归档，可在 30 天内恢复。');
      await refresh();
    },
    onError(err) {
      setNotice(userFacingError(err, '归档失败，请重试。'));
    },
  });
  const restore = useMutation({
    mutationFn: (baby: BabySummary) => api.restoreBaby(familyId, baby.id),
    async onSuccess(baby) {
      const account = await api.activateBaby(familyId, baby.id);
      auth.setAccount(account);
      setNotice('宝宝档案已恢复。');
      await refresh();
    },
    onError(err) {
      setNotice(userFacingError(err, '恢复失败，请重试。'));
    },
  });

  if (!familyId) return <Navigate replace to="/app/onboarding" />;
  if (pending || babies.isPending) return <BabyPageState message="正在读取宝宝档案…" busy />;
  if (error || babies.isError || !family)
    return <BabyPageState message="宝宝档案加载失败，请刷新页面重试。" />;

  return (
    <div className={styles.babyManage}>
      <div className={styles.manageHeading}>
        <div>
          <p className={styles.eyebrow}>当前家庭</p>
          <h1>宝宝档案</h1>
          <p>查看并切换家庭中的宝宝档案。</p>
        </div>
        {canManage ? (
          <Link className={styles.primaryButton} to="/app/babies/new">
            <Plus size={17} />
            新建档案
          </Link>
        ) : null}
      </div>
      {notice ? (
        <div className={styles.inlineNotice} role="status">
          {notice}
        </div>
      ) : null}
      {babies.data.items.length === 0 ? (
        <BabyPageState
          message={canManage ? '家庭中还没有宝宝档案。' : '家庭管理员还没有创建宝宝档案。'}
        />
      ) : (
        <div className={styles.babyList}>
          {babies.data.items.map((baby) => (
            <article key={baby.id} data-status={baby.status}>
              <button
                className={styles.babyIdentity}
                type="button"
                disabled={baby.status !== 'ACTIVE' || activate.isPending}
                onClick={() => activate.mutate(baby)}
              >
                <span className={styles.babyAvatar}>{baby.nickname.slice(0, 1)}</span>
                <span>
                  <strong>{baby.nickname}</strong>
                  <small>
                    {ageLabel(baby.birthDate)} · {sexLabel(baby.sex)}
                  </small>
                </span>
                {baby.id === auth.account?.activeBabyId ? (
                  <em>当前宝宝</em>
                ) : baby.status === 'ARCHIVED' ? (
                  <em>已归档</em>
                ) : (
                  <em>切换</em>
                )}
              </button>
              {canManage ? (
                <div className={styles.babyActions}>
                  {baby.status === 'ACTIVE' ? (
                    <>
                      <button type="button" onClick={() => setEditing(baby)}>
                        <Pencil size={16} />
                        编辑
                      </button>
                      <button type="button" onClick={() => setConfirmArchive(baby)}>
                        <Trash2 size={16} />
                        归档
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => restore.mutate(baby)}
                      disabled={restore.isPending}
                    >
                      <ArchiveRestore size={16} />
                      恢复
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {editing ? (
        <section className={styles.editPanel} aria-label={`编辑${editing.nickname}`}>
          <h2>编辑宝宝档案</h2>
          <BabyForm familyId={familyId} baby={editing} onComplete={() => setEditing(undefined)} />
        </section>
      ) : null}
      {confirmArchive ? (
        <ConfirmDialog
          title="确认归档宝宝档案？"
          message={`归档“${confirmArchive.nickname}”后，普通成员将无法查看；管理员可在 30 天内恢复，之后将永久清理。`}
          onCancel={() => setConfirmArchive(undefined)}
          onConfirm={async () => archive.mutateAsync(confirmArchive).then(() => undefined)}
        />
      ) : null}
    </div>
  );
}

function BabyForm({
  familyId,
  baby,
  onComplete,
}: {
  familyId: string;
  baby?: BabySummary;
  onComplete?: () => void;
}): React.JSX.Element {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BabyFormValues>({
    defaultValues: {
      nickname: baby?.nickname ?? '',
      birthDate: baby?.birthDate ?? '',
      sex: baby?.sex ?? '',
    },
  });
  const submit = handleSubmit(async (raw) => {
    const parsed = babySchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'nickname' || field === 'birthDate' || field === 'sex')
          setError(field, { message: issue.message });
      }
      return;
    }
    setServerError(undefined);
    try {
      const body = {
        nickname: parsed.data.nickname,
        birthDate: parsed.data.birthDate,
        sex: parsed.data.sex || null,
      };
      const saved = baby
        ? await api.updateBaby(familyId, baby.id, body)
        : await api.createBaby(familyId, body);
      if (!baby) {
        const account = await api.activateBaby(familyId, saved.id);
        auth.setAccount(account);
      }
      await queryClient.invalidateQueries({ queryKey: babyKeys.all });
      if (onComplete) onComplete();
      else await navigate('/app/home', { replace: true });
    } catch (err) {
      setServerError(userFacingError(err, '保存宝宝档案失败，请重试。'));
    }
  });
  return (
    <form className={styles.formCard} onSubmit={(event) => void submit(event)} noValidate>
      {serverError || errors.nickname?.message || errors.birthDate?.message ? (
        <div className={styles.formError} role="alert">
          {serverError ?? errors.nickname?.message ?? errors.birthDate?.message}
        </div>
      ) : null}
      <label>
        宝宝昵称
        <input
          maxLength={30}
          autoFocus
          placeholder="请输入家庭内使用的昵称"
          {...register('nickname')}
        />
      </label>
      {errors.nickname?.message ? (
        <span className={styles.fieldError}>{errors.nickname.message}</span>
      ) : null}
      <label>
        出生日期
        <input type="date" max={today()} {...register('birthDate')} />
      </label>
      {errors.birthDate?.message ? (
        <span className={styles.fieldError}>{errors.birthDate.message}</span>
      ) : null}
      <label>
        性别（选填）
        <select {...register('sex')}>
          <option value="">暂不填写</option>
          <option value="MALE">男宝宝</option>
          <option value="FEMALE">女宝宝</option>
        </select>
      </label>
      <div className={styles.formActions}>
        {onComplete ? (
          <button className={styles.secondaryButton} type="button" onClick={onComplete}>
            取消
          </button>
        ) : null}
        <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
          {isSubmitting ? '正在保存…' : baby ? '保存修改' : '创建宝宝档案'}
        </button>
      </div>
    </form>
  );
}

function FeatureCard({
  title,
  text,
  to,
  icon = 'calendar',
}: {
  title: string;
  text: string;
  to?: string;
  icon?: 'calendar' | 'photo';
}): React.JSX.Element {
  const content = (
    <article className={styles.featureCard}>
      {icon === 'photo' ? <Camera size={22} /> : <CalendarDays size={22} />}
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function BabyPageState({
  message,
  busy,
  action,
}: {
  message: string;
  busy?: boolean;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className={styles.pageState}>
      {busy ? <span className={styles.spinner} aria-hidden="true" /> : <Baby size={28} />}
      <p role={busy ? 'status' : 'alert'}>{message}</p>
      {action}
    </section>
  );
}
