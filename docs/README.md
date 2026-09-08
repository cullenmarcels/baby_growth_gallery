# `docs/` 项目变更证据库操作协议

> 状态：已生效。所有 AI 先读根目录 `AGENTS.md`，再读本协议和 [`INDEX.md`](./INDEX.md)；索引是导航投影，原始档案与 Plan State 才是事实证据。

## 1. 证据链与职责

```text
Design / Spec / Rules + 仓库预检
            ↓ 精确版本、基线和 owned_paths
用户确认的冻结 Plan + 可变 State
            ↓ Execution → Review → Regression
候选版本人工验收 → 集成 → 集成复验
            ↓
不可修改的 Achievement
```

- `designs/`：视觉、布局、交互状态、响应式设计及本地资产。
- `specs/`：功能、交互、数据、技术和验收规格。
- `plans/`：仅保存用户明确确认的事务包；讨论稿留在对话中。
- `achievements/`：仅保存满足模式对应门禁且经用户明确验收的完成档案。
- `INDEX.md`：确定性生成的快速菜单；不得靠日期猜测当前版本。
- `ARCHIVE.sha256`：已归档 Plan 包与 Achievement 的规范化哈希基线。

## 2. ID 规范与兼容

新档案使用 `DES|SPEC|PLAN|ACH-YYYYMMDD-XXXXXXXX`。`XXXXXXXX` 是加密安全随机源生成的 8 位大写 Crockford Base32，字符表固定为 `0123456789ABCDEFGHJKMNPQRSTVWXYZ`；日期统一按 `Asia/Shanghai`。

- 使用 [`hooks/new-document-id.ps1`](../hooks/new-document-id.ps1) 生成并扫描 `docs/` 碰撞；碰撞必须重试，禁止覆盖或复用。
- Achievement 继承对应 Plan 的日期与后缀，不再随机生成。
- 已存在 `*-YYYYMMDD-NNN` 是永久合法的 `legacy`；`PLAN-20260908-001` 是最后一个获准创建的 legacy Plan。此后新档案不得使用三位序号。
- ID 一旦分配不得重命名。中文标题放元数据，文件名主题使用简短英文 `kebab-case`。

## 3. 通用元数据与状态

正式文档至少包含 `id`、`type`、`title`、`status`、`created_at`、`updated_at`、`related_ids`、`supersedes`、`superseded_by`。时间写带偏移的 ISO 8601。

- Design/Spec：`draft`、`active`、`superseded`、`retired`。
- 新式 `plan.md`：固定为创建态 `confirmed`；生命周期只读 `state.md`。
- Plan State：`confirmed`、`in_progress`、`in_review`、`in_regression`、`acceptance_pending`、`integration_pending`、`integration_review`、`blocked`、`superseded`、`cancelled`、`archived`。
- Achievement：只能是 `archived`。
- Legacy Plan 无 `state.md` 或 `acceptance-record.md` 时按旧协议从 `plan.md` 解析，不追溯修改已归档资料。

## 4. Plan 包接口

```text
docs/plans/<PLAN-ID>/
├─ plan.md                # 用户确认后全文冻结
├─ state.md               # 生命周期和仓库上下文的机器入口
├─ execution-log.md       # 追加操作、决定、偏差、文件、命令与失败
├─ review-report.md       # 候选版本 Review
├─ regression-report.md   # 候选与集成版本 Regression
└─ acceptance-record.md   # 用户原始确认及有效性
```

`plan.md` 必须有确认依据、现状、目标、范围、非目标、精确 Design/Spec/Rules、步骤、验收条件、Review、Regression、风险和归档门槛。入库后正文与 `status: confirmed` 均冻结；目标、范围、UI 行为、数据/API 契约或验收条件变化时新建修订 Plan。

`state.md` 至少提供：

```yaml
id: <PLAN-ID>-STATE
type: plan_state
plan_id: <PLAN-ID>
status: confirmed
repository_mode: non_git
remote_name: null
integration_target: null
work_branch: null
base_commit: null
remote_freshness: not_applicable
working_tree_state: not_applicable
owned_paths: []
overlapping_plan_ids: []
reviewed_commit: null
reviewed_scope_digest: null
accepted_commit: null
accepted_scope_digest: null
integrated_commit: null
integrated_scope_digest: null
```

路径统一使用仓库相对路径。新建 Plan 前扫描所有非归档 Plan；直接或父子路径重叠时必须建立依赖、调整所有权或阻塞。

## 5. 仓库模式与生命周期

每个任务运行 [`hooks/repository-preflight.ps1`](../hooks/repository-preflight.ps1) 区分 `non_git`、`git_local`、`git_remote`。默认仅本地只读检查；显式 `-Remote` 才 fetch。无法验证写 `unverified`/`not_configured`/`unavailable`，不得伪造通过。

```text
non_git:   confirmed → in_progress → in_review → in_regression → acceptance_pending → archived
git_remote: confirmed → in_progress → in_review → in_regression → acceptance_pending
            → integration_pending → integration_review → archived
```

- `git_local` 可探查、规划；没有明确本地集成目标与限制时保持 `integration_pending`。
- `dirty_nonoverlap` 可继续但记录保护路径；`dirty_overlap`、`stale`、`diverged`、`detached` 默认阻止修改。
- Review 绑定已提交 `reviewed_commit` 和 `reviewed_scope_digest`；工作区未提交内容不能作为最终通过证据。
- 用户确认候选版本后，`acceptance-record.md` 保存原始确认语义、时间、候选提交和 `accepted_scope_digest`。在 git_remote 中这只授权验收，不授权 merge/rebase/push。
- 集成后记录目标分支的 `integrated_commit` 并复验。摘要按 `owned_paths` 中路径排序的 Git tree 条目、文件模式和 blob ID 计算 SHA-256。
- accepted 与 integrated 摘要相等且复验通过时原确认继续有效；不等时标记 `invalidated`、返回 `acceptance_pending` 并重新验收受影响范围。
- 已配置 CI 的 `failed` 阻止归档；`not_configured` 或 `unavailable` 必须显式保留为风险。

## 6. 报告与 Achievement 最低证据

- Review：范围、逐项验收、规则矩阵、问题级别与修复、测试、剩余风险、响应式与状态覆盖、最终结论；Git 模式含候选提交和摘要。
- Regression：影响范围、选择依据、候选/集成检查、设备与状态、未覆盖内容、CI 状态、风险、`passed|failed|not_applicable`。
- Acceptance Record：用户原始语义、确认主体/时间、候选提交/摘要，以及 `confirmed|invalidated`。
- Achievement：Plan 目标/范围/验收快照、实际修改、偏差、Rules、Review、Regression、Design/Spec/Plan/文件/提交、人工确认、集成证据、风险、归档时间。

普通肯定、阶段反馈或 AI 判断不是归档授权。non_git 在明确确认后归档；git_remote 只在集成提交位于已验证目标分支且复验通过后归档。每个 archived Plan 恰好一个 Achievement；其他状态不得有正式 Achievement。

## 7. 冻结、索引和不可变性

- active Design/Spec 内容变化时创建新 ID，并维护 `supersedes`/`superseded_by`；不得覆盖历史。
- Achievement、已归档 Plan 包与 Rules 历史快照永久只读。以后修复必须新建 Plan。
- 归档时将 Plan 包全部文件及 Achievement 写入 `ARCHIVE.sha256`；使用正斜杠相对路径、规范化 UTF-8/LF 内容和大写 SHA-256。
- Git 模式同时用清单和目标分支历史比较保护归档；不得通过同时重写清单静默接受历史变化。non_git 只能证明清单内部一致性，此限制必须保留为风险。
- `INDEX.md`、`rules/INDEX.md` 的生成区块由 [`hooks/update-indexes.ps1`](../hooks/update-indexes.ps1) `-Write` 更新、`-Check` 校验；合并冲突不得手拼生成区块。
- 生成顺序固定为 `created_at`、ID、类型。生成器只改边界标记内内容，不覆盖协议正文。

## 8. 每次操作的门禁

1. 读取 `AGENTS.md`、Rules 阶段菜单、本协议和中央索引。
2. 运行仓库预检，定位精确 Design/Spec/Rules/Plan；找不到写“未定义”。
3. 修改前核对 Rule 候选、Plan 状态、基线、owned_paths、重叠和已有修改。
4. 执行后追加日志，完成 Review 与独立 Regression；FAIL/UNVERIFIED 不得进入验收。
5. 运行 `hooks/validate-project.ps1 -Check`，检查 UTF-8、ID、状态、链接、索引、归档哈希、规则引用和 `AGENTS.md` 行数。
6. 只有满足模式对应门禁和明确人工确认后，才原子生成 Achievement、更新 State/legacy Plan、清单与索引。

UI 相关任务还必须覆盖桌面、平板、移动端，以及正常、空、加载、错误和必要边界状态。自动化未配置或未运行不是通过。
