# 项目文档中央索引

> AI 快速菜单与可重建投影。先读 [`README.md`](./README.md)，再沿链接打开原始证据；不得把此文件的生成表格当作唯一事实源。

- 最后协议更新：`2026-09-08T11:34:45+08:00`
- 索引状态：`consistent`
- 当前阶段：工程基础和五层分支治理已归档；`PLAN-20260910-GK1XDGCG` 账号认证与 Redis 会话处于 Development。
- 仓库协作状态：不缓存；每次运行 [`repository-preflight.ps1`](../hooks/repository-preflight.ps1)。分支治理验收集成提交为 `origin/main@19590f9db9bc55c85e9beb3608bdaec684a6a8a3`；归档工作分支为 `feature/branch-governance-archive`。
- 归档基线：[`ARCHIVE.sha256`](./ARCHIVE.sha256)
- 生成命令：`hooks/update-indexes.ps1 -Write`；核对命令：`hooks/update-indexes.ps1 -Check`

## 当前有效 Design / Spec

| ID | 类型 | 标题 | 状态 | 替代 | 被替代 | 原始文件 |
| --- | --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN DESIGNS_SPECS -->
| `DES-20260908-ZVZKM07B` | `design` | 小福宝成长记 UI 设计基线 | `active` | `[]` | `[]` | [source](./designs/DES-20260908-ZVZKM07B-baby-growth-ui/design.md) |
| `SPEC-20260908-5BD26QCA` | `spec` | 前后端分离 Monorepo 工程基础规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260908-5BD26QCA-project-foundation/spec.md) |
| `SPEC-20260909-ASMC5N7Z` | `spec` | 五层分支治理与晋升保护规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260909-ASMC5N7Z-branch-governance/spec.md) |
| `DES-20260910-V9P4SBX8` | `design` | 账号认证与会话界面补充设计 | `active` | `[]` | `[]` | [source](./designs/DES-20260910-V9P4SBX8-auth-session-ui/design.md) |
| `SPEC-20260910-TAMMQYAH` | `spec` | 手机号认证与 Redis 会话规格 | `superseded` | `[]` | `[SPEC-20260910-VP1CDG7N]` | [source](./specs/SPEC-20260910-TAMMQYAH-auth-session/spec.md) |
| `SPEC-20260910-VP1CDG7N` | `spec` | 手机号认证与 Redis 会话规格（密码长度修订） | `active` | `[SPEC-20260910-TAMMQYAH]` | `[]` | [source](./specs/SPEC-20260910-VP1CDG7N-auth-session-password-revision/spec.md) |
| `DES-20260911-9Z3KRKCQ` | `design` | 家庭身份、成员权限与动态界面补充设计 | `active` | `[]` | `[]` | [source](./designs/DES-20260911-9Z3KRKCQ-family-identity-ui/design.md) |
| `SPEC-20260911-3YV4GCRZ` | `spec` | 家庭身份、成员权限、单次邀请与家庭动态规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260911-3YV4GCRZ-family-identity/spec.md) |
<!-- GENERATED:END DESIGNS_SPECS -->

## Plan 台账

| Plan ID | 标题 | 状态 | 仓库模式 | 基线提交 | 候选提交 | 集成提交 | Review | Regression | 验收有效性 | Achievement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN PLANS -->
| [PLAN-20260911-X27F6QNT](./plans/PLAN-20260911-X27F6QNT/plan.md) | 建立家庭身份、成员权限、单次邀请与家庭动态基础 | `in_regression` | `git_remote` | `701f26aef605ccac7c1bded89fcb0e3c5e53a54c` | `3b8b92fdcf3ed6eaa575c35c3ab2466152d0b673` | `-` | [passed](./plans/PLAN-20260911-X27F6QNT/review-report.md) | [pending](./plans/PLAN-20260911-X27F6QNT/regression-report.md) | pending | - |
| [PLAN-20260910-JBD9BWHZ](./plans/PLAN-20260910-JBD9BWHZ/plan.md) | 修订认证密码最小长度并重新形成候选 | `archived` | `git_remote` | `1b22fa7b97155dd616442e1a34f4453b2cacfc39` | `b8a36f4795c0378fe6652fc249ade83dc1c47104` | `7354720b400f098e539b65a6211756aaffa6b21e` | [passed](./plans/PLAN-20260910-JBD9BWHZ/review-report.md) | [passed](./plans/PLAN-20260910-JBD9BWHZ/regression-report.md) | confirmed 2026-09-11T09:31:53+08:00 | [ACH-20260910-JBD9BWHZ](./achievements/ACH-20260910-JBD9BWHZ-auth-session-foundation.md) |
| [PLAN-20260910-GK1XDGCG](./plans/PLAN-20260910-GK1XDGCG/plan.md) | 建立手机号认证与 Redis 服务端会话 | `superseded` | `git_remote` | `1b22fa7b97155dd616442e1a34f4453b2cacfc39` | `72e30f1f18245a6e0db18cac519ac3faf20885d2` | `-` | [passed](./plans/PLAN-20260910-GK1XDGCG/review-report.md) | [pending](./plans/PLAN-20260910-GK1XDGCG/regression-report.md) | pending | - |
| [PLAN-20260909-PCVDMF5G](./plans/PLAN-20260909-PCVDMF5G/plan.md) | 建立五层分支治理与自动晋升检查 | `archived` | `git_remote` | `3665777a29605b75358a62ac8d53d62f08adab53` | `113102a23f4ddafb7fbc056bf7585a22793c92c1` | `19590f9db9bc55c85e9beb3608bdaec684a6a8a3` | [passed](./plans/PLAN-20260909-PCVDMF5G/review-report.md) | [passed](./plans/PLAN-20260909-PCVDMF5G/regression-report.md) | confirmed 2026-09-10T09:56:49+08:00 | [ACH-20260909-PCVDMF5G](./achievements/ACH-20260909-PCVDMF5G-branch-governance.md) |
| [PLAN-20260908-KP1B7472](./plans/PLAN-20260908-KP1B7472/plan.md) | 基于 GitHub 远端建立可启动的前后端分离 Monorepo | `archived` | `git_remote` | `8814674ce2b2c7add4572430159e34aa2d92d399` | `493e318ad6ed2809e08809c98b359ed9a1a9a346` | `39d25fa93a585dac9c998175a96838d3ab8d26f0` | [passed](./plans/PLAN-20260908-KP1B7472/review-report.md) | [passed](./plans/PLAN-20260908-KP1B7472/regression-report.md) | confirmed 2026-09-09T15:39:42+08:00 | [ACH-20260908-KP1B7472](./achievements/ACH-20260908-KP1B7472-project-foundation.md) |
| [PLAN-20260908-001](./plans/PLAN-20260908-001/plan.md) | Git 多成员、多设备协作与可移植证据链 | `archived` | `legacy` | `-` | `-` | `-` | [passed](./plans/PLAN-20260908-001/review-report.md) | [passed](./plans/PLAN-20260908-001/regression-report.md) | confirmed 2026-09-08T14:57:26+08:00 | [ACH-20260908-001](./achievements/ACH-20260908-001-git-collaboration-portable-evidence.md) |
| [PLAN-20260907-001](./plans/PLAN-20260907-001/plan.md) | 建设阶段菜单与规则有效性体系 | `archived` | `legacy` | `-` | `-` | `-` | [passed](./plans/PLAN-20260907-001/review-report.md) | [passed](./plans/PLAN-20260907-001/regression-report.md) | confirmed 2026-09-07T17:18:08+08:00 | [ACH-20260907-001](./achievements/ACH-20260907-001-rules-lifecycle-system.md) |
| [PLAN-20260904-001](./plans/PLAN-20260904-001/plan.md) | 建设 docs 项目变更证据链 | `archived` | `legacy` | `-` | `-` | `-` | [passed](./plans/PLAN-20260904-001/review-report.md) | legacy_n/a | confirmed 2026-09-07T16:14:06+08:00 | [ACH-20260904-001](./achievements/ACH-20260904-001-docs-evidence-chain.md) |
<!-- GENERATED:END PLANS -->

## 替代关系

当前无 Design、Spec 或 Plan 替代关系。发生替代时必须在原始元数据中双向登记，由确定性生成器投影。

## 已人工确认的归档

| Achievement ID | Plan ID | 标题 | 确认时间 | 归档文件 |
| --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN ACHIEVEMENTS -->
| `ACH-20260910-JBD9BWHZ` | [PLAN-20260910-JBD9BWHZ](./plans/PLAN-20260910-JBD9BWHZ/plan.md) | 手机号认证与 Redis 服务端会话：完成归档 | 2026-09-11T09:31:53+08:00 | [archive](./achievements/ACH-20260910-JBD9BWHZ-auth-session-foundation.md) |
| `ACH-20260909-PCVDMF5G` | [PLAN-20260909-PCVDMF5G](./plans/PLAN-20260909-PCVDMF5G/plan.md) | 五层分支治理与目标隔离晋升保护：完成归档 | 2026-09-10T09:56:49+08:00 | [archive](./achievements/ACH-20260909-PCVDMF5G-branch-governance.md) |
| `ACH-20260908-KP1B7472` | [PLAN-20260908-KP1B7472](./plans/PLAN-20260908-KP1B7472/plan.md) | 可启动的前后端分离 Monorepo 工程基础：完成归档 | 2026-09-09T15:39:42+08:00 | [archive](./achievements/ACH-20260908-KP1B7472-project-foundation.md) |
| `ACH-20260908-001` | [PLAN-20260908-001](./plans/PLAN-20260908-001/plan.md) | Git 多成员、多设备协作与可移植证据链：完成归档 | 2026-09-08T14:57:26+08:00 | [archive](./achievements/ACH-20260908-001-git-collaboration-portable-evidence.md) |
| `ACH-20260907-001` | [PLAN-20260907-001](./plans/PLAN-20260907-001/plan.md) | 建设阶段菜单与规则有效性体系：完成归档 | 2026-09-07T17:18:08+08:00 | [archive](./achievements/ACH-20260907-001-rules-lifecycle-system.md) |
| `ACH-20260904-001` | [PLAN-20260904-001](./plans/PLAN-20260904-001/plan.md) | 建设 docs 项目变更证据链：完成归档 | 2026-09-07T16:14:06+08:00 | [archive](./achievements/ACH-20260904-001-docs-evidence-chain.md) |
<!-- GENERATED:END ACHIEVEMENTS -->

## 读取规则

- 新式 Plan 生命周期读取 `state.md`；legacy Plan 没有 State 时读取 `plan.md`。
- `repository_mode`、远端新鲜度和工作树状态属于运行时事实，只从本次 preflight 与 Plan 证据读取。
- Git Plan 的候选提交、作用范围摘要、验收有效性与集成提交必须相互核对；空值不得猜测。
- 生成区块发生合并冲突时重新运行 `-Write`，禁止手工拼接；提交前运行 `-Check`。
