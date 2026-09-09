# 开发阶段与当前规则菜单

> 先确定主要阶段，再打开对应菜单。Git 模式下 `RULESET-GIT-COLLABORATION` 是所有阶段必读模块；non_git 按条件读取。历史版本只从 [`archive/`](./archive/INDEX.md) 回溯。

- 最后协议更新：`2026-09-08T11:34:45+08:00`
- 索引状态：`active`
- 健康状态：`healthy`
- 当前协作模式：运行 [`repository-preflight.ps1`](../hooks/repository-preflight.ps1) 得出，不在索引中缓存设备状态。
- 关联 Plan：[`PLAN-20260908-001`](../docs/plans/PLAN-20260908-001/plan.md)
- 生成命令：`hooks/update-indexes.ps1 -Write`；核对命令：`hooks/update-indexes.ps1 -Check`

## 阶段路由

| Stage ID | Version | 当前行为 | 菜单 | 必需输入 | 主要证据输出 |
| --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN STAGES -->
| `STAGE-EXPLORATION` | `2` | Inspect facts and repository mode | [Exploration](./stages/exploration.md) | AGENTS, Docs/Rules Index, preflight | `Plan evidence and preflight` |
| `STAGE-PLANNING` | `2` | Define requirements, baseline, scope and implementation | [Planning](./stages/planning.md) | AGENTS, Docs/Rules Index, preflight | `Frozen plan.md and state.md` |
| `STAGE-DEVELOPMENT` | `2` | Modify files within owned_paths | [Development](./stages/development.md) | AGENTS, Docs/Rules Index, preflight | `state.md and execution-log.md` |
| `STAGE-REVIEW` | `2` | Review the committed candidate | [Review](./stages/review.md) | AGENTS, Docs/Rules Index, preflight | `review-report.md` |
| `STAGE-REGRESSION` | `2` | Validate candidate and integrated revisions | [Regression](./stages/regression.md) | AGENTS, Docs/Rules Index, preflight | `regression-report.md` |
| `STAGE-ACCEPTANCE` | `2` | Record acceptance, integration and archive | [Acceptance](./stages/acceptance.md) | AGENTS, Docs/Rules Index, preflight | `acceptance-record.md / Achievement` |
<!-- GENERATED:END STAGES -->

## 当前规则模块

| Ruleset ID | Version | 入口 | 适用阶段 | Status | Health | 最近验证 Plan |
| --- | --- | --- | --- | --- | --- | --- |
<!-- GENERATED:BEGIN MODULES -->
| `RULESET-GIT-COLLABORATION` | `1` | [git-collaboration.md](./modules/git-collaboration.md) | exploration, planning, development, review, regression, acceptance | `active` | `healthy` | `PLAN-20260908-001` |
| `RULESET-IMPLEMENTATION-QUALITY` | `1` | [implementation-quality.md](./modules/implementation-quality.md) | planning, development, review | `active` | `healthy` | `PLAN-20260908-001` |
| `RULESET-REPOSITORY-SAFETY` | `2` | [repository-safety.md](./modules/repository-safety.md) | exploration, development, review | `active` | `healthy` | `PLAN-20260908-001` |
| `RULESET-RESPONSIVE-UI` | `1` | [responsive-ui.md](./modules/responsive-ui.md) | planning, development, review, regression | `active` | `healthy` | `PLAN-20260907-001` |
| `RULESET-SECURITY-PRIVACY` | `1` | [security-and-privacy.md](./modules/security-and-privacy.md) | exploration, development, review, regression | `active` | `healthy` | `PLAN-20260907-001` |
| `RULESET-SOURCE-EVIDENCE` | `2` | [source-and-evidence.md](./modules/source-and-evidence.md) | exploration, planning, development, review, regression, acceptance | `active` | `healthy` | `PLAN-20260908-001` |
| `RULESET-TESTING-QUALITY` | `2` | [testing-quality.md](./modules/testing-quality.md) | planning, review, regression, acceptance | `active` | `healthy` | `PLAN-20260908-001` |
<!-- GENERATED:END MODULES -->

## 命中与读取规则

1. 所有阶段必读 `RULESET-SOURCE-EVIDENCE`；先运行本地 preflight 判断 `non_git|git_local|git_remote`。
2. Git 模式全文必读 `RULESET-GIT-COLLABORATION`；non_git 至少执行 GIT-001、GIT-010 对应检查，并按任务条件读取其余内容。
3. 阶段菜单中的 Required modules 必须读取；Conditional modules 在触发条件命中时读取。
4. Plan 固定 Ruleset version 与 Rule ID；历史版本从归档解析，不因当前版本升级而改写 Plan。
5. 完整结构、证据与仓库校验使用 [`validate-project.ps1`](../hooks/validate-project.ps1)；[`validate-rules.ps1`](../hooks/validate-rules.ps1) 保留兼容。
