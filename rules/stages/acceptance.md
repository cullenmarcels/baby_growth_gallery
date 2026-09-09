---
ruleset_id: STAGE-ACCEPTANCE
title: "人工验收与归档阶段菜单"
version: 2
status: active
health: healthy
scope: human-acceptance-and-archive
stages: [acceptance]
effective_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T11:34:45+08:00
source_refs: [rules/README.md, docs/README.md]
related_plan_ids: [PLAN-20260907-001, PLAN-20260908-001]
related_achievement_ids: [ACH-20260907-001, ACH-20260908-001]
supersedes_version: 1
---

# Acceptance — 人工验收与归档阶段菜单

## 目标

在所有机器和 AI 证据通过后等待用户实际确认，并以一次原子操作形成不可修改的 Achievement。

## 进入条件

- Plan 状态为 `acceptance_pending`。
- Review 为 `passed`。
- Regression 为 `passed` 或有合法 `not_applicable` 理由。
- 不存在阻断问题或同编号 Achievement。

## 必读

1. 当前 Plan、Execution Log、Review Report、Regression Report。
2. Plan 引用的 Design、Spec、Rules 和相关既有 Achievement。
3. Required modules：[`RULESET-SOURCE-EVIDENCE`](../modules/source-and-evidence.md)、[`RULESET-TESTING-QUALITY`](../modules/testing-quality.md)。Git 模式同时必读 [`RULESET-GIT-COLLABORATION`](../modules/git-collaboration.md)。
4. [`docs/README.md`](../../docs/README.md) 的人工验收、集成与归档门槛。

## 强制动作

- 等待用户针对具体 Plan 的明确完成或归档语义。
- Git 模式把确认原语义、候选提交和作用范围摘要写入 `acceptance-record.md`；git_remote 随后进入集成流程，不立即建 Achievement。
- 普通肯定、阶段反馈和 AI 自行判断不构成归档授权。
- 归档前确认 Review、Regression、Plan 状态和 Achievement 唯一性。
- Achievement 整合 Plan 快照、实际修改、偏差、Rules 版本、Review、Regression、人工确认和归档状态。
- 创建 Achievement、更新 Plan、Execution Log 和 Docs Index 必须在同一次归档操作中完成。

## 输出证据

- `docs/achievements/<ACH-ID>-<slug>.md`。
- Achievement 日期和序号与 Plan 一致，创建后永久只读。

## 退出门禁

- 用户未确认：保持 `acceptance_pending`，不创建 Achievement。
- 用户验收失败：返回 Development 或修订 Plan，不创建 Achievement。
- non_git 明确确认后可归档；git_remote 仅在集成提交位于已验证目标分支、摘要未改变且集成复验通过后归档，摘要变化必须重新验收。
