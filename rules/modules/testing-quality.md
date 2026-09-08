---
ruleset_id: RULESET-TESTING-QUALITY
title: "测试、Review 与回归质量规则"
version: 2
status: active
health: healthy
scope: validation
stages: [planning, review, regression, acceptance]
effective_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T11:34:45+08:00
source_refs: [AGENTS.md, rules/README.md, docs/README.md]
related_plan_ids: [PLAN-20260907-001, PLAN-20260908-001]
related_achievement_ids: [ACH-20260907-001, ACH-20260908-001]
supersedes_version: 1
---

# 测试、Review 与回归质量规则

## TEST-001 — MUST Rule 必须可验证

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `review`
- Applies to: 所有 active MUST Rule。
- Trigger: 新建、修改或使用 Rule。
- Requirement: 至少定义 automatic、review、regression 或 human 中一种验证模式及具体检查方法。
- Verification modes: `automatic`, `review`
- Verification: `hooks/validate-rules.ps1` 和 Review 同时检查。
- Exceptions: 无验证方法的内容只能保留为候选，不能 active。
- Source: 用户要求确保 Rules 有效。

## TEST-002 — Review 覆盖全部适用 Rule

- Level: `MUST`
- Status: `active`
- Stages: `review`, `acceptance`
- Applies to: 包含 `applicable_rules` 的 Plan。
- Trigger: 创建或完成 Review Report。
- Requirement: 报告逐条覆盖 Plan 固定的所有 Rule ID，并提供结果和证据。
- Verification modes: `automatic`, `review`
- Verification: 校验脚本比对 Plan Rule ID 与 Review 内容。
- Exceptions: 无。
- Source: 用户确认的规则符合性矩阵。

## TEST-003 — Regression 独立于 Review

- Level: `MUST`
- Status: `active`
- Stages: `review`, `regression`, `acceptance`
- Applies to: 新规则体系生效后的正式 Plan。
- Trigger: Review 通过。
- Requirement: 独立进入 Regression 并生成 `regression-report.md`，不得以 Review 替代。
- Verification modes: `automatic`, `review`
- Verification: Plan 包存在合法 Regression Report，状态流包含 `in_regression`。
- Exceptions: 报告可为 `not_applicable`，但文件和可核对理由仍必须存在。
- Source: 用户确认的阶段菜单闭环。

## TEST-004 — 验证结果必须结构化

- Level: `MUST`
- Status: `active`
- Stages: `review`, `regression`, `acceptance`
- Applies to: Rule 符合性和回归检查项。
- Trigger: 记录验证结论。
- Requirement: 使用 PASS、FAIL、NOT_APPLICABLE 或 UNVERIFIED，并附证据或理由。
- Verification modes: `review`
- Verification: 报告中不存在无结论或无依据的适用项。
- Exceptions: 无。
- Source: 用户确认的有效性设计。

## TEST-005 — FAIL 与 UNVERIFIED 阻止验收

- Level: `MUST`
- Status: `active`
- Stages: `review`, `regression`, `acceptance`
- Applies to: Review、Regression 和 Plan 状态变化。
- Trigger: 任一适用检查为 FAIL 或 UNVERIFIED。
- Requirement: 不得进入 `acceptance_pending`；返回 Development、修订 Plan 或标记 blocked。
- Verification modes: `automatic`, `review`
- Verification: 报告结论和 Plan 状态一致。
- Exceptions: 无。
- Source: 用户确认的阶段门禁。

## TEST-006 — 回归范围从影响推导

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `regression`
- Applies to: 所有正式 Regression。
- Trigger: 规划或执行回归。
- Requirement: 根据修改文件、依赖、接口、数据流和历史能力确定矩阵，不机械全跑或随意少跑。
- Verification modes: `review`, `regression`
- Verification: Regression Report 记录选择依据、已测和未测范围。
- Exceptions: 项目规模很小时可全量运行，但仍需记录范围。
- Source: 用户确认的独立回归设计。

## TEST-007 — 优先使用项目已有验证能力

- Level: `SHOULD`
- Status: `active`
- Stages: `planning`, `review`, `regression`
- Applies to: 测试工具和命令选择。
- Trigger: 项目已有测试、构建、类型或 Lint 配置。
- Requirement: 优先复用现有能力；不得仅为单次检查无依据引入新框架。
- Verification modes: `review`
- Verification: 新增验证依赖有 Plan 依据，或使用已有命令。
- Exceptions: 现有能力无法满足已确认验收条件且 Plan 明确批准新增工具。
- Source: 项目范围和证据有效性要求。

## TEST-008 — Git Review 与集成复验必须分离

- Level: `MUST`
- Status: `active`
- Stages: `review`, `regression`, `acceptance`
- Applies to: git_remote Plan。
- Trigger: 候选版本 Review 通过或完成目标分支集成。
- Requirement: 候选提交通过不替代 integrated_commit 的独立复验，两个结论必须分别记录。
- Verification modes: `automatic`, `review`, `regression`
- Verification: Review、Regression 和 State 中的提交与摘要字段完整且一致。
- Exceptions: non_git 模式明确记为 not_applicable。
- Source: 用户确认的合并后归档门禁。

## TEST-009 — 已配置 CI 失败阻止归档

- Level: `MUST`
- Status: `active`
- Stages: `regression`, `acceptance`
- Applies to: 已配置 CI 的 Plan。
- Trigger: 集成复验或归档。
- Requirement: CI 状态为 failed 时不得归档；not_configured 或 unavailable 必须作为真实限制保留。
- Verification modes: `automatic`, `review`
- Verification: Regression 和 Achievement 记录 CI 状态及证据引用。
- Exceptions: non_git 且没有 CI 契约时可为 not_applicable。
- Source: 用户确认的提供商中立 CI 边界。

## TEST-010 — 平台覆盖不得夸大

- Level: `MUST`
- Status: `active`
- Stages: `review`, `regression`, `acceptance`
- Applies to: 验证工具和平台声明。
- Trigger: 报告验证器可移植性或平台覆盖。
- Requirement: 只记录实际运行的平台和运行时；platform_unbound 不得写成 Windows、macOS、Linux 全部通过。
- Verification modes: `review`
- Verification: Regression 的环境矩阵与实际命令证据一致。
- Exceptions: 无。
- Source: 用户选择暂不确定开发操作系统。
