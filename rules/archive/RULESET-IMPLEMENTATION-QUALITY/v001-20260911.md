---
ruleset_id: RULESET-IMPLEMENTATION-QUALITY
title: "实施质量规则"
version: 1
status: active
health: healthy
scope: implementation
stages: [planning, development, review]
effective_at: 2026-09-07T16:49:15+08:00
updated_at: 2026-09-07T17:18:08+08:00
source_refs: [AGENTS.md, docs/README.md]
related_plan_ids: [PLAN-20260907-001, PLAN-20260908-001]
related_achievement_ids: [ACH-20260907-001, ACH-20260908-001]
supersedes_version: null
---

# 实施质量规则

## IMPL-001 — 使用 Plan 固定的精确依据

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: 正式项目变更。
- Trigger: 创建或执行 Plan。
- Requirement: Plan 固定并使用精确 Design ID、Spec ID、Ruleset version 和 Rule ID。
- Verification modes: `review`
- Verification: `plan.md` 的引用存在且与中央索引一致。
- Exceptions: 没有相关资料时必须明确写“无”及原因。
- Source: Docs 证据链和用户确认的 Rules 版本设计。

## IMPL-002 — 代码、配置、文档和测试同步核对

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 会影响多个项目事实载体的变更。
- Trigger: 修改代码、配置、文档或测试中的任一项。
- Requirement: 检查其余相关载体是否需要同步更新，并完成更新或记录不适用理由。
- Verification modes: `review`
- Verification: Execution Log 和 Review Report 有一致性结论。
- Exceptions: 无关联影响时可记录 NOT_APPLICABLE。
- Source: `AGENTS.md` AI 执行规则。

## IMPL-003 — 不静默改变确认范围

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: Plan 的目标、范围、UI行为、数据/API契约和验收条件。
- Trigger: 实施发现原计划需要实质调整。
- Requirement: 停止扩大修改，建立用户确认的修订 Plan，不得改写冻结正文。
- Verification modes: `review`
- Verification: 偏差与修订关系完整，不存在无依据扩张。
- Exceptions: 不改变语义的拼写和失效链接修正，仍需记录。
- Source: 已归档 Docs 冻结和修订规则。

## IMPL-004 — 执行记录必须重建实施事实

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 每个正式 Plan。
- Trigger: Plan 开始实施及状态变化。
- Requirement: 记录状态、实际修改、文件、关键决定、偏差、命令和真实结果。
- Verification modes: `review`
- Verification: Review 可仅凭 Plan 包和项目现状重建本次实施过程。
- Exceptions: 无。
- Source: Docs Execution Log 最低要求。

## IMPL-005 — 验证前不得声称完成

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 实施完成声明和阶段状态。
- Trigger: 准备结束 Development 或声称问题已解决。
- Requirement: 运行与风险相称的相关验证并记录结果；失败或未运行不得写成通过。
- Verification modes: `automatic`, `review`
- Verification: 命令输出、检查结果和状态变化相符。
- Exceptions: 工具或环境阻塞时明确报告 blocked，不得声称完成。
- Source: `AGENTS.md` 完成前核对要求。

## IMPL-006 — 避免无依据扩张

- Level: `SHOULD`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: 实现范围和架构选择。
- Trigger: 出现不属于当前目标的额外能力或重构机会。
- Requirement: 只实施当前结果需要的能力；额外建议留待新 Plan，不顺手扩大范围。
- Verification modes: `review`
- Verification: 修改清单与 Plan 范围一致，额外工作有明确授权。
- Exceptions: 完成本次修改所必需且风险可控的常规配套调整。
- Source: 用户关注最终结果和范围一致性的要求。
