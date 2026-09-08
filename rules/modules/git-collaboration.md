---
ruleset_id: RULESET-GIT-COLLABORATION
title: "Git 多成员与多设备协作规则"
version: 1
status: active
health: healthy
scope: repository-collaboration
stages: [exploration, planning, development, review, regression, acceptance]
effective_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T11:34:45+08:00
source_refs: [AGENTS.md, rules/README.md, docs/README.md]
related_plan_ids: [PLAN-20260908-001]
related_achievement_ids: [ACH-20260908-001]
supersedes_version: null
---

# Git 多成员与多设备协作规则

## GIT-001 — 识别仓库模式与真实根目录

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `planning`, `development`, `review`, `regression`, `acceptance`
- Applies to: 所有项目任务。
- Trigger: 开始任务或切换工作区。
- Requirement: 使用仓库预检区分 non_git、git_local、git_remote，并确认 Git 根目录；不得仅凭目录名假设仓库状态。
- Verification modes: `automatic`, `review`
- Verification: `hooks/repository-preflight.ps1` 输出模式和根目录，Execution Log 记录结果。
- Exceptions: 无。
- Source: 用户确认的跨成员、跨设备协作要求。

## GIT-002 — 区分本地状态与远端新鲜度

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `planning`, `development`, `review`, `regression`, `acceptance`
- Applies to: Git 仓库任务。
- Trigger: 使用本地代码或资料作为当前依据。
- Requirement: 记录 HEAD、分支、上游和 remote_freshness；没有刷新或证明远端引用时只能标记 unverified，不得声称已同步。
- Verification modes: `automatic`, `review`
- Verification: 仓库预检 JSON 与 Plan State、报告中的仓库字段一致。
- Exceptions: non_git 模式明确记为 not_applicable。
- Source: 用户确认的跨分支当前真相定义。

## GIT-003 — 阻止高风险工作区状态下修改

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: Git 工作区修改。
- Trigger: 预检发现 dirty、stale、diverged 或 detached。
- Requirement: dirty_overlap、stale、diverged、detached 默认阻止修改；dirty_nonoverlap 必须保护既有路径并留下证据。
- Verification modes: `automatic`, `review`
- Verification: 预检的 blocking_reasons、Plan owned_paths 和实际修改文件互相一致。
- Exceptions: 只有用户确认的安全分支或同步方案可以解除，且必须写入 Execution Log。
- Source: 用户确认的协作安全门禁。

## GIT-004 — Plan 固定 Git 基线与路径所有权

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: 新式 Plan。
- Trigger: 用户确认计划并创建 Plan 包。
- Requirement: state.md 固定 repository_mode、base_commit、work_branch、integration_target、owned_paths 和 overlapping_plan_ids；保存路径统一为仓库相对路径。
- Verification modes: `automatic`, `review`
- Verification: 聚合校验器验证字段、格式和实际仓库上下文。
- Exceptions: non_git 字段可为 null/not_applicable，但 owned_paths 仍必须明确。
- Source: 用户确认的基线和并行修改范围设计。

## GIT-005 — 活动 Plan 路径重叠必须协调

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `planning`, `development`
- Applies to: 同时存在多个非归档 Plan 的项目。
- Trigger: 新建 Plan 或扩大 owned_paths。
- Requirement: 扫描活动 Plan 的直接、父子和目录路径重叠；命中时必须建立依赖、重新分配所有权或标记 blocked。
- Verification modes: `automatic`, `review`
- Verification: 仓库预检和 Plan 校验输出 overlapping_plan_ids，未协调重叠返回失败。
- Exceptions: 明确只读的共享路径不计入 owned_paths。
- Source: 用户确认的跨成员并发要求。

## GIT-006 — Review 绑定已提交候选版本

- Level: `MUST`
- Status: `active`
- Stages: `review`, `regression`
- Applies to: Git 模式 Plan。
- Trigger: 形成 Review 或候选 Regression 结论。
- Requirement: 报告记录 reviewed_commit 和 reviewed_scope_digest；未提交工作区内容不能作为最终通过证据。
- Verification modes: `automatic`, `review`
- Verification: 提交存在且摘要可从 owned_paths 确定性重算。
- Exceptions: non_git 模式明确记为 not_applicable。
- Source: 用户确认的版本绑定 Review 设计。

## GIT-007 — 人工验收绑定作用范围摘要

- Level: `MUST`
- Status: `active`
- Stages: `acceptance`
- Applies to: Git 模式人工验收。
- Trigger: 用户确认候选版本完成或可以归档。
- Requirement: acceptance-record.md 保存原始语义、accepted_commit 和 accepted_scope_digest；只比较 owned_paths，集成后摘要变化使确认失效。
- Verification modes: `automatic`, `human`
- Verification: 集成复验重算 accepted/integrated scope digest 并判断 confirmed 或 invalidated。
- Exceptions: non_git 模式沿用明确 Plan 确认门槛。
- Source: 用户选择“合并后归档”。

## GIT-008 — Git 远端模式必须集成后归档

- Level: `MUST`
- Status: `active`
- Stages: `regression`, `acceptance`
- Applies to: git_remote Plan。
- Trigger: 准备生成 Achievement。
- Requirement: Plan 必须经过 integration_pending、integration_review，且 integrated_commit 位于已验证目标分支、集成复验通过后才能归档。
- Verification modes: `automatic`, `review`, `regression`
- Verification: State、Acceptance、Regression、远端引用和 Achievement 证据一致。
- Exceptions: 无；git_local 需显式记录本地集成限制，non_git 使用原流程。
- Source: 用户选择“合并后归档”。

## GIT-009 — 不擅自改变历史或远端

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`, `acceptance`
- Applies to: pull、merge、rebase、reset、push、force-push 等 Git 操作。
- Trigger: 操作会改变工作树、分支历史或远端引用。
- Requirement: 必须有当前任务明确授权和安全检查；普通归档确认不包含自动合并或推送授权。
- Verification modes: `review`
- Verification: Execution Log 将每项改变历史或远端的操作回链到明确授权。
- Exceptions: fetch 只刷新远端引用，可作为显式远端预检执行；失败必须标记 unverified。
- Source: 用户确认的协作权限边界。

## GIT-010 — 自动化不可用不得静默通过

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `development`, `review`, `regression`, `acceptance`
- Applies to: 运行时、远端、CI、Codex hook 和验证器。
- Trigger: 自动检查未配置、未受信任、缺失、超时或失败。
- Requirement: 使用 unverified、not_configured 或 unavailable 记录真实状态，并执行可用的显式替代检查；不得写成 PASS。
- Verification modes: `automatic`, `review`
- Verification: 报告区分验证失败、环境不可用和不适用。
- Exceptions: 无。
- Source: 用户确认的可降级但不静默设计。
