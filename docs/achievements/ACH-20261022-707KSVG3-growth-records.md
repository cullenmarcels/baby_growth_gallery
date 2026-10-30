---
id: ACH-20261022-707KSVG3
type: achievement
title: "Plan G：成长数据、WHO 参考与记录回收站"
status: archived
created_at: 2026-10-30T09:45:00+08:00
updated_at: 2026-10-30T09:45:00+08:00
related_ids: [PLAN-20261022-707KSVG3, SPEC-20261022-17HX5RTZ, DES-20261022-EM2SND6K, SPEC-20260915-8RKJ7RGM]
supersedes: []
superseded_by: []
plan_id: PLAN-20261022-707KSVG3
confirmed_by: user
confirmed_at: 2026-10-29T10:00:00+08:00
archived_at: 2026-10-30T09:45:00+08:00
confirmation_record: "用户于 2026-10-29 确认候选验收通过；2026-10-30 确认 PR 已合并且验收通过。"
repository_mode: git_remote
base_commit: 4a0132090d746f59c9512bcdc78881f7fe475c7c
integration_target: origin/develop
candidate_commit: f3fae9c259827b4533c4b1264e77cffd8a8fe925
candidate_scope_digest: E8A7CDDD2A70AF903214F670F36E630B1E849C6E5FBA5884420A15EF705CDA53
integrated_commit: 2d28593497494d442609f5f931edff85fc40b1b3
integrated_scope_digest: E8A7CDDD2A70AF903214F670F36E630B1E849C6E5FBA5884420A15EF705CDA53
ci_status: passed
review_report: ../plans/PLAN-20261022-707KSVG3/review-report.md
regression_report: ../plans/PLAN-20261022-707KSVG3/regression-report.md
acceptance_record: ../plans/PLAN-20261022-707KSVG3/acceptance-record.md
---

# Achievement

Plan G 已交付测量记录、WHO 生长参考、趋势与回收站闭环。支持同日多条、部分指标、同次 BMI、WHO 参考不可用说明、版本冲突、30 天回收恢复、管理员提前彻底删除及宝宝归档生命周期。成长界面覆盖桌面、平板和移动端。

## 验证与集成

- WHO 数据固定上游提交，保留来源、SHA-256 和 GPL 通知；使用官方 R 函数生成独立对照样例。
- `pnpm validate` 集成后通过：API 301 项、Web 77 项测试，以及 lint、format、typecheck、build、知识库检查。
- 容器成长与 readiness 18 项通过，覆盖 375/834/1440；候选全量 Playwright 为 53 passed、31 条件跳过、0 failed。
- PR #30（`feature/growth-records` → `develop`）合并为 `2d28593497494d442609f5f931edff85fc40b1b3`。GitHub quality、e2e-auth、branch-flow-develop 均通过。
- 集成 tree 与已验收候选 tree 相同，v2 owned-scope digest 保持 `E8A7CDDD2A70AF903214F670F36E630B1E849C6E5FBA5884420A15EF705CDA53`；集成后重新执行项目验证通过。

## 风险与偏差

照片批量编辑的并发浏览器运行曾有一次失败，对应测试及全量串行重跑通过，作为非复现的不稳定现象记录。WHO 上游数据许可保留 GPL-3.0-only / GPL-3.0-or-later 条款；进一步分发时须按实际分发方式履行适用义务。构建仍提示前端 bundle 超过 500 kB，运行时 JSON import 有弃用提示；均不影响本次通过的构建与测试。
