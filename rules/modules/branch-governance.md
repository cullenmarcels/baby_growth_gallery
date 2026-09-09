---
ruleset_id: RULESET-BRANCH-GOVERNANCE
title: "分支角色、晋升与保护规则"
version: 1
status: active
health: healthy
scope: repository-branch-governance
stages: [exploration, planning, development, review, regression, acceptance]
effective_at: 2026-09-09T17:33:09+08:00
updated_at: 2026-09-09T18:02:04+08:00
source_refs: [AGENTS.md, docs/specs/SPEC-20260909-ASMC5N7Z-branch-governance/spec.md]
related_plan_ids: [PLAN-20260909-PCVDMF5G]
related_achievement_ids: []
supersedes_version: null
---

# 分支角色、晋升与保护规则

## BRANCH-001 — 五类分支职责固定

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `planning`, `development`, `review`, `regression`, `acceptance`
- Applies to: 仓库分支、PR、发布和集成任务。
- Trigger: 创建分支、选择基线、提交 PR 或描述当前版本。
- Requirement: `main` 是最终稳定基线，`master` 是人工确认的已发布版本，`release` 是待发布测试候选，`develop` 是开发整合分支，`feature/*` 是功能开发分支组；不得交换或模糊这些职责。
- Verification modes: `automatic`, `review`
- Verification: 远端分支、Plan State、PR base/head 与文档角色一致。
- Exceptions: 只有用户明确确认的新 Ruleset 版本可以改变角色。
- Source: 用户于 2026-09-09 确认的五类分支模型。

## BRANCH-002 — 晋升链固定

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`, `regression`, `acceptance`
- Applies to: 向长期分支合并的所有变更。
- Trigger: 创建或合并目标为 `develop`、`release`、`master`、`main` 的 PR。
- Requirement: 正常流向只能是 `feature/* → develop → release → master → main`；`develop` 接受 `feature/*`，`release` 只接受 `develop`，`master` 只接受 `release`，`main` 只接受 `master`。
- Verification modes: `automatic`, `review`
- Verification: `branch-flow` 检查对 PR base/head 执行精确映射，错误流向返回失败。
- Exceptions: 仅限本 Ruleset 首次建立且保护规则尚未启用时的单次 bootstrap PR，基线和例外必须固定在对应 Plan。
- Source: 用户确认的分支关系。

## BRANCH-003 — 稳定与发布分支必须 PR-only

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`, `acceptance`
- Applies to: `main`、`master`、`release`。
- Trigger: 更新、删除或改写受保护分支。
- Requirement: 三个分支只允许通过 PR 更新；规则适用于管理员，不配置绕过主体，并禁止 force push 和删除。
- Verification modes: `automatic`, `review`
- Verification: GitHub Ruleset API 返回 active、目标分支和规则参数与 Spec 一致；直接 push、force push 和删除负向探针被拒绝。
- Exceptions: 无；紧急变更也必须沿晋升链创建 PR。
- Source: 用户确认的“不能直接提交，仅靠 PR merged”。

## BRANCH-004 — 单人阶段不要求外部批准

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `review`, `acceptance`
- Applies to: 当前只有一个直接协作者的仓库。
- Trigger: 配置 `main`、`master`、`release` 的 PR 规则。
- Requirement: 必须要求 PR 和解决全部 Review 对话，但 required approving review count 固定为 0，避免 PR 作者无法批准自己的 PR 而锁死仓库。
- Verification modes: `automatic`, `review`, `human`
- Verification: 协作者清单只有单人时，Ruleset 的 approval count 为 0 且 conversation resolution 为 true。
- Exceptions: 增加第二位具有写权限的协作者并经用户确认后，创建新 Ruleset 版本改为至少 1 名非作者批准。
- Source: 用户确认采用 AI 推荐的单人仓库审批方案。

## BRANCH-005 — develop 允许直接提交但禁止破坏历史

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: `develop`。
- Trigger: 更新或管理开发整合分支。
- Requirement: `develop` 允许正常直接 push 和 PR merge，但禁止 force push 和删除；不得为允许直接提交而关闭历史保护。
- Verification modes: `automatic`, `review`
- Verification: GitHub Ruleset 不要求 PR，但包含 deletion 与 non-fast-forward 限制；普通 fast-forward push 探针可用。
- Exceptions: 无。
- Source: 用户确认的 develop 行为与安全补充方案。

## BRANCH-006 — feature 分支从 develop 建立并回归 develop

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: `feature/*` 功能开发分支。
- Trigger: 创建功能分支或完成一个功能。
- Requirement: 功能分支命名为 `feature/<kebab-case-topic>`，从新鲜 `develop` 创建，完成后直接 merge 或通过 PR 回到 `develop`；不得直接进入 `release`、`master` 或 `main`。
- Verification modes: `automatic`, `review`
- Verification: preflight、merge-base 和 `branch-flow` 检查名称、基线与目标。
- Exceptions: 本 Ruleset 的 bootstrap 工作分支 `feature/branch-governance` 从保护启用前的 `main` 创建，并只用于建立本规则；启用后例外永久失效。
- Source: 用户确认的 feature 分支组和 bootstrap 方案。

## BRANCH-007 — 分支流向必须由可信检查强制

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`, `regression`, `acceptance`
- Applies to: 目标为四个长期分支的 PR。
- Trigger: PR opened、synchronize、reopened、edited 或 ready for review。
- Requirement: `branch-flow` 必须从受信任的 base revision 执行，只读 PR 元数据，不执行不受信任的 head 代码；检查上下文必须按目标分支隔离为 `branch-flow-<base>`，并在保护启用后分别成为 `main`、`master`、`release` 的 required status check，禁止不同目标 PR 复用同一提交上的成功结果。
- Verification modes: `automatic`, `review`, `regression`
- Verification: 工作流使用最小权限、固定 Action commit、base SHA checkout；Ruleset 对每个受保护目标绑定对应检查名；正负矩阵和真实测试 PR 证明流向检查有效且上下文不跨目标复用。
- Exceptions: bootstrap PR 在工作流和保护规则进入默认分支前无法成为 required check，必须在 Plan 中如实记录。
- Source: 用户确认使用自动检查强制分支关系。

## BRANCH-008 — 合并历史保留晋升边界

- Level: `SHOULD`
- Status: `active`
- Stages: `development`, `review`, `acceptance`
- Applies to: 长期分支之间的晋升 PR。
- Trigger: 合并 `develop → release`、`release → master`、`master → main`。
- Requirement: 长期分支晋升使用普通 merge commit；`feature/* → develop` 可按 PR 粒度选择 squash 或普通 merge。
- Verification modes: `review`
- Verification: PR 合并方式和 Git 图能够重建每次晋升边界。
- Exceptions: 用户针对具体发布明确选择其他方式并记录影响。
- Source: 用户确认的五层分支实施方案。

## BRANCH-009 — main 发布点使用不可变 Tag

- Level: `SHOULD`
- Status: `active`
- Stages: `acceptance`
- Applies to: 完成 `master → main` 的正式发布。
- Trigger: 用户确认一个发布版本已经进入 `main`。
- Requirement: 在对应 `main` commit 创建语义化版本 Tag，并让 GitHub Release 与该 Tag 绑定；部署引用 Tag 或精确 commit，不引用浮动状态作为不可变版本。
- Verification modes: `review`, `human`
- Verification: GitHub Tag、Release 和 `main` commit 相互一致。
- Exceptions: 尚未形成产品发布的治理或基础设施变更可以明确记为 NOT_APPLICABLE。
- Source: 用户确认的发布标记方案。

## BRANCH-010 — 保护规则必须可审计和可复建

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`, `regression`, `acceptance`
- Applies to: GitHub Ruleset 和分支配置。
- Trigger: 创建、更新或验证远端分支治理。
- Requirement: Spec、Plan 和 Execution Log 记录目标分支、规则参数、基线、API 结果和已知限制；不得只依赖网页界面中的不可追踪设置。
- Verification modes: `automatic`, `review`
- Verification: GitHub API 实际配置与版本化文档逐字段核对，验证结果进入 Review/Regression。
- Exceptions: 凭据和令牌只验证权限，不写入文档或普通输出。
- Source: 用户确认执行分支治理及项目证据链要求。
