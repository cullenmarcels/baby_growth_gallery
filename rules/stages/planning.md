---
ruleset_id: STAGE-PLANNING
title: "规划阶段菜单"
version: 2
status: active
health: healthy
scope: project-planning
stages: [planning]
effective_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T11:34:45+08:00
source_refs: [rules/README.md, docs/README.md]
related_plan_ids: [PLAN-20260907-001, PLAN-20260908-001]
related_achievement_ids: [ACH-20260907-001, ACH-20260908-001]
supersedes_version: 1
---

# Planning — 规划阶段菜单

## 目标

把已核对事实转换为不需要实施者再次决策的计划，并固定 Design、Spec 和 Rules 版本。

## 进入条件

- Exploration 已明确现状、范围、冲突和未知项。
- 用户需要变更、设计、实现或正式执行方案。

## 必读

1. [`Exploration`](./exploration.md) 的结论和 [`docs/INDEX.md`](../../docs/INDEX.md)。
2. Required modules：[`RULESET-SOURCE-EVIDENCE`](../modules/source-and-evidence.md)、[`RULESET-IMPLEMENTATION-QUALITY`](../modules/implementation-quality.md)、[`RULESET-TESTING-QUALITY`](../modules/testing-quality.md)。
3. Conditional modules：所有任务先用 [`RULESET-GIT-COLLABORATION`](../modules/git-collaboration.md) 判断模式，Git 模式全文必读；UI 任务读 [`RULESET-RESPONSIVE-UI`](../modules/responsive-ui.md)；敏感数据任务读 [`RULESET-SECURITY-PRIVACY`](../modules/security-and-privacy.md)。
4. 任务关联的精确 Design、Spec 和当前 Rule 版本。

## 强制动作

- 明确目标、范围、非目标、接口或数据流、边界、失败模式和验收条件。
- 在 `applicable_rules` 固定 Ruleset ID、version 和 Rule ID。
- 新式 Plan 创建 `state.md`，固定仓库上下文、基线、集成目标与 `owned_paths`，并扫描活动 Plan 路径重叠。
- 规定 Development、Review、Regression 和人工验收所需证据。
- 用户确认的 Rule 候选必须纳入当前 Plan 或修订 Plan。
- 影响冻结目标、范围、契约或验收条件时创建新 Plan，不改写原 Plan 正文。
- 不把 AI 偏好写成确认决策。

## 输出证据

- 用户明确确认后创建 `docs/plans/<PLAN-ID>/plan.md`。
- 未确认讨论稿保留在对话中，不占用 Plan ID。
- Plan 必须引用相关证据路径；没有 Design/Spec 时明确写“无”及原因。

## 退出门禁

- Plan 已决策完整并由用户明确确认。
- 所有适用 Rule、Review 项和 Regression 范围已经固定。
- 不存在未解决的高影响歧义。
- 满足后进入 [`Development`](./development.md)。
