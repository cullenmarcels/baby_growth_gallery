---
id: ACH-20261111-4TX2SW6A
type: achievement
title: '家庭专用账号与三级权限修订'
status: archived
created_at: 2026-11-17T13:57:11+08:00
updated_at: 2026-11-17T13:57:11+08:00
related_ids: [PLAN-20261111-4TX2SW6A, SPEC-20261111-5ZY6HCR3, DES-20261111-Q14HTQJ4, SPEC-20261111-H7J6WEKD]
supersedes: []
superseded_by: []
plan_id: PLAN-20261111-4TX2SW6A
confirmed_by: user
confirmed_at: 2026-11-17
archived_at: 2026-11-17T13:57:11+08:00
confirmation_record: '用户回复「完成收尾工作，所有PLAN已全部验收。」，随后告知「已完成PR review，继续」。'
repository_mode: git_remote
base_commit: 2bf30dc30d55ded801b6332efbba991b8f296543
integration_target: origin/develop
candidate_commit: 6c227008e86963dd3c66335440c51c26be3063af
candidate_scope_digest: FD6CC4D77DCF2FF8C22BE30001F2F95036DF2B624B6C70F7FCBEE2B762A6E279
integrated_commit: a63e50a497d1d325944b6ae5eb802df5453b2e25
integrated_scope_digest: FD6CC4D77DCF2FF8C22BE30001F2F95036DF2B624B6C70F7FCBEE2B762A6E279
ci_status: passed
review_report: ../plans/PLAN-20261111-4TX2SW6A/review-report.md
regression_report: ../plans/PLAN-20261111-4TX2SW6A/regression-report.md
acceptance_record: ../plans/PLAN-20261111-4TX2SW6A/acceptance-record.md
---

# 家庭专用账号与三级权限修订

## 交付与验收

家庭专用用户名与密码、首次换密和条款、会话限制和撤销、超管与家管权限、多家庭隔离、前向数据库迁移。

对照账号与权限规格，核对限流及会话版本、家管签发密码限制、末位有效家管和非空历史数据保护。auth、family 和 auth-visual 既有用例分别提供认证、角色边界与视觉证据。

依据[冻结 Plan](../plans/PLAN-20261111-4TX2SW6A/plan.md)。固定规则为资料证据 v2、Git 协作 v1、仓库安全 v2、实施质量 v2、安全隐私 v2、响应式 v2 和测试质量 v2。逐条结果及视口覆盖见[候选 Review](../plans/PLAN-20261111-4TX2SW6A/review-report.md)。

## 集成验证与偏差

- [PR #32](https://github.com/cullenmarcels/baby_growth_gallery/pull/32) 于 2026-11-17T13:43:24+08:00 合入 develop，合并提交 a63e50a497d1d325944b6ae5eb802df5453b2e25 的 v2 摘要与验收候选一致。候选 Review 和验收绑定记录于合并后补齐，保留时间顺序。
- 候选 Windows Chromium 65 项通过、19 项条件跳过。合并提交的 [CI](https://github.com/cullenmarcels/baby_growth_gallery/actions/runs/44026083701) 通过 API 292 项、Web 77 项、镜像构建、OpenAPI 一致性、空库迁移与项目验证。Linux Chromium 三视口 58 项通过、25 项条件跳过。完整结果见[回归记录](../plans/PLAN-20261111-4TX2SW6A/regression-report.md)。
- 本机标准镜像依赖下载超时，采用隔离基础设施跑应用回归。标准 Alpine 镜像在 PR 和合并后的 Linux CI 均通过。旧数据不迁入，迁移对非空历史账号和家庭表保留保护。
