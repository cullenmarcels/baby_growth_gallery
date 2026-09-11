import type {
  FamilyActivityPage,
  FamilyMember,
  FamilySummary,
} from '@baby-growth-gallery/api-client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Baby,
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Heart,
  Home,
  Images,
  LogOut,
  Menu,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { api } from './api';
import styles from './FamilyApp.module.css';

type Role = FamilyMember['role'];

const createSchema = z.object({
  name: z.string().trim().min(1, '请输入家庭名称').max(40, '家庭名称最多 40 个字符'),
  displayName: z.string().trim().min(1, '请输入家庭称呼').max(30, '家庭称呼最多 30 个字符'),
});
const joinSchema = z.object({
  token: z.string().trim().min(1, '请输入邀请口令'),
  displayName: z.string().trim().min(1, '请输入家庭称呼').max(30, '家庭称呼最多 30 个字符'),
});

type CreateValues = z.infer<typeof createSchema>;
type JoinValues = z.infer<typeof joinSchema>;

const familyKeys = {
  all: ['families'] as const,
  detail: (id: string) => ['family', id, 'detail'] as const,
  members: (id: string) => ['family', id, 'members'] as const,
  invitations: (id: string) => ['family', id, 'invitations'] as const,
  activities: (id: string) => ['family', id, 'activities'] as const,
};

function errorMessage(error: unknown, fallback = '操作失败，请稍后重试。'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function roleLabel(role: Role): string {
  return role === 'OWNER' ? '创建者' : role === 'ADMIN' ? '管理员' : '成员';
}

export function AppHomeRedirect(): React.JSX.Element {
  const auth = useAuth();
  const families = useQuery({ queryKey: familyKeys.all, queryFn: () => api.listFamilies() });
  if (families.isPending) return <PageState message="正在确定当前家庭…" busy />;
  if (families.isError) return <PageState message="家庭列表加载失败，请刷新页面重试。" />;
  const active = families.data.items.find((family) => family.id === auth.account?.activeFamilyId);
  const target = active ?? families.data.items[0];
  return <Navigate replace to={target ? `/app/families/${target.id}` : '/app/onboarding'} />;
}

const navItems = [
  { to: '/app/timeline', label: '时间轴', icon: Clock3 },
  { to: '/app/gallery', label: '图集', icon: Images },
  { to: '/app/milestones', label: '里程碑', icon: Sparkles },
  { to: '/app/growth', label: '成长数据', icon: BarChart3 },
];

export function FamilyShell(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const families = useQuery({ queryKey: familyKeys.all, queryFn: () => api.listFamilies() });
  const activate = useMutation({
    mutationFn: (familyId: string) => api.activateFamily(familyId),
    onSuccess(account, familyId) {
      auth.setAccount(account);
      setMenuOpen(false);
      void navigate(`/app/families/${familyId}`);
    },
    onError(error) {
      setNotice(errorMessage(error, '切换家庭失败，请重试。'));
    },
  });

  async function logout(): Promise<void> {
    setNotice(undefined);
    try {
      await api.logout();
      auth.setAccount(null);
      await navigate('/login', { replace: true });
    } catch (error) {
      setNotice(errorMessage(error, '退出失败，请检查网络后重试。'));
    }
  }

  const activeFamily = families.data?.items.find(
    (family) => family.id === auth.account?.activeFamilyId,
  );

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} to="/app" aria-label="小福宝成长记首页">
          <span>
            <Heart size={18} fill="currentColor" />
          </span>
          <strong>小福宝成长记</strong>
        </Link>
        <nav className={styles.desktopNav} aria-label="主导航">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          {activeFamily ? (
            <NavLink to={`/app/families/${activeFamily.id}`}>
              <Users size={17} />
              家庭
            </NavLink>
          ) : null}
        </nav>
        <div className={styles.headerActions}>
          <button
            className={styles.familySwitch}
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Home size={16} />
            <span>{activeFamily?.name ?? '选择家庭'}</span>
            <ChevronDown size={15} />
          </button>
          <button
            className={styles.iconButton}
            type="button"
            onClick={() => void logout()}
            aria-label="退出登录"
          >
            <LogOut size={18} />
          </button>
          <button
            className={styles.mobileMenuButton}
            type="button"
            aria-label="打开家庭切换器"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu size={20} />
          </button>
          {menuOpen ? (
            <div className={styles.switchMenu}>
              <p>我的家庭</p>
              {families.data?.items.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  disabled={activate.isPending}
                  onClick={() => activate.mutate(family.id)}
                >
                  <span>{family.name}</span>
                  {family.id === auth.account?.activeFamilyId ? <Check size={16} /> : null}
                </button>
              ))}
              <Link to="/app/onboarding" onClick={() => setMenuOpen(false)}>
                <Plus size={16} />
                创建或加入家庭
              </Link>
              <button className={styles.mobileLogout} type="button" onClick={() => void logout()}>
                <LogOut size={16} />
                退出登录
              </button>
            </div>
          ) : null}
        </div>
      </header>
      {notice ? (
        <div className={styles.globalNotice} role="alert">
          {notice}
        </div>
      ) : null}
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.mobileTabs} aria-label="移动端主导航">
        {navItems.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={20} />
            <span>{label === '成长数据' ? '成长' : label}</span>
          </NavLink>
        ))}
        <NavLink to={activeFamily ? `/app/families/${activeFamily.id}` : '/app/onboarding'}>
          <Users size={20} />
          <span>家庭</span>
        </NavLink>
      </nav>
    </div>
  );
}

export function OnboardingPage(): React.JSX.Element {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  return (
    <section className={styles.onboarding}>
      <div className={styles.heroIcon}>
        <Baby size={30} />
      </div>
      <p className={styles.eyebrow}>家庭空间</p>
      <h1>把珍贵时刻分享给最亲近的人</h1>
      <p className={styles.lead}>创建一个新的家庭，或使用亲友发给你的一次性邀请口令加入。</p>
      <div className={styles.modeTabs} role="tablist" aria-label="家庭加入方式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          onClick={() => setMode('create')}
        >
          <Home size={17} />
          创建家庭
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'join'}
          onClick={() => setMode('join')}
        >
          <UserRoundPlus size={17} />
          加入家庭
        </button>
      </div>
      {mode === 'create' ? <CreateFamilyForm /> : <JoinFamilyForm />}
    </section>
  );
}

function CreateFamilyForm(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>();

  const submit = handleSubmit(async (raw) => {
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'name' || field === 'displayName')
          setError(field, { message: issue.message });
      }
      return;
    }
    setServerError(undefined);
    try {
      const family = await api.createFamily(parsed.data);
      auth.setAccount({ ...auth.account!, activeFamilyId: family.id });
      await queryClient.invalidateQueries({ queryKey: familyKeys.all });
      await navigate(`/app/families/${family.id}`, { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <form className={styles.formCard} onSubmit={(event) => void submit(event)} noValidate>
      <FormError message={serverError ?? errors.name?.message ?? errors.displayName?.message} />
      <label>
        家庭名称
        <input
          autoFocus
          maxLength={40}
          placeholder="例如：我们的温暖小家"
          {...register('name', { required: '请输入家庭名称', maxLength: 40 })}
        />
      </label>
      <FieldError message={errors.name?.message} />
      <label>
        你在家庭中的称呼
        <input
          maxLength={30}
          placeholder="例如：妈妈、舅舅"
          {...register('displayName', { required: '请输入家庭称呼', maxLength: 30 })}
        />
      </label>
      <FieldError message={errors.displayName?.message} />
      <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
        {isSubmitting ? '正在创建…' : '创建家庭'}
      </button>
      <p className={styles.hint}>你将成为此家庭的创建者。当前版本暂不支持转移所有权。</p>
    </form>
  );
}

function JoinFamilyForm(): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JoinValues>();
  const submit = handleSubmit(async (raw) => {
    const parsed = joinSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'token' || field === 'displayName')
          setError(field, { message: issue.message });
      }
      return;
    }
    setServerError(undefined);
    try {
      const result = await api.acceptFamilyInvitation(parsed.data);
      auth.setAccount(result.account);
      await queryClient.invalidateQueries({ queryKey: familyKeys.all });
      await navigate(`/app/families/${result.family.id}`, { replace: true });
    } catch (error) {
      setServerError(errorMessage(error, '邀请口令无效或已失效。'));
    }
  });
  return (
    <form className={styles.formCard} onSubmit={(event) => void submit(event)} noValidate>
      <FormError message={serverError ?? errors.token?.message ?? errors.displayName?.message} />
      <label>
        邀请口令
        <input
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="XXXX-XXXX-XXXX"
          {...register('token', { required: '请输入邀请口令' })}
        />
      </label>
      <FieldError message={errors.token?.message} />
      <label>
        你在家庭中的称呼
        <input
          maxLength={30}
          placeholder="例如：奶奶、叔叔"
          {...register('displayName', { required: '请输入家庭称呼', maxLength: 30 })}
        />
      </label>
      <FieldError message={errors.displayName?.message} />
      <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
        {isSubmitting ? '正在加入…' : '加入家庭'}
      </button>
      <p className={styles.hint}>邀请口令仅可由一位成员使用一次，有效期为 7 天。</p>
    </form>
  );
}

export function FamilyPage(): React.JSX.Element {
  const { familyId = '' } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string>();
  const detail = useQuery({
    queryKey: familyKeys.detail(familyId),
    queryFn: () => api.getFamily(familyId),
    enabled: Boolean(familyId),
  });
  const requiresActivation = Boolean(detail.data && auth.account?.activeFamilyId !== familyId);

  useEffect(() => {
    if (!detail.data || auth.account?.activeFamilyId === familyId) return;
    void api
      .activateFamily(familyId)
      .then((account) => auth.setAccount(account))
      .catch(async () => {
        await queryClient.invalidateQueries({ queryKey: familyKeys.all });
        await navigate('/app', { replace: true });
      });
  }, [auth, detail.data, familyId, navigate, queryClient]);

  if (detail.isPending) return <PageState message="正在进入家庭空间…" busy />;
  if (detail.isError)
    return (
      <PageState
        message="无法访问这个家庭，成员状态可能已经变化。"
        action={<Link to="/app">返回当前家庭</Link>}
      />
    );
  if (requiresActivation) return <PageState message="正在切换当前家庭…" busy />;
  const membership = detail.data.currentMembership;
  const canInvite = membership.role === 'OWNER' || membership.role === 'ADMIN';

  return (
    <div className={styles.familyPage}>
      <section className={styles.familyHero}>
        <div>
          <p className={styles.eyebrow}>当前家庭</p>
          <h1>{detail.data.name}</h1>
          <p>
            {membership.displayName} · {roleLabel(membership.role)}
          </p>
        </div>
        <span className={styles.familyMark}>
          <Users size={28} />
        </span>
      </section>
      {notice ? (
        <div className={styles.inlineNotice} role="status">
          {notice}
        </div>
      ) : null}
      <div className={styles.familyGrid}>
        <section className={styles.panel}>
          <PanelHeading
            icon={<Users size={20} />}
            title="家庭成员"
            subtitle="称呼与授权角色相互独立"
          />
          <MembersPanel family={detail.data} onNotice={setNotice} />
        </section>
        <section className={styles.panel}>
          <PanelHeading
            icon={<UserRoundPlus size={20} />}
            title="邀请亲友"
            subtitle={canInvite ? '单人单次使用，7 天内有效' : '仅创建者和管理员可管理邀请'}
          />
          {canInvite ? (
            <InvitationsPanel familyId={familyId} onNotice={setNotice} />
          ) : (
            <EmptyState
              icon={<Shield size={22} />}
              text="你可以查看家庭内容，但没有邀请管理权限。"
            />
          )}
        </section>
        <section className={`${styles.panel} ${styles.activityPanel}`}>
          <PanelHeading
            icon={<Sparkles size={20} />}
            title="家庭动态"
            subtitle="家庭与成员变更会在这里留下记录"
          />
          <ActivitiesPanel familyId={familyId} />
        </section>
      </div>
    </div>
  );
}

function MembersPanel({
  family,
  onNotice,
}: {
  family: FamilySummary;
  onNotice: (message?: string) => void;
}): React.JSX.Element {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  }>();
  const members = useQuery({
    queryKey: familyKeys.members(family.id),
    queryFn: () => api.listFamilyMembers(family.id),
  });
  const actorRole = family.currentMembership.role;

  async function refresh(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: familyKeys.members(family.id) }),
      queryClient.invalidateQueries({ queryKey: familyKeys.activities(family.id) }),
      queryClient.invalidateQueries({ queryKey: familyKeys.invitations(family.id) }),
      queryClient.invalidateQueries({ queryKey: familyKeys.all }),
    ]);
  }
  async function act(action: () => Promise<unknown>, success: string): Promise<void> {
    try {
      await action();
      await refresh();
      onNotice(success);
    } catch (error) {
      await refresh();
      onNotice(errorMessage(error));
    }
  }
  function canRemove(member: FamilyMember): boolean {
    if (member.isCurrentAccount || member.role === 'OWNER') return false;
    return actorRole === 'OWNER' || (actorRole === 'ADMIN' && member.role === 'MEMBER');
  }

  if (members.isPending) return <PageState message="正在加载成员…" busy compact />;
  if (members.isError) return <PageState message="成员加载失败。" compact />;
  return (
    <div className={styles.memberList}>
      {members.data.items.map((member) => (
        <article className={styles.memberRow} key={member.id}>
          <span className={styles.avatar} aria-hidden="true">
            {member.displayName.slice(0, 1)}
          </span>
          <div>
            <strong>
              {member.displayName}
              {member.isCurrentAccount ? <small>你</small> : null}
            </strong>
            <span>加入于 {new Date(member.joinedAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <span className={styles.roleBadge} data-role={member.role}>
            {roleLabel(member.role)}
          </span>
          {actorRole === 'OWNER' && !member.isCurrentAccount && member.role !== 'OWNER' ? (
            <select
              aria-label={`调整 ${member.displayName} 的角色`}
              value={member.role}
              onChange={(event) => {
                const next = event.target.value as 'ADMIN' | 'MEMBER';
                setConfirm({
                  title: '确认调整角色？',
                  message: `${member.displayName} 将变为${roleLabel(next)}。`,
                  action: () =>
                    act(
                      () => api.changeFamilyMemberRole(family.id, member.id, { role: next }),
                      '成员角色已更新。',
                    ),
                });
              }}
            >
              <option value="MEMBER">成员</option>
              <option value="ADMIN">管理员</option>
            </select>
          ) : null}
          {canRemove(member) ? (
            <button
              className={styles.dangerIcon}
              type="button"
              aria-label={`移除 ${member.displayName}`}
              onClick={() =>
                setConfirm({
                  title: '确认移除成员？',
                  message: `${member.displayName} 将立即无法访问这个家庭。`,
                  action: () =>
                    act(() => api.removeFamilyMember(family.id, member.id), '成员已移除。'),
                })
              }
            >
              <Trash2 size={17} />
            </button>
          ) : null}
        </article>
      ))}
      {actorRole !== 'OWNER' ? (
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() =>
            setConfirm({
              title: '确认退出家庭？',
              message: '退出后需要新的有效邀请口令才能重新加入。',
              action: async () => {
                try {
                  const account = await api.leaveFamily(family.id);
                  auth.setAccount(account);
                  queryClient.removeQueries({ queryKey: ['family', family.id] });
                  await queryClient.invalidateQueries({ queryKey: familyKeys.all });
                  await navigate(
                    account.activeFamilyId
                      ? `/app/families/${account.activeFamilyId}`
                      : '/app/onboarding',
                    { replace: true },
                  );
                } catch (error) {
                  onNotice(errorMessage(error));
                }
              },
            })
          }
        >
          退出这个家庭
        </button>
      ) : (
        <p className={styles.hint}>创建者不能退出家庭；所有权转移将在后续版本提供。</p>
      )}
      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(undefined)}
          onConfirm={async () => {
            setConfirm(undefined);
            await confirm.action();
          }}
        />
      ) : null}
    </div>
  );
}

function InvitationsPanel({
  familyId,
  onNotice,
}: {
  familyId: string;
  onNotice: (message?: string) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<{ token: string; expiresAt: string }>();
  const [creating, setCreating] = useState(false);
  const invitations = useQuery({
    queryKey: familyKeys.invitations(familyId),
    queryFn: () => api.listFamilyInvitations(familyId),
  });
  async function create(): Promise<void> {
    setCreating(true);
    onNotice(undefined);
    try {
      const result = await api.createFamilyInvitation(familyId);
      setCreated({ token: result.token, expiresAt: result.invitation.expiresAt });
      await queryClient.invalidateQueries({ queryKey: familyKeys.invitations(familyId) });
    } catch (error) {
      onNotice(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }
  async function copy(): Promise<void> {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      onNotice('邀请口令已复制。');
    } catch {
      onNotice('自动复制失败，请长按或选中文本手动复制。');
    }
  }
  async function revoke(id: string): Promise<void> {
    try {
      await api.revokeFamilyInvitation(familyId, id);
      await queryClient.invalidateQueries({ queryKey: familyKeys.invitations(familyId) });
      onNotice('邀请已撤销。');
    } catch (error) {
      onNotice(errorMessage(error));
    }
  }
  return (
    <div>
      <button
        className={styles.primaryButton}
        disabled={creating}
        type="button"
        onClick={() => void create()}
      >
        <Plus size={17} />
        {creating ? '正在生成…' : '生成一次性邀请'}
      </button>
      {created ? (
        <div className={styles.tokenPanel} role="status">
          <button
            className={styles.closeButton}
            type="button"
            aria-label="关闭一次性邀请口令"
            onClick={() => setCreated(undefined)}
          >
            <X size={17} />
          </button>
          <span>请现在保存，关闭后无法再次查看</span>
          <strong>{created.token}</strong>
          <button type="button" onClick={() => void copy()}>
            <Copy size={16} />
            复制口令
          </button>
          <small>有效至 {new Date(created.expiresAt).toLocaleString('zh-CN')}</small>
        </div>
      ) : null}
      <div className={styles.inviteList}>
        {invitations.isPending ? <PageState message="正在加载邀请…" busy compact /> : null}
        {invitations.isError ? <PageState message="邀请列表加载失败。" compact /> : null}
        {invitations.data?.items.map((invitation) => (
          <div key={invitation.id}>
            <div>
              <strong>{invitation.createdBy.displayName} 创建</strong>
              <span>
                {new Date(invitation.createdAt).toLocaleDateString('zh-CN')} ·{' '}
                {new Date(invitation.expiresAt).toLocaleDateString('zh-CN')} 到期
              </span>
            </div>
            <button type="button" onClick={() => void revoke(invitation.id)}>
              撤销
            </button>
          </div>
        ))}
        {invitations.data?.items.length === 0 ? (
          <p className={styles.hint}>当前没有待使用的邀请。</p>
        ) : null}
      </div>
    </div>
  );
}

function ActivitiesPanel({ familyId }: { familyId: string }): React.JSX.Element {
  const activities = useInfiniteQuery({
    queryKey: familyKeys.activities(familyId),
    queryFn: ({ pageParam }) =>
      api.listFamilyActivities(familyId, {
        limit: 20,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (lastPage: FamilyActivityPage) => lastPage.nextCursor ?? undefined,
  });
  if (activities.isPending) return <PageState message="正在加载动态…" busy compact />;
  if (activities.isError) return <PageState message="家庭动态加载失败。" compact />;
  const items = activities.data.pages.flatMap((page) => page.items);
  if (!items.length) return <EmptyState icon={<Sparkles size={22} />} text="家庭动态还是空的。" />;
  return (
    <div className={styles.activityList}>
      {items.map((item) => {
        if (item.visibility === 'TOMBSTONED')
          return (
            <article key={item.id}>
              <span className={styles.activityDot} />
              <div>
                <strong>{item.message}</strong>
                <time>{new Date(item.occurredAt).toLocaleString('zh-CN')}</time>
              </div>
            </article>
          );
        const summary = item.summary as Record<string, unknown>;
        const text =
          item.type === 'FAMILY_CREATED'
            ? `创建了家庭「${String(summary.familyName)}」`
            : item.type === 'MEMBER_JOINED'
              ? `${String(summary.displayName)}加入了家庭`
              : item.type === 'MEMBER_ROLE_CHANGED'
                ? `${String(summary.displayName)}的角色更新为${roleLabel(String(summary.toRole) as Role)}`
                : item.type === 'MEMBER_LEFT'
                  ? `${String(summary.displayName)}离开了家庭`
                  : '记录了一条家庭动态';
        return (
          <article key={item.id}>
            <span className={styles.activityDot} />
            <div>
              <strong>
                {item.actor.displayName} · {text}
              </strong>
              <time>{new Date(item.occurredAt).toLocaleString('zh-CN')}</time>
            </div>
          </article>
        );
      })}
      {activities.hasNextPage ? (
        <button
          className={styles.secondaryButton}
          disabled={activities.isFetchingNextPage}
          type="button"
          onClick={() => void activities.fetchNextPage()}
        >
          {activities.isFetchingNextPage ? '正在加载…' : '加载更多'}
        </button>
      ) : (
        <p className={styles.endText}>已显示全部动态</p>
      )}
      {activities.isFetchNextPageError ? (
        <p className={styles.errorText} role="alert">
          加载更多失败，请重试。
        </p>
      ) : null}
    </div>
  );
}

export function ComingSoonPage({
  title,
  icon,
}: {
  title: string;
  icon: 'timeline' | 'gallery' | 'milestone' | 'growth';
}): React.JSX.Element {
  const Icon =
    icon === 'gallery'
      ? Camera
      : icon === 'growth'
        ? BarChart3
        : icon === 'milestone'
          ? Sparkles
          : Clock3;
  return (
    <section className={styles.comingSoon}>
      <span>
        <Icon size={32} />
      </span>
      <p className={styles.eyebrow}>正在准备</p>
      <h1>{title}</h1>
      <p>这个模块尚未开放。我们不会用虚构的照片、宝宝资料或成长数据填充页面。</p>
      <Link to="/app">返回家庭空间</Link>
    </section>
  );
}

function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}): React.JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      previousFocus?.focus();
    };
  }, [onCancel]);
  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div>
          <button
            ref={cancelRef}
            className={styles.secondaryButton}
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button className={styles.dangerButton} type="button" onClick={() => void onConfirm()}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}): React.JSX.Element {
  return (
    <header className={styles.panelHeading}>
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }): React.JSX.Element {
  return (
    <div className={styles.emptyState}>
      {icon}
      <p>{text}</p>
    </div>
  );
}
function PageState({
  message,
  busy = false,
  compact = false,
  action,
}: {
  message: string;
  busy?: boolean;
  compact?: boolean;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={`${styles.pageState} ${compact ? styles.compactState : ''}`}
      aria-live="polite"
      aria-busy={busy}
    >
      {busy ? <span className={styles.spinner} /> : null}
      <p>{message}</p>
      {action}
    </div>
  );
}
function FormError({ message }: { message?: string | undefined }): React.JSX.Element | null {
  const id = useId();
  return message ? (
    <p id={id} className={styles.formError} role="alert" tabIndex={-1}>
      {message}
    </p>
  ) : null;
}
function FieldError({ message }: { message?: string | undefined }): React.JSX.Element | null {
  return message ? <span className={styles.fieldError}>{message}</span> : null;
}
