---
ruleset_id: RULESET-RESPONSIVE-UI
title: "响应式界面规则"
version: 1
status: active
health: healthy
scope: frontend-ui
stages: [planning, development, review, regression]
effective_at: 2026-09-07T16:49:15+08:00
updated_at: 2026-09-07T17:18:08+08:00
source_refs: [AGENTS.md]
related_plan_ids: [PLAN-20260907-001]
related_achievement_ids: [ACH-20260907-001]
supersedes_version: null
---

# 响应式界面规则

## RESP-001 — 三类终端同步考虑

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`, `regression`
- Applies to: 页面、布局、可视组件和交互。
- Trigger: 创建或修改前端 UI。
- Requirement: 桌面端、平板端和移动端必须在同一 Plan 中考虑、实现和验证。
- Verification modes: `review`, `regression`
- Verification: Plan 与报告包含三类终端的适用结论和证据。
- Exceptions: 有效 Spec 或用户最新明确指令限定单一终端。
- Source: 用户确认项目为 PC、移动端自适应网站；既有规则进一步明确平板端。

## RESP-002 — 响应式不得留作事后补丁

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: 前端 UI 实施方案。
- Trigger: 规划和实现可视功能。
- Requirement: 响应式结构与主体功能同期设计和实现，不得在桌面版完成后作为无计划补丁追加。
- Verification modes: `review`
- Verification: Plan、实现结构和 Execution Log 显示响应式范围同期处理。
- Exceptions: 用户明确批准独立响应式迁移 Plan。
- Source: `AGENTS.md` 响应式执行规则。

## RESP-003 — 覆盖必要界面状态

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`, `regression`
- Applies to: 有数据、异步或可能失败的 UI。
- Trigger: 页面或组件存在相应运行状态。
- Requirement: 考虑并实现正常、空、加载、错误和必要边界状态。
- Verification modes: `review`, `regression`
- Verification: Design/Spec、实现和报告对每个适用状态给出结果。
- Exceptions: 不适用状态必须写明可核对理由。
- Source: `AGENTS.md` 完成前核对要求。

## RESP-004 — UI Review 与 Regression 使用覆盖矩阵

- Level: `MUST`
- Status: `active`
- Stages: `review`, `regression`
- Applies to: UI 相关 Plan。
- Trigger: Review 或 Regression 涉及界面变化。
- Requirement: 使用终端 × 状态矩阵记录覆盖、证据、未覆盖项和剩余风险。
- Verification modes: `review`, `regression`
- Verification: 两份报告包含矩阵或等价结构化证据。
- Exceptions: Plan 未修改 UI 时可 NOT_APPLICABLE，并说明原因。
- Source: 用户确认的阶段证据闭环设计。

## RESP-005 — 不发明响应式参数

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: 断点、目标浏览器、设备范围和设计常量。
- Trigger: 项目资料尚未定义具体参数。
- Requirement: 标记为未定义或形成待确认建议，不得把 AI 选择写成已确认项目标准。
- Verification modes: `review`
- Verification: 参数能回链到 active Design/Spec/用户指令，或明确标为假设。
- Exceptions: 安全且局部的实现默认可在 Plan 中显式记录并等待后续替代。
- Source: 项目禁止把推断包装成事实的要求。

## RESP-006 — 优先采用可适应布局

- Level: `SHOULD`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: 响应式布局实现。
- Trigger: 多种合理实现方式均可满足已确认设计。
- Requirement: 优先采用内容驱动、可伸缩和减少设备特判的布局；偏离时记录原因。
- Verification modes: `review`
- Verification: Review 检查布局是否依赖脆弱固定尺寸或不必要设备分支。
- Exceptions: Design/Spec 明确要求固定尺寸或特定设备行为。
- Source: 用户确认对该操作化规则的整体实施计划。
