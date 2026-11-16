---
id: ACH-20261030-7HNVR9E5
type: achievement
title: 'Plan H 宝宝首页数据聚合'
status: archived
created_at: 2026-11-16T16:12:04+08:00
updated_at: 2026-11-16T16:12:04+08:00
related_ids: [PLAN-20261030-7HNVR9E5, SPEC-20261030-VJ05H0TV, DES-20261030-TSASQH7P]
supersedes: []
superseded_by: []
plan_id: PLAN-20261030-7HNVR9E5
confirmed_by: user
confirmed_at: 2026-11-06T17:46:38+08:00
archived_at: 2026-11-16T16:12:04+08:00
confirmation_record: '用户于 2026-11-06 回复“验收通过”确认修订候选，2026-11-16 要求“开始补集成复验记录和归档”。'
repository_mode: git_remote
base_commit: 2d28593497494d442609f5f931edff85fc40b1b3
integration_target: origin/develop
candidate_commit: e9294217fa1b1740b1c706fbc89398225471f99f
candidate_scope_digest: BE8669467FF3B190686243C3F44EE6BC2A44B7C6992AA5754D4E43AA81D06F7E
integrated_commit: 2bf30dc30d55ded801b6332efbba991b8f296543
integrated_scope_digest: BE8669467FF3B190686243C3F44EE6BC2A44B7C6992AA5754D4E43AA81D06F7E
ci_status: passed
review_report: ../plans/PLAN-20261030-7HNVR9E5/review-report.md
regression_report: ../plans/PLAN-20261030-7HNVR9E5/regression-report.md
acceptance_record: ../plans/PLAN-20261030-7HNVR9E5/acceptance-record.md
---

# Plan H 宝宝首页数据聚合

## 交付与验收范围

- `/app/home` 保留宝宝档案头部与既有导航，新增最近发布照片、里程碑进度、近期提醒和最新成长数据。照片最多 3 张，可进入详情。提醒取上海日历日当天至第 30 天内最近 3 条未完成事项。成长指标显示各自最新值与日期，在 WHO 参考有效时显示百分位。
- 各区块支持独立加载、空状态、失败与重试。缓存按家庭和宝宝隔离，生日或性别变更触发成长摘要重取。失权时清除受限内容并重新校验上下文。
- `BabyApp.tsx` 接入 `BabyHomeDashboard.tsx`、样式与日期筛选工具。组件测试和 `tests/e2e/home.spec.ts` 覆盖验收条件。首页复用既有 API。API Jest 配置调整为跨平台测试 glob。
- 范围依据见[冻结 Plan](../plans/PLAN-20261030-7HNVR9E5/plan.md)、[规格](../specs/SPEC-20261030-VJ05H0TV-homepage-aggregation/spec.md)和[设计](../designs/DES-20261030-TSASQH7P-homepage-aggregation/design.md)。

## 规则、偏差与集成

- 固定 Ruleset 为 Source Evidence v2、Repository Safety v2、Git Collaboration v1、Branch Governance v1、Implementation Quality v2、Testing Quality v2、Responsive UI v2、Security and Privacy v2。逐条证据见[候选 Review](../plans/PLAN-20261030-7HNVR9E5/review-report.md)。
- 旧候选的提醒测试因日期推进失败。修订固定测试时钟后重新执行 Review、Regression 和人工验收。早期 Windows Jest glob 问题由跨平台配置修复。两项修订均纳入最终候选。
- PR #31 于 2026-11-09T11:05:05+08:00 合入 `develop`。远端与 CI 的集成 SHA 均为 `2bf30dc30d55ded801b6332efbba991b8f296543`，其 v2 作用域摘要与人工接受的候选一致。
- 合并提交的 [Quality Run 42554397573](https://github.com/cullenmarcels/baby_growth_gallery/actions/runs/42554397573) 通过 API 293 项、Web 81 项、构建、OpenAPI、镜像及知识库检查。Chromium E2E 56 项通过、31 项条件跳过。首页在 375、834、1440 三种视口各通过 1 项。环境与覆盖边界见[集成复验](../plans/PLAN-20261030-7HNVR9E5/regression-report.md)。
