import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from './AdminPages.module.css';
import { userFacingError } from './user-facing-error';

export function AdminDialog({
  title,
  busy = false,
  onClose,
  children,
}: {
  title: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="关闭弹窗" disabled={busy} onClick={onClose}>
          <X aria-hidden="true" size={19} />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function AdminDataState({ error, retry }: { error?: unknown; retry: () => void }) {
  return (
    <div className={styles.empty}>
      {error ? (
        <>
          <p role="alert">{userFacingError(error, '加载失败，请重试。')}</p>
          <button className={styles.secondary} type="button" onClick={retry}>
            重试
          </button>
        </>
      ) : (
        <p role="status">加载中…</p>
      )}
    </div>
  );
}

export function AdminBadge({ positive, children }: { positive: boolean; children: ReactNode }) {
  return <span className={positive ? styles.positive : styles.neutral}>{children}</span>;
}

export function AdminTable({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: readonly string[];
  rows: { id: string; cells: ReactNode[] }[];
}) {
  return (
    <table role="table" aria-label={label} className={styles.table}>
      <thead role="rowgroup">
        <tr role="row">
          {columns.map((column) => (
            <th role="columnheader" key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map(({ id, cells }) => (
          <tr role="row" key={id}>
            {cells.map((cell, index) => (
              <td role="cell" key={columns[index]}>
                <span aria-hidden="true" className={styles.cellLabel}>
                  {columns[index]}
                </span>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const pageSize = 20;

export function AdminList<T>({
  searchLabel,
  statusOptions,
  items,
  matches,
  empty,
  render,
}: {
  searchLabel: string;
  statusOptions: { value: string; label: string }[];
  items: T[];
  matches: (item: T, query: string, status: string) => boolean;
  empty: string;
  render: (items: T[]) => ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const rawStatus = params.get('status') ?? '';
  const status = statusOptions.some((option) => option.value === rawStatus) ? rawStatus : '';
  const search = query.trim().normalize('NFC').toLowerCase();
  const filtered = items.filter((item) => matches(item, search, status));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage)
    ? Math.min(pages, Math.max(1, requestedPage))
    : 1;

  function updateFilter(key: string, value: string, replace: boolean) {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace, preventScrollReset: true });
  }

  function pageLink(target: number) {
    const next = new URLSearchParams(params);
    if (target === 1) next.delete('page');
    else next.set('page', String(target));
    return { search: next.toString() };
  }

  return (
    <section className={styles.panel}>
      <div className={styles.filters}>
        <label>
          <span>{searchLabel}</span>
          <span className={styles.search}>
            <Search aria-hidden="true" size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => updateFilter('q', event.target.value, true)}
            />
          </span>
        </label>
        <label>
          <span>状态</span>
          <select
            value={status}
            onChange={(event) => updateFilter('status', event.target.value, false)}
          >
            <option value="">全部状态</option>
            {statusOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filtered.length > 0 ? (
        render(filtered.slice((page - 1) * pageSize, page * pageSize))
      ) : (
        <p className={styles.empty} role="status">
          {search || status ? '没有符合条件的记录。' : empty}
        </p>
      )}
      <footer className={styles.pagination}>
        <span>共 {filtered.length} 条</span>
        <nav aria-label="分页">
          {page > 1 ? (
            <Link to={pageLink(page - 1)} preventScrollReset aria-label="上一页">
              <ChevronLeft size={18} aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" disabled aria-label="上一页">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          )}
          <span>
            第 {page} / {pages} 页
          </span>
          {page < pages ? (
            <Link to={pageLink(page + 1)} preventScrollReset aria-label="下一页">
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" disabled aria-label="下一页">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )}
        </nav>
      </footer>
    </section>
  );
}
