import type { IssuedPassword, ManagedAccount } from '@baby-growth-gallery/api-client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, House, Menu, Plus, Shield, Users } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { AdminBadge, AdminDataState, AdminDialog, AdminList, AdminTable } from './AdminComponents';
import { useAuth } from './AuthContext';
import { ConfirmDialog } from './FamilyApp';
import { SiteFamilyMembers } from './ManagementPages';
import { useManagementActions } from './use-management-actions';
import { api } from './api';
import styles from './AdminPages.module.css';
import { isUsername } from './username';
import { userFacingError } from './user-facing-error';

const membersPath = '/admin/members';
const familiesPath = '/admin/families';
const accountStatuses = [
  { value: 'ACTIVE', label: '已启用' },
  { value: 'DISABLED', label: '已停用' },
];
const familyStatuses = [
  { value: 'open', label: '已开放' },
  { value: 'pending', label: '待开放' },
];

function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className={styles.brand}>
        <Shield aria-hidden="true" size={21} />
        超管后台
      </div>
      <nav className={styles.navigation} aria-label="后台导航">
        <NavLink to={membersPath} onClick={onNavigate}>
          <Users aria-hidden="true" size={18} />
          成员管理
        </NavLink>
        <NavLink to={familiesPath} onClick={onNavigate}>
          <House aria-hidden="true" size={18} />
          家庭管理
        </NavLink>
      </nav>
    </>
  );
}

export function AdminLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const accountMenuButton = useRef<HTMLButtonElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [navigation, setNavigation] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();

  async function logout() {
    setLogoutError(undefined);
    try {
      await api.logout();
      auth.setAccount(null);
      await navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(userFacingError(error));
    }
  }

  return (
    <div className={styles.layout}>
      <ScrollRestoration
        getKey={(location) =>
          location.pathname === membersPath || location.pathname === familiesPath
            ? location.pathname + location.search
            : location.key
        }
      />
      <aside className={styles.sidebar}>
        <AdminNavigation />
      </aside>
      {navigation ? (
        <AdminDialog title="后台导航" onClose={() => setNavigation(false)}>
          <div className={styles.drawer}>
            <AdminNavigation onNavigate={() => setNavigation(false)} />
          </div>
        </AdminDialog>
      ) : null}
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button
              className={styles.menuToggle}
              type="button"
              aria-label="打开后台导航"
              aria-haspopup="dialog"
              onClick={() => setNavigation(true)}
            >
              <Menu aria-hidden="true" size={21} />
            </button>
            <span>{pathname.startsWith(familiesPath) ? '家庭管理' : '成员管理'}</span>
          </div>
          <div
            className={styles.accountMenu}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setAccountMenuOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && accountMenuOpen) {
                setAccountMenuOpen(false);
                accountMenuButton.current?.focus();
              }
            }}
          >
            <button
              type="button"
              ref={accountMenuButton}
              aria-label="账户菜单"
              aria-expanded={accountMenuOpen}
              className={styles.accountToggle}
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <span>{auth.account?.displayName ?? auth.account?.username}</span>
              <ChevronDown aria-hidden="true" size={15} />
            </button>
            {accountMenuOpen ? (
              <div>
                <Link to="/app">返回家庭空间</Link>
                <Link to="/change-password">修改密码</Link>
                <button type="button" onClick={() => void logout()}>
                  退出登录
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className={styles.content}>
          {logoutError ? (
            <p role="alert" className={styles.error}>
              {logoutError}
            </p>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PasswordDialog({ issued, onClose }: { issued: IssuedPassword; onClose: () => void }) {
  return (
    <AdminDialog title="临时密码" onClose={onClose}>
      <div className={styles.credential}>
        <strong>{issued.username}</strong>
        <code>{issued.temporaryPassword}</code>
        <p>
          仅显示一次。请私下交给本人，有效期至 {new Date(issued.expiresAt).toLocaleString('zh-CN')}
          。
        </p>
        <button type="button" className={styles.primary} onClick={onClose}>
          完成
        </button>
      </div>
    </AdminDialog>
  );
}

export function AdminMembersPage() {
  const actions = useManagementActions();
  const { search } = useLocation();
  const [creating, setCreating] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    run: () => Promise<void>;
  }>();
  const accounts = useQuery({
    queryKey: ['management', 'accounts'],
    queryFn: () => api.listManagedAccounts(),
    retry: false,
  });

  function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const usernameField = fields.get('username');
    const displayNameField = fields.get('displayName');
    const username = typeof usernameField === 'string' ? usernameField : '';
    const displayName = typeof displayNameField === 'string' ? displayNameField.trim() : '';
    if (!isUsername(username) || !displayName) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void actions.act(async () => {
      const issued = await api.createManagedAccount({ username, displayName });
      setCreating(false);
      return issued;
    }, '成员账号已创建。');
  }

  function confirmStatus(account: ManagedAccount) {
    const status = account.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const action = status === 'DISABLED' ? '停用' : '启用';
    setConfirm({
      title: `${action}账号`,
      message: `确定${action} ${account.username}？`,
      run: () =>
        actions.act(async () => {
          await api.setManagedAccountStatus(account.id, { status });
        }, '账号状态已更新。'),
    });
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <h1>成员管理</h1>
        <button
          className={styles.primary}
          type="button"
          disabled={actions.busy}
          onClick={() => {
            setInvalid(false);
            actions.clearFeedback();
            setCreating(true);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          新建成员
        </button>
      </header>
      {!creating && actions.error ? (
        <p role="alert" className={styles.error}>
          {actions.error}
        </p>
      ) : null}
      {actions.notice ? (
        <p role="status" className={styles.notice}>
          {actions.notice}
        </p>
      ) : null}
      {accounts.isError || !accounts.data ? (
        <AdminDataState error={accounts.error} retry={() => void accounts.refetch()} />
      ) : (
        <AdminList
          searchLabel="账户名或显示名"
          statusOptions={accountStatuses}
          items={accounts.data}
          matches={(account, query, status) =>
            (!status || account.status === status) &&
            [account.username, account.displayName ?? ''].some((value) =>
              value.normalize('NFC').toLowerCase().includes(query),
            )
          }
          empty="暂无成员。"
          render={(items) => (
            <AdminTable
              label="成员列表"
              columns={['账户名', '显示名', '账号状态', '操作']}
              rows={items.map((account) => ({
                id: account.id,
                cells: [
                  <strong>{account.username}</strong>,
                  account.displayName ?? '—',
                  <AdminBadge positive={account.status === 'ACTIVE'}>
                    {account.status === 'ACTIVE' ? '已启用' : '已停用'}
                  </AdminBadge>,
                  <div className={styles.rowActions}>
                    <Link
                      to={{ pathname: `${membersPath}/${account.id}`, search }}
                      aria-label={`查看 ${account.username} 的详情`}
                    >
                      查看详情
                    </Link>
                    <button
                      type="button"
                      disabled={actions.busy}
                      aria-label={`重置 ${account.username} 的密码`}
                      onClick={() =>
                        setConfirm({
                          title: '重置密码',
                          message: `${account.username} 的旧密码和会话将失效。`,
                          run: () =>
                            actions.act(
                              () => api.resetManagedAccount(account.id),
                              '临时密码已生成。',
                            ),
                        })
                      }
                    >
                      重置密码
                    </button>
                    <button
                      type="button"
                      disabled={actions.busy}
                      aria-label={`${account.status === 'ACTIVE' ? '停用' : '启用'} ${account.username}`}
                      onClick={() => confirmStatus(account)}
                    >
                      {account.status === 'ACTIVE' ? '停用' : '启用'}
                    </button>
                  </div>,
                ],
              }))}
            />
          )}
        />
      )}
      {creating ? (
        <AdminDialog title="新建成员" busy={actions.busy} onClose={() => setCreating(false)}>
          <form className={styles.dialogForm} onSubmit={createAccount}>
            <label>
              账户名
              <input name="username" required autoComplete="off" />
            </label>
            <label>
              显示名
              <input name="displayName" required maxLength={30} />
            </label>
            {invalid || actions.error ? (
              <p role="alert" className={styles.error}>
                {invalid ? '请填写有效账户名和显示名。' : actions.error}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                className={styles.secondary}
                type="button"
                disabled={actions.busy}
                onClick={() => setCreating(false)}
              >
                取消
              </button>
              <button className={styles.primary} type="submit" disabled={actions.busy}>
                创建成员
              </button>
            </div>
          </form>
        </AdminDialog>
      ) : null}
      {actions.issued ? (
        <PasswordDialog issued={actions.issued} onClose={actions.clearIssued} />
      ) : null}
      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(undefined)}
          onConfirm={async () => {
            setConfirm(undefined);
            await confirm.run();
          }}
        />
      ) : null}
    </>
  );
}

export function AdminMemberDetailPage() {
  const { accountId = '' } = useParams();
  const location = useLocation();
  const detail = useQuery({
    queryKey: ['management', 'account', accountId],
    queryFn: () => api.getManagedAccount(accountId),
    retry: false,
  });
  const account = detail.data;

  return (
    <>
      <Link className={styles.back} to={{ pathname: membersPath, search: location.search }}>
        <ArrowLeft size={16} aria-hidden="true" />
        返回成员列表
      </Link>
      <header className={styles.pageHeader}>
        <h1>成员详情</h1>
      </header>
      {detail.isError || !account ? (
        <AdminDataState error={detail.error} retry={() => void detail.refetch()} />
      ) : (
        <>
          <dl className={styles.details}>
            <div>
              <dt>账户名</dt>
              <dd>{account.username}</dd>
            </div>
            <div>
              <dt>显示名</dt>
              <dd>{account.displayName ?? '—'}</dd>
            </div>
            <div>
              <dt>账号状态</dt>
              <dd>
                <AdminBadge positive={account.status === 'ACTIVE'}>
                  {account.status === 'ACTIVE' ? '已启用' : '已停用'}
                </AdminBadge>
              </dd>
            </div>
          </dl>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>所属家庭</h2>
            {account.families.length > 0 ? (
              <AdminTable
                label="所属家庭"
                columns={['家庭名称', '家庭角色']}
                rows={account.families.map((family) => ({
                  id: family.id,
                  cells: [
                    <Link
                      to={`${familiesPath}/${family.id}`}
                      state={{ memberReturn: location.pathname + location.search }}
                    >
                      {family.name}
                    </Link>,
                    family.role === 'ADMIN' ? '家庭管理员' : '家庭成员',
                  ],
                }))}
              />
            ) : (
              <p className={styles.empty}>暂未加入家庭。</p>
            )}
          </section>
        </>
      )}
    </>
  );
}

export function AdminFamiliesPage() {
  const actions = useManagementActions();
  const { search } = useLocation();
  const [creating, setCreating] = useState(false);
  const families = useQuery({
    queryKey: ['management', 'families'],
    queryFn: () => api.listManagedFamilies(),
    retry: false,
  });

  function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = new FormData(event.currentTarget).get('name');
    const name = typeof field === 'string' ? field.trim() : '';
    void actions.act(async () => {
      await api.createManagedFamily({ name });
      setCreating(false);
    }, '家庭已创建，等待指派首位家管。');
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <h1>家庭管理</h1>
        <button
          className={styles.primary}
          type="button"
          disabled={actions.busy}
          onClick={() => {
            actions.clearFeedback();
            setCreating(true);
          }}
        >
          <Plus size={18} aria-hidden="true" />
          新建家庭
        </button>
      </header>
      {actions.notice ? (
        <p role="status" className={styles.notice}>
          {actions.notice}
        </p>
      ) : null}
      {families.isError || !families.data ? (
        <AdminDataState error={families.error} retry={() => void families.refetch()} />
      ) : (
        <AdminList
          searchLabel="家庭名称"
          statusOptions={familyStatuses}
          items={families.data}
          matches={(family, query, status) =>
            (!status || (family.isOpen ? 'open' : 'pending') === status) &&
            family.name.normalize('NFC').toLowerCase().includes(query)
          }
          empty="暂无家庭。"
          render={(items) => (
            <AdminTable
              label="家庭列表"
              columns={['家庭名称', '开放状态', '成员人数', '操作']}
              rows={items.map((family) => ({
                id: family.id,
                cells: [
                  <strong>{family.name}</strong>,
                  <AdminBadge positive={family.isOpen}>
                    {family.isOpen ? '已开放' : '待开放'}
                  </AdminBadge>,
                  family.memberCount,
                  <Link
                    to={{ pathname: `${familiesPath}/${family.id}`, search }}
                    aria-label={`查看 ${family.name} 的详情`}
                  >
                    查看详情
                  </Link>,
                ],
              }))}
            />
          )}
        />
      )}
      {creating ? (
        <AdminDialog title="新建家庭" busy={actions.busy} onClose={() => setCreating(false)}>
          <form className={styles.dialogForm} onSubmit={createFamily}>
            <label>
              家庭名称
              <input name="name" required maxLength={40} />
            </label>
            {actions.error ? (
              <p role="alert" className={styles.error}>
                {actions.error}
              </p>
            ) : null}
            <div className={styles.dialogActions}>
              <button
                className={styles.secondary}
                type="button"
                disabled={actions.busy}
                onClick={() => setCreating(false)}
              >
                取消
              </button>
              <button className={styles.primary} type="submit" disabled={actions.busy}>
                创建家庭
              </button>
            </div>
          </form>
        </AdminDialog>
      ) : null}
    </>
  );
}

export function AdminFamilyDetailPage() {
  const { familyId = '' } = useParams();
  const location = useLocation();
  const state: unknown = location.state;
  const { search } = location;
  const memberReturn =
    state &&
    typeof state === 'object' &&
    'memberReturn' in state &&
    typeof state.memberReturn === 'string' &&
    state.memberReturn.startsWith(`${membersPath}/`)
      ? state.memberReturn
      : undefined;

  return (
    <>
      <div className={styles.backLinks}>
        <Link className={styles.back} to={{ pathname: familiesPath, search }}>
          <ArrowLeft size={16} aria-hidden="true" />
          返回家庭列表
        </Link>
        {memberReturn ? (
          <Link className={styles.back} to={memberReturn}>
            返回成员详情
          </Link>
        ) : null}
      </div>
      <SiteFamilyMembers key={familyId} familyId={familyId} />
    </>
  );
}
