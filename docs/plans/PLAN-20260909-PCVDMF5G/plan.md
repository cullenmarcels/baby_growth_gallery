---
id: PLAN-20260909-PCVDMF5G
type: plan
title: "建立五层分支治理与自动晋升检查"
status: confirmed
created_at: 2026-09-09T17:33:09+08:00
updated_at: 2026-09-09T17:33:09+08:00
related_ids: [SPEC-20260909-ASMC5N7Z, RULESET-BRANCH-GOVERNANCE]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户提出五类分支和 feature → develop → release → master → main 关系，并在 AI 给出单人 PR-only、0 审批、Ruleset 与 branch-flow 方案后明确回复‘好，开始创建执行’。"
applicable_rules:
  - ruleset_id: RULESET-BRANCH-GOVERNANCE
    version: 1
    rule_ids: [BRANCH-001, BRANCH-002, BRANCH-003, BRANCH-004, BRANCH-005, BRANCH-006, BRANCH-007, BRANCH-008, BRANCH-009, BRANCH-010]
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids: [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 1
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007, TEST-008, TEST-009, TEST-010]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 1
    rule_ids: [SAFE-001, SAFE-004]
---

# 建立五层分支治理与自动晋升检查

## 目标

建立 `feature/* → develop → release → master → main` 五层分支模型，在不锁死当前单人维护者的前提下用 GitHub Ruleset 强制 PR-only、禁止破坏历史，并用可信 `branch-flow` 检查强制来源/目标关系。

## 当前事实

- GitHub 默认分支为 `main`，基线 `9146012d2b8350c2a542701ddcdd86c13f289066`。
- 远端仅有 `main` 和已合并的 `feature/project-foundation`；后三个长期分支尚未创建。
- 当前没有 Ruleset 或 classic branch protection。
- 直接协作者只有管理员 `cullenmarcels`，GitHub Actions 已启用。
- 完整应用 CI 尚未配置，第一阶段将其明确留作后续专项。

## 范围

- 新建并生效 `RULESET-BRANCH-GOVERNANCE` v1。
- 新建 Branch Governance Spec、Plan 包和知识库索引。
- 实现可本地测试的 base/head 流向验证器。
- 添加最小权限、固定 Action commit、基分支执行的 GitHub Actions `branch-flow`。
- 添加 PR 模板和根脚本入口。
- 创建一次 bootstrap PR，将治理能力带入 `main`。
- 用户合并后从同一 `main` HEAD 创建 `develop`、`release`、`master`。
- 通过 GitHub API 创建稳定/发布和 develop 两个 Ruleset，验证实际配置。
- `branch-flow` 首次产生成功 check 后，将其配置为稳定/发布分支 required check。

## Bootstrap 例外

工作分支 `feature/branch-governance` 从 `main@9146012d2b8350c2a542701ddcdd86c13f289066` 创建，并允许一次直接 PR 到 `main`。这是保护规则尚未存在时的初始化例外；bootstrap PR 合并、长期分支创建和 Ruleset 启用后永久失效。

## owned paths

由 `state.md` 固定：`.github/**`、`AGENTS.md`、`package.json`、branch-flow hook/test、新 Ruleset、Rules/Docs Index、本 Spec 和本 Plan 包。不得修改已归档 Plan/Achievement、产品应用代码或第一阶段 Design/Spec。

## 实施步骤

1. 固定远端基线、协作者、Actions、现有分支和保护状态。
2. 创建 Spec、Ruleset、Plan、流向验证器、自动测试、工作流和 PR 模板。
3. 更新确定性索引并执行 lint、format、branch-flow tests、项目聚合校验。
4. Review 绑定提交和 owned scope digest，独立执行 Regression。
5. 推送 `feature/branch-governance` 并创建 bootstrap PR 到 `main`，等待用户合并。
6. 合并后验证 `origin/main`，从同一 HEAD 创建 `develop`、`release`、`master`。
7. 创建并核对 GitHub Rulesets，触发并要求 `branch-flow` check。
8. 记录远端正负证据、进入人工验收；用户确认后沿集成流程归档。

## 验收条件

- 五类分支职责和唯一晋升链有 active Rule、Spec、脚本和测试四层一致证据。
- 正向矩阵全部通过，错误来源/目标全部非零失败。
- `branch-flow` 不执行 PR head 代码，权限只有 `contents: read`，Action 固定精确 commit。
- `main`、`master`、`release` 只能 PR 更新、0 审批、解决对话、普通 merge、禁止 force/delete、管理员无绕过。
- `develop` 允许正常直接 push 和 PR，但禁止 force/delete。
- 四个长期分支创建自同一 bootstrap `main` commit，默认分支仍为 `main`。
- GitHub API 实际 Ruleset 与文档逐字段一致；错误流向 PR 被 required check 阻止。
- 现有 `feature/project-foundation` 未删除，已归档资料未改写。
- `pnpm validate` 和 `hooks/validate-project.ps1 -Check` 通过；不可用项如实记录。

## Review 与 Regression

- Review 覆盖全部固定 Rule、修改范围、脚本安全、工作流事件/权限、GitHub API 配置和 bootstrap 例外。
- Regression 覆盖既有 Monorepo lint/typecheck/test/build、Docs/Rules/Archive、合法/非法流向矩阵、远端分支和保护状态。
- GitHub Actions/Ruleset 未启用或未实际验证时不得写为 PASS；bootstrap 阶段可记录 pending，但不能完成 Plan。

## 非目标

- 不实现完整应用 CI、部署、GitHub Environment、产品发布或业务功能。
- 不删除已有功能分支，不新增协作者，不要求签名提交、线性历史、merge queue 或 CODEOWNERS。
- 不创建产品版本 Tag；治理 bootstrap 不是一次产品发布。

## 风险与暂停点

- bootstrap PR 必须由用户合并；合并前不能安全创建最终长期分支和启用完整保护。
- required check 只有在 GitHub 首次观察到对应 check 后才能可靠设为必需；此前保持 pending，不伪造通过。
- GitHub 网络可能出现 `github.com:443` 超时；API 可作为精确验证与非强制 ref 操作通道，但所有降级必须记录。
