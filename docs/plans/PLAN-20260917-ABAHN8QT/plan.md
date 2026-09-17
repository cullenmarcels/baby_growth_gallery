---
id: PLAN-20260917-ABAHN8QT
type: plan
title: "修订照片回收权限并继续照片上传阶段"
status: confirmed
created_at: 2026-09-17T10:43:49+08:00
updated_at: 2026-09-17T10:43:49+08:00
related_ids: [PLAN-20260916-83SYH180, SPEC-20260917-NHHC01TR, DES-20260917-8EVTR3RJ]
supersedes: [PLAN-20260916-83SYH180]
superseded_by: []
confirmed_by: user
confirmation_basis: "用户要求管理员回收成员照片后成员不得恢复，确认将管理员优先纳入长期规则，并明确确认旧回收记录仅管理员可恢复及修订 Plan D 继续实施。"
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids: [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-BRANCH-GOVERNANCE
    version: 1
    rule_ids: [BRANCH-001, BRANCH-002, BRANCH-003, BRANCH-004, BRANCH-005, BRANCH-006, BRANCH-007, BRANCH-008, BRANCH-009, BRANCH-010]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 2
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006, IMPL-007]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007, TEST-008, TEST-009, TEST-010]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 1
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 2
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004, SAFE-005]
---

# 修订照片回收权限并继续照片上传阶段

## 目标、基线与修订关系

本 Plan 替代尚未完成 Review 的 `PLAN-20260916-83SYH180`，继承其未完成的照片直传、处理、发布、回收、质量 CI、Review、Regression 和集成门禁。新需求以 `SPEC-20260917-NHHC01TR` 与 `DES-20260917-8EVTR3RJ` 覆盖原照片 Spec/Design 的回收恢复部分；原文档和候选提交保留为历史，不视为已验收。

`origin/develop@fb6fa7a94528255aca77ab04b0009f1cd3064b29` 是经 `git fetch --prune origin` 核对的原始集成基线；工作分支继续 `feature/photo-upload-foundation`，本地修订起点为 `7c2b9de0a99df5598d218eb6e325b332b2567223`，集成目标仍为 `origin/develop`。工作区在修改前 clean；旧 Plan 状态先改为 `superseded`，消除 active owned-path 重叠。任何远端 drift 均须在候选固定前重新核对。

## 已确认产品决定

1. 回收写入操作者 Membership ID 和当时的 OWNER/ADMIN/MEMBER 角色快照；旧 TRASHED 记录没有来源时仅当前 OWNER/ADMIN 可恢复。
2. 普通 MEMBER 仅可恢复自己在 MEMBER 身份下回收的照片；管理员回收后，该成员不可恢复，哪怕仍是照片作者。当前 OWNER/ADMIN 可恢复家庭内有效的已回收照片。
3. 页面在不可恢复卡片上展示中文说明且不提供操作；旧页面直接调用 API 必须被服务端拒绝，并刷新权限与列表。此规则不扩张管理员对其他成员私有草稿的可见性。
4. 本次没有全局封禁、申诉、永久删除按钮或改变 30 天期限。已确认长期 `SAFE-005` 逐项列出照片回收、宝宝档案归档与家庭成员/邀请限制操作的作用范围和成员反馈；后两类沿用现有 Spec，不在本次改写业务行为。

## 数据、接口与实现步骤

1. 前向新增 nullable `Photo.trashedByMembershipId`、`trashedByRole` 和 Membership 关系；不改写已共享 migration，不回填无法证实的操作者。
2. 服务端将回收来源、状态和期限原子写入；恢复时重新核对 ACTIVE Membership、当前角色、作者和本次回收快照，并在条件更新中约束快照与期限。恢复后清空来源；竞态返回稳定中文 Problem Details。
3. `PhotoSummary` 增加服务端计算的 `canRestore`，不公开操作者 ID/角色；OpenAPI 是生成客户端唯一来源，连续生成无差异。
4. 管理页按 `canRestore` 展示“恢复”或中文管理员处理说明；`PHOTO_RESTORE_ADMIN_REQUIRED` 映射中文，旧页面被拒后刷新列表与家庭权限，不重放 mutation。
5. 增加 API、数据库迁移、Web 与三视口 E2E 正负矩阵；校验旧记录、角色变动、跨家庭、并发、期限、私有草稿隔离及 Plan A–C 回归。

## Review、Regression 与验收门禁

候选执行 `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm e2e`、`pnpm validate` 和 `hooks/validate-project.ps1 -Check`，另验证空库及 Plan D 旧数据库前向迁移、Docker 全栈 readiness、对象清理与 375／834／1440 正常/加载/错误状态。Review 必须绑定新候选提交与 v2 owned-scope digest，逐条覆盖 65 条固定 Rule；独立 Regression 不能由 Review 替代。原 Plan D 尚待用户确认的 CI 失败产物安全口径和 Presigned POST 单次语义继续阻止 Review 通过，不因本次权限修订自动视为已同意。

用户对固定新候选人工试玩并明确验收后，仍须单独授权相应 PR 合并到 develop；集成提交重新计算 digest 并独立复验，CI 失败或摘要变化阻止归档。本 Plan 不创建产品发布 Tag，也不执行 develop 之后的版本晋升。
