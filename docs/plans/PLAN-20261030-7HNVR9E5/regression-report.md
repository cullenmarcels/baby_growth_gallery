---
id: PLAN-20261030-7HNVR9E5-REGRESSION
type: regression_report
title: 'Plan H 候选与集成 Regression'
status: passed
created_at: 2026-10-30T16:58:00+08:00
updated_at: 2026-11-16T16:12:04+08:00
plan_id: PLAN-20261030-7HNVR9E5
repository_mode: git_remote
phase: integration
reviewed_commit: e9294217fa1b1740b1c706fbc89398225471f99f
reviewed_scope_digest: BE8669467FF3B190686243C3F44EE6BC2A44B7C6992AA5754D4E43AA81D06F7E
integrated_commit: 2bf30dc30d55ded801b6332efbba991b8f296543
integrated_scope_digest: BE8669467FF3B190686243C3F44EE6BC2A44B7C6992AA5754D4E43AA81D06F7E
ci_status: passed
related_ids: [PLAN-20261030-7HNVR9E5-REVIEW]
supersedes: []
superseded_by: []
---

# 候选与集成 Regression

## 候选复验

最终 Review 和人工验收均绑定 `e9294217fa1b1740b1c706fbc89398225471f99f`。PR #31 的早期 Head `35c81d2` 因首页测试的固定提醒日过期而失败。修订固定测试时钟，重新执行 `pnpm validate`，API 293/293、Web 81/81（首页组件 4/4）、仓库工具 5/5、格式、Lint、类型、构建及知识库校验通过。候选阶段容器 readiness 与 375、834、1440 三视口首页 E2E 3/3 通过。

最终 PR Head `b34a97adb2be64dd204d027ce52887a2d0dd060e` 的 Branch Flow Run `42197797897` 以及 Quality Run `42197800549` 的 `quality` 和 `e2e-auth` 均成功。用户于 2026-11-06T17:46:38+08:00 验收修订候选。

## 集成复验

[PR #31](https://github.com/cullenmarcels/baby_growth_gallery/pull/31) 于 2026-11-09T11:05:05+08:00 合入 `develop`。2026-11-16 核对 GitHub PR、`git fetch origin develop` 与远端引用，确认集成提交 `2bf30dc30d55ded801b6332efbba991b8f296543` 位于 `origin/develop`，其 Git tree 与最终 PR Head 一致。候选和集成 v2 摘要均为 `BE8669467FF3B190686243C3F44EE6BC2A44B7C6992AA5754D4E43AA81D06F7E`，原验收继续有效。

[Quality Run 42554397573](https://github.com/cullenmarcels/baby_growth_gallery/actions/runs/42554397573) 在该合并提交上独立执行了下列验证。

| 影响与验证 | 结果 | 证据 |
| --- | --- | --- |
| API、Web 与仓库工具单测 | PASS | API 293/293、Web 81/81。首页组件覆盖摘要与导航、照片空态、单区块失败与重试、撤权缓存清除、提醒日期边界和排序。 |
| 宝宝档案、照片、里程碑、成长与认证 | PASS | `e2e-auth` 作业运行完整 `pnpm e2e`，Chromium 56 项通过、31 项按测试条件跳过。 |
| 首页真实摘要、家庭切换隔离及窄屏布局 | PASS | `tests/e2e/home.spec.ts` 在 375、834、1440 三种 Chromium 视口各通过 1 项。 |
| Lint、格式、类型、OpenAPI 和构建 | PASS | `quality` 作业验证照片依赖、Prisma 生成、确定性 OpenAPI、API/Web 构建、Alpine API 镜像及图片解码依赖。 |
| 知识库与容器环境 | PASS | 合并提交的 `PROJECT_VALIDATION=PASSED`。E2E 作业启动独立服务、执行 Prisma 迁移并验证测试对象清理。 |

## 覆盖边界

浏览器证据来自 Linux CI 的 Chromium 三视口，条件跳过项无本次通过结论。组件用例直接断言照片空态和失败重试。加载分支按候选 Review 与实现核对，集成测试未单独断言各区块加载态。三视口浏览器用例确认真实摘要、照片空态、家庭切换与布局。归档时核对合并提交的 CI 日志，本机应用测试与容器复测未运行。
