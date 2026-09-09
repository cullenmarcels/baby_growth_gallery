# 项目文档中央索引

> AI 快速菜单与可重建投影。先读 [`README.md`](./README.md)，再沿链接打开原始证据；不得把此文件的生成表格当作唯一事实源。

- 最后协议更新：`2026-09-08T11:34:45+08:00`
- 索引状态：`consistent`
- 当前阶段：首版 UI Design 与工程 Spec 已生效；`PLAN-20260908-KP1B7472` 正在建立可启动的前后端工程基础。
- 仓库协作状态：不缓存；每次运行 [`repository-preflight.ps1`](../hooks/repository-preflight.ps1)。当前 Plan 基线为 `origin/main@8814674ce2b2c7add4572430159e34aa2d92d399`，工作分支为 `feature/project-foundation`。
- 归档基线：[`ARCHIVE.sha256`](./ARCHIVE.sha256)
- 生成命令：`hooks/update-indexes.ps1 -Write`；核对命令：`hooks/update-indexes.ps1 -Check`

## 当前有效 Design / Spec

| ID | 类型 | 标题 | 状态 | 替代 | 被替代 | 原始文件 |
| --- | --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN DESIGNS_SPECS -->
| `DES-20260908-ZVZKM07B` | `design` | 小福宝成长记 UI 设计基线 | `active` | `[]` | `[]` | [source](./designs/DES-20260908-ZVZKM07B-baby-growth-ui/design.md) |
| `SPEC-20260908-5BD26QCA` | `spec` | 前后端分离 Monorepo 工程基础规格 | `active` | `[]` | `[]` | [source](./specs/SPEC-20260908-5BD26QCA-project-foundation/spec.md) |
<!-- GENERATED:END DESIGNS_SPECS -->

## Plan 台账

| Plan ID | 标题 | 状态 | 仓库模式 | 基线提交 | 候选提交 | 集成提交 | Review | Regression | 验收有效性 | Achievement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN PLANS -->
| [PLAN-20260908-KP1B7472](./plans/PLAN-20260908-KP1B7472/plan.md) | 基于 GitHub 远端建立可启动的前后端分离 Monorepo | `acceptance_pending` | `git_remote` | `8814674ce2b2c7add4572430159e34aa2d92d399` | `493e318ad6ed2809e08809c98b359ed9a1a9a346` | `-` | [passed](./plans/PLAN-20260908-KP1B7472/review-report.md) | [passed](./plans/PLAN-20260908-KP1B7472/regression-report.md) | pending | - |
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
| `ACH-20260908-001` | [PLAN-20260908-001](./plans/PLAN-20260908-001/plan.md) | Git 多成员、多设备协作与可移植证据链：完成归档 | 2026-09-08T14:57:26+08:00 | [archive](./achievements/ACH-20260908-001-git-collaboration-portable-evidence.md) |
| `ACH-20260907-001` | [PLAN-20260907-001](./plans/PLAN-20260907-001/plan.md) | 建设阶段菜单与规则有效性体系：完成归档 | 2026-09-07T17:18:08+08:00 | [archive](./achievements/ACH-20260907-001-rules-lifecycle-system.md) |
| `ACH-20260904-001` | [PLAN-20260904-001](./plans/PLAN-20260904-001/plan.md) | 建设 docs 项目变更证据链：完成归档 | 2026-09-07T16:14:06+08:00 | [archive](./achievements/ACH-20260904-001-docs-evidence-chain.md) |
<!-- GENERATED:END ACHIEVEMENTS -->

## 读取规则

- 新式 Plan 生命周期读取 `state.md`；legacy Plan 没有 State 时读取 `plan.md`。
- `repository_mode`、远端新鲜度和工作树状态属于运行时事实，只从本次 preflight 与 Plan 证据读取。
- Git Plan 的候选提交、作用范围摘要、验收有效性与集成提交必须相互核对；空值不得猜测。
- 生成区块发生合并冲突时重新运行 `-Write`，禁止手工拼接；提交前运行 `-Check`。
