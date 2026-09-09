---
ruleset_id: STAGE-DEVELOPMENT
title: "开发阶段菜单"
version: 2
status: active
health: healthy
scope: project-modification
stages: [development]
effective_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T11:34:45+08:00
source_refs: [AGENTS.md, rules/README.md, docs/README.md]
related_plan_ids: [PLAN-20260907-001, PLAN-20260908-001]
related_achievement_ids: [ACH-20260907-001, ACH-20260908-001]
supersedes_version: 1
---

# Development — 开发阶段菜单

## 目标

在确认范围和固定规则版本内完成修改，并留下可供 Review 重建事实的执行证据。

## 进入条件

- 存在用户已确认且非 blocked、superseded、cancelled、archived 的 Plan。
- Plan 已固定适用 Design、Spec、Rules 和验收条件。

## 必读

1. 当前 `plan.md`、关联 Design/Spec 和 `applicable_rules`。
2. Required modules：[`RULESET-SOURCE-EVIDENCE`](../modules/source-and-evidence.md)、[`RULESET-REPOSITORY-SAFETY`](../modules/repository-safety.md)、[`RULESET-IMPLEMENTATION-QUALITY`](../modules/implementation-quality.md)。
3. Conditional modules：[`RULESET-GIT-COLLABORATION`](../modules/git-collaboration.md) 在 Git 模式必读、non_git 条件读取；UI 任务读 [`RULESET-RESPONSIVE-UI`](../modules/responsive-ui.md)；敏感数据任务读 [`RULESET-SECURITY-PRIVACY`](../modules/security-and-privacy.md)。
4. 相关测试、配置和当前实现。

## 修改前门禁

- 再次检查用户最新消息中的长期 Rule 候选。
- 检查 Plan 状态、工作区现状和无关用户修改。
- Git 模式重新预检；dirty_overlap、stale、diverged 或 detached 未解除时不得修改。
- 将实际适用 Rule 清单写入 `execution-log.md`。
- 候选未确认、规则冲突或 Plan 已失效时不得修改。

## 强制动作

- 只修改 Plan 范围内的文件。
- 持续记录实际修改、关键决定、偏差、文件、命令和结果。
- 修改 UI 时同期处理桌面、平板、移动端和必要状态。
- 目标、范围、契约或验收条件发生实质变化时停止并创建修订 Plan。
- 不撤销无关修改，不写入敏感信息和无关产物。

## 输出证据

- `docs/plans/<PLAN-ID>/execution-log.md`。
- 新式 Plan 只更新 `state.md` 生命周期；legacy Plan 兼容更新 `plan.md` 状态。

## 退出门禁

- 计划范围已实现，执行记录完整。
- 开发期检查已运行且结果真实记录。
- 没有未说明的偏差、失败或未解决冲突。
- 满足后进入 [`Review`](./review.md)；否则继续 Development 或进入 blocked/revision 流程。
