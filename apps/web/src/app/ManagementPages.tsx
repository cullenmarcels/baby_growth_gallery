import type { ManagedFamilyDetail } from '@baby-growth-gallery/api-client';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminBadge, AdminDataState, AdminTable } from './AdminComponents';
import adminStyles from './AdminPages.module.css';
import { ConfirmDialog } from './FamilyApp';
import { api } from './api';
import styles from './ManagementPages.module.css';
import { isUsername } from './username';
import { useManagementActions } from './use-management-actions';
import { userFacingError } from './user-facing-error';

type AccountInput = { username: string; displayName: string };
type Role = 'ADMIN' | 'MEMBER';

type Actions = ReturnType<typeof useManagementActions>;

function Feedback({ actions }: { actions: Actions }) {
  return (
    <>
      {actions.error ? <p role="alert">{actions.error}</p> : null}
      {actions.notice ? <p role="status">{actions.notice}</p> : null}
      {actions.issued ? (
        <section className={styles.credential} aria-label="临时密码">
          <strong>{actions.issued.username} 的临时密码</strong>
          <code>{actions.issued.temporaryPassword}</code>
          <p>
            仅显示一次。请私下交给本人，有效期至{' '}
            {new Date(actions.issued.expiresAt).toLocaleString('zh-CN')}。
          </p>
          <button type="button" onClick={actions.clearIssued}>
            关闭
          </button>
        </section>
      ) : null}
    </>
  );
}

function AccountForm({
  title,
  button,
  busy,
  roles,
  onSubmit,
}: {
  title: string;
  button: string;
  busy: boolean;
  roles?: readonly Role[];
  onSubmit: (input: AccountInput, role: Role) => Promise<void>;
}) {
  const [error, setError] = useState<string>();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const usernameField = fields.get('username');
    const displayNameField = fields.get('displayName');
    const username = typeof usernameField === 'string' ? usernameField : '';
    const displayName = typeof displayNameField === 'string' ? displayNameField.trim() : '';
    if (!isUsername(username) || !displayName) {
      setError('请填写有效账户名和显示名。');
      return;
    }
    setError(undefined);
    void onSubmit({ username, displayName }, fields.get('role') === 'ADMIN' ? 'ADMIN' : 'MEMBER');
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <h3>{title}</h3>
      <label>
        账户名
        <input name="username" required autoComplete="off" />
      </label>
      <label>
        显示名
        <input name="displayName" required maxLength={30} />
      </label>
      {roles ? (
        <label>
          家庭角色
          <select key={roles.join()} name="role" defaultValue={roles[0]}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role === 'ADMIN' ? '家庭管理员' : '家庭成员'}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={busy}>
        {button}
      </button>
    </form>
  );
}

function DataState({ error, retry }: { error?: unknown; retry: () => void }) {
  return error ? (
    <div role="alert">
      <p>{userFacingError(error, '加载失败，请重试。')}</p>
      <button type="button" onClick={retry}>
        重试
      </button>
    </div>
  ) : (
    <p role="status">加载中…</p>
  );
}

function MemberManagement({ familyId, isSiteAdmin }: { familyId: string; isSiteAdmin: boolean }) {
  const actions = useManagementActions();
  const detail = useQuery({
    queryKey: ['management', 'family', familyId],
    queryFn: () => api.getManagedFamily(familyId),
    retry: false,
    refetchOnWindowFocus: 'always',
  });
  if (detail.isError || !detail.data) {
    const State = isSiteAdmin ? AdminDataState : DataState;
    return <State error={detail.error} retry={() => void detail.refetch()} />;
  }
  return <FamilyControls family={detail.data} isSiteAdmin={isSiteAdmin} actions={actions} />;
}

export function SiteFamilyMembers({ familyId }: { familyId: string }) {
  return <MemberManagement familyId={familyId} isSiteAdmin />;
}

function FamilyControls({
  family,
  isSiteAdmin,
  actions,
}: {
  family: ManagedFamilyDetail;
  isSiteAdmin: boolean;
  actions: Actions;
}) {
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    run: () => Promise<void>;
  }>();
  const familyId = family.id;
  function memberActions(member: ManagedFamilyDetail['members'][number]) {
    return (
      <div className={isSiteAdmin ? adminStyles.rowActions : styles.actions}>
        {isSiteAdmin ? (
          <button
            type="button"
            disabled={actions.busy}
            aria-label={
              member.role === 'ADMIN' ? `撤任 ${member.displayName}` : `任命 ${member.displayName}`
            }
            onClick={() =>
              setConfirm({
                title: '调整角色',
                message: `确定调整 ${member.displayName} 的家庭角色？`,
                run: () =>
                  actions.act(
                    () =>
                      api.setManagedMemberRole(familyId, member.id, {
                        role: member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN',
                      }),
                    '角色已更新。',
                  ),
              })
            }
          >
            {member.role === 'ADMIN' ? '撤任家管' : '设为家管'}
          </button>
        ) : null}
        {member.canResetPassword ? (
          <button
            type="button"
            disabled={actions.busy}
            aria-label={`重置 ${member.displayName} 的密码`}
            onClick={() =>
              setConfirm({
                title: '重置密码',
                message: `${member.displayName} 的旧密码和会话将失效。`,
                run: () =>
                  actions.act(
                    () => api.resetManagedMember(familyId, member.id),
                    '临时密码已生成。',
                  ),
              })
            }
          >
            重置密码
          </button>
        ) : null}
        {isSiteAdmin || member.role === 'MEMBER' ? (
          <button
            type="button"
            disabled={actions.busy}
            aria-label={`移除 ${member.displayName}`}
            onClick={() =>
              setConfirm({
                title: '移除成员',
                message: `${member.displayName} 将失去这个家庭的访问权。`,
                run: () =>
                  actions.act(() => api.removeManagedMember(familyId, member.id), '成员已移除。'),
              })
            }
          >
            移除
          </button>
        ) : null}
      </div>
    );
  }

  const form = (
    <div className={styles.forms}>
      {!isSiteAdmin ? (
        <AccountForm
          title="开设家庭账号"
          button="开户入户"
          busy={actions.busy}
          onSubmit={(input) =>
            actions.act(() => api.createFamilyAccount(familyId, input), '账号已开设并加入家庭。')
          }
        />
      ) : null}
      <AccountForm
        title="添加已有账号"
        button={isSiteAdmin && !family.isOpen ? '指派家管' : '添加成员'}
        busy={actions.busy}
        {...(isSiteAdmin
          ? { roles: family.isOpen ? (['MEMBER', 'ADMIN'] as const) : (['ADMIN'] as const) }
          : {})}
        onSubmit={(input, role) =>
          actions.act(
            () => api.addManagedFamilyMember(familyId, { ...input, role }),
            '成员已加入家庭。',
          )
        }
      />
    </div>
  );
  const confirmation = confirm ? (
    <ConfirmDialog
      title={confirm.title}
      message={confirm.message}
      onCancel={() => setConfirm(undefined)}
      onConfirm={async () => {
        setConfirm(undefined);
        await confirm.run();
      }}
    />
  ) : null;

  if (isSiteAdmin) {
    return (
      <>
        <header className={adminStyles.pageHeader}>
          <h1>{family.name}</h1>
          <AdminBadge positive={family.isOpen}>{family.isOpen ? '已开放' : '待开放'}</AdminBadge>
        </header>
        <section className={adminStyles.familyForm} aria-label="家庭成员管理">
          {family.isOpen ? null : <p>等待指派首位家庭管理员。</p>}
          {actions.error ? (
            <p className={adminStyles.error} role="alert">
              {actions.error}
            </p>
          ) : null}
          {actions.notice ? (
            <p className={adminStyles.notice} role="status">
              {actions.notice}
            </p>
          ) : null}
          {form}
        </section>
        <section className={`${adminStyles.panel} ${adminStyles.familyRoster}`}>
          <h2 className={adminStyles.sectionTitle}>成员名单</h2>
          {family.members.length > 0 ? (
            <AdminTable
              label="成员名单"
              columns={['账户名', '显示名', '家庭角色', '账号状态', '操作']}
              rows={family.members.map((member) => ({
                id: member.id,
                cells: [
                  member.username,
                  member.displayName,
                  member.role === 'ADMIN' ? '家庭管理员' : '家庭成员',
                  <AdminBadge positive={member.accountStatus === 'ACTIVE'}>
                    {member.accountStatus === 'ACTIVE' ? '已启用' : '已停用'}
                  </AdminBadge>,
                  memberActions(member),
                ],
              }))}
            />
          ) : (
            <p className={adminStyles.empty}>暂无成员。</p>
          )}
        </section>
        {confirmation}
      </>
    );
  }

  return (
    <section className={styles.panel} aria-label="家庭成员管理">
      <h2>{family.name}</h2>
      {family.isOpen ? null : <p>等待指派首位家庭管理员。</p>}
      <Feedback actions={actions} />
      {form}
      <h3>成员名单</h3>
      {family.members.length === 0 ? (
        <p>暂无成员。</p>
      ) : (
        <ul className={styles.list}>
          {family.members.map((member) => (
            <li key={member.id}>
              <div className={styles.identity}>
                <strong>{member.displayName}</strong>
                <span>
                  {member.username} · {member.role === 'ADMIN' ? '家庭管理员' : '家庭成员'}
                  {member.accountStatus === 'DISABLED' ? ' · 已停用' : ''}
                </span>
              </div>
              {memberActions(member)}
            </li>
          ))}
        </ul>
      )}
      {confirmation}
    </section>
  );
}

export function FamilyManagementPage() {
  const { familyId = '' } = useParams();
  const membership = useQuery({
    queryKey: ['family', familyId, 'detail'],
    queryFn: () => api.getFamily(familyId),
    retry: false,
    refetchOnWindowFocus: 'always',
  });
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>家庭管理</h1>
        <Link to={`/app/families/${familyId}`}>返回家庭</Link>
      </header>
      {membership.isError || !membership.data ? (
        <DataState error={membership.error} retry={() => void membership.refetch()} />
      ) : membership.data.currentMembership.role === 'ADMIN' ? (
        <MemberManagement key={familyId} familyId={familyId} isSiteAdmin={false} />
      ) : (
        <p role="alert">只有本家庭的管理员可以管理成员。</p>
      )}
    </div>
  );
}
