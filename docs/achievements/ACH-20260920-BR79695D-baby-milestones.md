---
id: ACH-20260920-BR79695D
type: achievement
title: "成长里程碑、清单提醒与混合时间轴：完成归档"
status: archived
created_at: 2026-09-23T13:34:11+08:00
updated_at: 2026-09-23T13:34:11+08:00
related_ids: [PLAN-20260920-BR79695D, PLAN-20260920-BR79695D-EXEC, PLAN-20260920-BR79695D-REVIEW, PLAN-20260920-BR79695D-REGRESSION, PLAN-20260920-BR79695D-ACCEPTANCE, SPEC-20260920-QQ9SQ9VT, DES-20260920-SAX3DM0H, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-GIT-COLLABORATION, RULESET-BRANCH-GOVERNANCE, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-RESPONSIVE-UI, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260920-BR79695D
confirmed_by: user
confirmed_at: 2026-09-23T10:53:05+08:00
archived_at: 2026-09-23T13:34:11+08:00
confirmation_record: '用户明确确认通过 Plan F 人工验收，随后授权创建目标为 develop 的 PR，并明确授权归档。'
repository_mode: git_remote
reviewed_commit: dfd2aebe667eea19b8ece3e0d00c53c5affc7086
reviewed_scope_digest: D78C899B2248B4887DF0AB98717441E1A94DA9AD87795BED6C96B46418F006CB
accepted_commit: dfd2aebe667eea19b8ece3e0d00c53c5affc7086
accepted_scope_digest: D78C899B2248B4887DF0AB98717441E1A94DA9AD87795BED6C96B46418F006CB
integrated_commit: 860be884287e8875f380e1dade3b38e629f4b8d5
integrated_scope_digest: D78C899B2248B4887DF0AB98717441E1A94DA9AD87795BED6C96B46418F006CB
scope_digest_version: 2
ci_status: passed
platform_scope: windows11-docker-github-actions
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/26
---

# `ACH-20260920-BR79695D` — Plan F 成长里程碑

## 归档摘要

- Plan F 完成共享成长里程碑清单、固定 12 项模板、自定义里程碑、应用内提醒、完成记录、照片关联和照片／里程碑混合时间轴。
- 首页“成长里程碑”卡片已从过期占位说明改为真实能力说明，并支持整卡跳转至 `/app/milestones`。
- 用户于 `2026-09-23T10:53:05+08:00` 明确确认人工验收通过；确认绑定产品候选 `dfd2aebe667eea19b8ece3e0d00c53c5affc7086` 和 v2 owned-scope 摘要 `D78C899B2248B4887DF0AB98717441E1A94DA9AD87795BED6C96B46418F006CB`。
- PR #26 已以普通 merge commit 集成到 `develop`，集成提交为 `860be884287e8875f380e1dade3b38e629f4b8d5`；集成摘要与 accepted 摘要一致，人工验收继续有效。

## 已交付范围

- 提供按宝宝与家庭隔离的里程碑清单、进度概览、提醒、已完成项目、模板导入和自定义创建。
- 支持里程碑详情、编辑、完成、撤销、删除、日期边界、版本冲突和成员角色权限；作者可管理自身项目，OWNER/ADMIN 可管理全部项目，其他成员只读。
- 关联同家庭、同宝宝、已发布照片，去重后最多 10 张；照片回收会同步解除关联，恢复照片不会自动重建关联。
- 将已完成里程碑与照片合并为稳定排序的混合时间轴，支持游标分页、撤销／删除退出时间轴和家庭动态墓碑语义。
- Web 页面覆盖列表、概览、提醒、模板／自定义创建、详情、照片选择和所有正常／空／加载／错误／冲突状态；375、834、1440 三视口保持响应式与可访问性约束。

## 版本、Review 与集成证据

- Review 和候选 Regression 均绑定候选 `dfd2aebe667eea19b8ece3e0d00c53c5affc7086` 与 v2 digest `D78C899B2248B4887DF0AB98717441E1A94DA9AD87795BED6C96B46418F006CB`；66 条适用 Rule 均为 PASS 或有明确理由的 NOT_APPLICABLE。
- 候选验证包括 API 7 suites / 62 tests、Web 9 files / 56 tests、全工作区类型检查、Lint、Prettier、构建、OpenAPI／生成客户端、migration 和完整 Playwright（38 passed、31 designed skips、0 failed）。
- PR #26 的 `branch-flow-develop`、`quality` 和 `e2e-auth` 均 completed/success；GitHub API 核对 `develop` 当前 ref 为归档前证据提交 `662d24e67cbba9f27edc3af3b1f4dffa899b31d3`，其祖先为精确集成提交 `860be884287e8875f380e1dade3b38e629f4b8d5`。
- 集成提交重算 v2 owned-scope digest 与 accepted digest 完全一致；合并后本地 `update-indexes -Check`、`validate-project.ps1 -Check` 和 `PROJECT_VALIDATION=PASSED` 均通过。

## 偏差、风险与后续边界

- 浏览器证据限定为 Windows Chromium 的 375／834／1440；未声称 Safari、Firefox 或真实移动设备通过。
- 默认根 `pnpm validate` 的嵌套主机 Node／pnpm engine 门禁问题按执行记录保留；等价检查使用 Corepack Node 24.20／pnpm 11.21 明确通过，不将主机 shim 问题写成产品失败或虚假通过。
- 本阶段没有创建发布 Tag，也没有执行 `develop → release → master → main` 晋升；里程碑评论、反应、视频和公开分享仍是非目标。
- 归档期间 GitHub API 成功验证 `develop` ref 与 CI；后续 `git fetch` 曾因网络连接重置失败，已保留该限制，不把失败后的缓存刷新冒充新的远端事实。

## 关联证据与冻结

- [Spec](../specs/SPEC-20260920-QQ9SQ9VT-baby-milestones/spec.md)、[Design](../designs/DES-20260920-SAX3DM0H-baby-milestones-ui/design.md)。
- [Plan](../plans/PLAN-20260920-BR79695D/plan.md)、[State](../plans/PLAN-20260920-BR79695D/state.md)、[Execution Log](../plans/PLAN-20260920-BR79695D/execution-log.md)、[Review Report](../plans/PLAN-20260920-BR79695D/review-report.md)、[Regression Report](../plans/PLAN-20260920-BR79695D/regression-report.md)、[Acceptance Record](../plans/PLAN-20260920-BR79695D/acceptance-record.md)。
- 归档时间：`2026-09-23T13:34:11+08:00`。Plan 包与本 Achievement 将纳入 `docs/ARCHIVE.sha256` 并永久冻结；后续修改必须新建 Plan。
