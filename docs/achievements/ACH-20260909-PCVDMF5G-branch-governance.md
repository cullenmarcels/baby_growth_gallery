---
id: ACH-20260909-PCVDMF5G
type: achievement
title: "五层分支治理与目标隔离晋升保护：完成归档"
status: archived
created_at: 2026-09-10T09:56:49+08:00
updated_at: 2026-09-10T09:56:49+08:00
related_ids: [PLAN-20260909-PCVDMF5G, PLAN-20260909-PCVDMF5G-EXEC, PLAN-20260909-PCVDMF5G-REVIEW, PLAN-20260909-PCVDMF5G-REGRESSION, PLAN-20260909-PCVDMF5G-ACCEPTANCE, SPEC-20260909-ASMC5N7Z, RULESET-BRANCH-GOVERNANCE, RULESET-GIT-COLLABORATION, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260909-PCVDMF5G
confirmed_by: user
confirmed_at: 2026-09-10T09:56:49+08:00
archived_at: 2026-09-10T09:56:49+08:00
confirmation_record: "PR #16 已合并，验收通过并归档"
repository_mode: git_remote
reviewed_commit: 113102a23f4ddafb7fbc056bf7585a22793c92c1
reviewed_scope_digest: B950396F4AFEAEB7CD1F934B8BF84494944E957635664911F71388EA6221A13E
accepted_commit: 5d573665f1b3c97d4654ae0bb2e2bd18a7aee26d
accepted_scope_digest: 42404B8635F421B55D31816B6794807DB36EC3AED326D554832A65AEFF1A09AA
integrated_commit: 19590f9db9bc55c85e9beb3608bdaec684a6a8a3
integrated_scope_digest: 42404B8635F421B55D31816B6794807DB36EC3AED326D554832A65AEFF1A09AA
scope_digest_version: 2
ci_status: configured_scope_passed
platform_scope: windows11-github-actions
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/16
---

# `ACH-20260909-PCVDMF5G` — 五层分支治理

## 归档摘要

- 对应 Plan：[`PLAN-20260909-PCVDMF5G`](../plans/PLAN-20260909-PCVDMF5G/plan.md)。
- 最终状态：`archived`。
- 最终 Pull Request：[#16](https://github.com/cullenmarcels/baby_growth_gallery/pull/16)，由用户在 GitHub 合并。
- Review：[`passed`](../plans/PLAN-20260909-PCVDMF5G/review-report.md)。
- 候选与集成 Regression：[`passed`](../plans/PLAN-20260909-PCVDMF5G/regression-report.md)。
- 人工确认：用户于 `2026-09-10T09:56:49+08:00` 明确确认 PR #16 已合并、验收通过并授权归档。
- Accepted 与 integrated v2 scope digest 相同，merge commit 没有改变验收内容。

## 已确认目标与边界

建立并强制执行：

```text
feature/* → develop → release → master → main
```

- `main` 保存最终稳定基线，只通过 PR 从 `master` 更新。
- `master` 保存人工确认的已发布版本，只通过 PR 从 `release` 更新。
- `release` 保存待发布测试候选，只通过 PR 从 `develop` 更新。
- `develop` 保存开发阶段整体代码，允许普通直接提交或 `feature/*` PR。
- `feature/*` 是主要功能开发分支，从 `develop` 创建并回归 `develop`。

本阶段不实现业务功能、完整应用 CI、部署 Environment 或产品版本发布；治理 bootstrap 不创建语义化 Tag。

## 实际交付

### 长期分支与保护

| 分支 | Ruleset ID | 保护 |
| --- | ---: | --- |
| `develop` | `22629637` | active、无 bypass、禁止删除和 non-fast-forward，允许普通 push/PR。 |
| `release` | `22709519` | active、PR-only、0 审批、解决对话、merge-only、`branch-flow-release`、禁止删除/强推。 |
| `master` | `22709517` | active、PR-only、0 审批、解决对话、merge-only、`branch-flow-master`、禁止删除/强推。 |
| `main` | `22709516` | active、PR-only、0 审批、解决对话、merge-only、`branch-flow-main`、禁止删除/强推。 |

三个稳定/发布 Ruleset 的 bypass actor 均为空，管理员也受规则约束。当前只有一个直接协作者，审批数为 0；增加第二位 write 协作者后必须以新规则版本升级为至少 1 个非作者批准。

### 可信流向检查

- GitHub Actions 使用 `pull_request_target`，只 checkout PR base SHA。
- 权限只有 `contents: read`，不 checkout 或执行不受信任的 PR head。
- `actions/checkout` 固定到精确 commit `d23441a48e516b6c34aea4fa41551a30e30af803`。
- base/head 映射由 `hooks/validate-branch-flow.mjs` 确定性验证。
- 检查上下文按目标隔离为 `branch-flow-develop/release/master/main`，相同 head SHA 不能跨目标复用成功状态。
- required check 的 strict 为 false，使单向 merge-commit 晋升可以跨多个发布周期重复运行；来源校验和 required check 仍然强制。

### 证据摘要完整性

- 修复 PowerShell `TrimStart('./')` 把 `.github` 误变成 `github` 的问题。
- scope digest 显式版本化：历史归档 Plan 默认使用 v1，当前及后续点号路径安全场景使用 v2。
- v2 只移除精确 `./` 前缀，`.github` 被正确计入 owned scope。
- 新增 Node/PowerShell 回归测试，保证点号路径不与无点路径混淆，并保证 `.github` digest 非空。
- confirmed `plan.md` 在候选前恢复为初次确认的冻结正文；实际实现偏差保存在可变证据文件中。

## 验证与晋升证据

### 真实远端正负探针

- 合法 feature → develop、develop → release、release → master、master → main 分别通过对应检查。
- PR #9 只由 `branch-flow-release` 放行并合并。
- PR #10 只由 `branch-flow-master` 放行并合并。
- PR #11 只由 `branch-flow-main` 放行；因不是产品发布，验证后关闭未合并。
- 独立 SHA 的非法 PR #12 `feature/* → release` 只产生 `branch-flow-release=FAILURE`，GitHub 显示 `BLOCKED`。
- 所有 probe PR 均已关闭或按计划合并，临时 probe feature refs 已删除。

### 最终证据晋升

```text
feature/branch-governance-evidence
  → PR #13 → develop
  → PR #14 → release
  → PR #15 → master
  → PR #16 → main
```

- PR #13、#14、#15、#16 分别通过 `branch-flow-develop`、`branch-flow-release`、`branch-flow-master`、`branch-flow-main`。
- 全部晋升使用普通 merge commit，没有 force push、rebase 或直接更新稳定/发布分支。
- PR #16 Head `5d573665f1b3c97d4654ae0bb2e2bd18a7aee26d` 是 `origin/main@19590f9db9bc55c85e9beb3608bdaec684a6a8a3` 的祖先。
- 二者 Git tree 同为 `f728834b74b182487de555f3d46a1db50ea36ee6`。

## Review、Regression 与版本绑定

- Review 候选：`113102a23f4ddafb7fbc056bf7585a22793c92c1`；v2 reviewed digest：`B950396F4AFEAEB7CD1F934B8BF84494944E957635664911F71388EA6221A13E`。
- 用户验收 PR Head：`5d573665f1b3c97d4654ae0bb2e2bd18a7aee26d`；v2 accepted digest：`42404B8635F421B55D31816B6794807DB36EC3AED326D554832A65AEFF1A09AA`。
- GitHub merge commit：`19590f9db9bc55c85e9beb3608bdaec684a6a8a3`；v2 integrated digest：`42404B8635F421B55D31816B6794807DB36EC3AED326D554832A65AEFF1A09AA`。
- 集成 `pnpm validate` 通过：ESLint、Prettier、TypeScript、API 8/8、Web 3/3、治理 Node/PowerShell 5/5、三个 workspace build、项目知识库和历史摘要校验。
- 四个 active Ruleset 集成后回读无漂移，开放 probe PR 和临时 probe refs 均为零。

## 已修复问题与保留边界

- 修复通用 status context 的跨目标复用风险，改为目标隔离 context。
- 修复 strict status policy 与单向 merge-commit 晋升的第二周期死锁风险。
- 修复 `.github` 被 scope digest 漏算及点号路径重叠误判风险。
- Git HTTPS 曾多次被网络重置；写入降级使用 GitHub Git Data API，所有远端候选 tree 均与本地验证 tree 比对一致，后续 fetch 已恢复并完成集成验证。
- 完整应用 CI 仍未配置，符合 Plan 非目标；当前只把已配置且通过的 Branch Flow Actions 标记为通过。
- 未执行可能意外改变生产 ref 的 deletion/force/direct-push 破坏性探针；active Ruleset、无 bypass API 和非破坏性 PR 探针构成验证证据。
- UI、响应式、业务 API 和数据没有变化，因此相应回归为 NOT_APPLICABLE。

## 关联证据

- Spec：[`SPEC-20260909-ASMC5N7Z`](../specs/SPEC-20260909-ASMC5N7Z-branch-governance/spec.md)。
- Plan：[计划正文](../plans/PLAN-20260909-PCVDMF5G/plan.md)。
- Execution：[执行记录](../plans/PLAN-20260909-PCVDMF5G/execution-log.md)。
- Review：[Review Report](../plans/PLAN-20260909-PCVDMF5G/review-report.md)。
- Regression：[Regression Report](../plans/PLAN-20260909-PCVDMF5G/regression-report.md)。
- Acceptance：[Acceptance Record](../plans/PLAN-20260909-PCVDMF5G/acceptance-record.md)。

## 人工确认与不可变状态

- 确认主体：用户。
- 原始确认语义：“PR #16 已合并，验收通过并归档”。
- 确认时间：`2026-09-10T09:56:49+08:00`。
- 归档时间：`2026-09-10T09:56:49+08:00`。
- 最终状态：`archived`。

本 Achievement 及对应 Plan 包从归档提交进入 `origin/main` 起永久只读。后续业务开发、CI、规则升级或保护调整必须创建新的 Plan，不得改写本归档。
