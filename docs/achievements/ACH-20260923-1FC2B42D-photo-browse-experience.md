---
id: ACH-20260923-1FC2B42D
type: achievement
title: '照片卡片上传者与三来源返回修订：完成归档'
status: archived
created_at: 2026-10-14T14:02:10+08:00
updated_at: 2026-10-14T14:02:10+08:00
related_ids:
  [
    PLAN-20260923-1FC2B42D,
    SPEC-20260923-Y0XZXEM0,
    DES-20260923-M1TKDS56,
    SPEC-20260917-KSVSF8BN,
    DES-20260917-YQWSZG09,
    SPEC-20260920-QQ9SQ9VT,
    DES-20260920-SAX3DM0H,
  ]
supersedes: []
superseded_by: []
plan_id: PLAN-20260923-1FC2B42D
confirmed_by: user
confirmed_at: 2026-10-14T09:49:50+08:00
archived_at: 2026-10-14T14:02:10+08:00
confirmation_record: '用户明确回复“验收通过”，确认候选及其 v2 owned-scope digest；随后明确授权创建并合并 PR、修复所需 CI 阻塞并完成原 Plan 归档。'
repository_mode: git_remote
reviewed_commit: e6c67158fac997e7be6236149a4b2cf9a58ad582
reviewed_scope_digest: 7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850
accepted_commit: e6c67158fac997e7be6236149a4b2cf9a58ad582
accepted_scope_digest: 7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850
integrated_commit: fd70c6b629fcd0696c8526dcae1b1ea83d6a3e34
integrated_scope_digest: 7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850
scope_digest_version: 2
ci_status: passed
platform_scope: windows11-chromium-github-actions-ubuntu
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/27
---

# `ACH-20260923-1FC2B42D` — 照片浏览体验修订

## 归档摘要

- 图集和时间轴照片卡片显示上传者资料名；超过 15 个 Unicode code point 时显示前 15 字加 `…`，完整名称保留于辅助信息。
- 照片详情识别图集、时间轴及里程碑三类白名单来源；返回链接固定指向来源页面，上／下一张持续传播已校验来源和里程碑 ID。
- 保留照片与里程碑权限、私有预览、分页排序、详情相邻照片顺序、混合时间轴和既有管理 DTO；不新增数据库表、字段或迁移。

## Review、验收与集成

- 独立 Review 与候选 Regression 均通过；用户于 `2026-10-14T09:49:50+08:00` 明确“验收通过”。确认绑定产品候选 `e6c67158fac997e7be6236149a4b2cf9a58ad582` 与 v2 scope digest `7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850`。
- PR #27 将候选合并到 `develop`，产品集成提交为 `fd70c6b629fcd0696c8526dcae1b1ea83d6a3e34`；集成 digest 与 accepted digest 完全一致，候选为最新远端 `develop` 的祖先。
- 后续文档修复 PR #28 恢复被索引引用的五份历史 Plan 文件；支持性 CI 修复 PR #29 更换无法访问的 Quay MinIO 镜像，改用从同一 MinIO 官方 release 源码构建且 digest 固定的 GHCR 镜像，并复用镜像内 `mc`。这两项不修改本 Plan 产品作用范围摘要。
- PR #29 的 branch-flow、quality、e2e-auth 全部通过；合并后的 `develop` Quality run `38518835483` 中 quality 与 e2e-auth 均通过，包含项目校验和完整 Playwright 流程。

## 验证与响应式范围

- 候选 API 全量测试 7 suites / 62 tests、Web 全量测试 9 files / 67 tests 通过；照片服务定向测试 7 tests、PhotoBrowse 与 MilestoneApp 定向测试 26 tests 通过。
- OpenAPI 导出与 API Client 连续生成确定性检查、API/Web/API Client 类型检查和构建、ESLint、Prettier、照片与里程碑 Playwright 均通过。候选 Playwright 为 6 passed / 6 按项目 viewport/API 条件配置跳过 / 0 failed；CI 合并后完整 E2E 也通过。
- Chromium 在 375×812、834×1112、1440×1000 覆盖图集、时间轴、详情及里程碑照片入口；上传者右对齐、单行截断、无水平溢出，焦点和卡片链接语义保持。
- 测试数据为合成数据。未声称 Safari、Firefox 或真实移动设备已验证；本地开发栈产生的数据未手动清理。

## 关联证据与冻结

- [Plan](../plans/PLAN-20260923-1FC2B42D/plan.md)、[State](../plans/PLAN-20260923-1FC2B42D/state.md)、[Execution Log](../plans/PLAN-20260923-1FC2B42D/execution-log.md)、[Review](../plans/PLAN-20260923-1FC2B42D/review-report.md)、[Regression](../plans/PLAN-20260923-1FC2B42D/regression-report.md)、[Acceptance](../plans/PLAN-20260923-1FC2B42D/acceptance-record.md)。
- 关联规格：`SPEC-20260923-Y0XZXEM0`、`DES-20260923-M1TKDS56`，并沿用照片浏览和里程碑混合时间轴规格/设计。
- 归档日期：`2026-10-14`。Plan 包与 Achievement 已写入 `docs/ARCHIVE.sha256` 并永久冻结；后续修改必须建立新 Plan。
