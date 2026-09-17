---
id: PLAN-20260917-ABAHN8QT-REGRESSION
type: regression_report
title: "照片回收权限修订 Regression"
status: passed
created_at: 2026-09-17T10:43:49+08:00
updated_at: 2026-09-17T17:33:27+08:00
plan_id: PLAN-20260917-ABAHN8QT
phase: integrated
reviewed_commit: 4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d
reviewed_scope_digest: BEC7641DB2358A29349AA8046449EAFA0647B96C08847A48B33AB2AE6D5F3A2E
ci_status: passed
related_ids: [PLAN-20260917-ABAHN8QT, SPEC-20260917-NHHC01TR, DES-20260917-8EVTR3RJ]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论

`PASS`。独立 Regression 在 Review 通过后执行，未修改候选实现；验证候选为 `4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d`，v2 digest 为 `BEC7641DB2358A29349AA8046449EAFA0647B96C08847A48B33AB2AE6D5F3A2E`。

## 回归范围

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 静态与项目门禁 | PASS | `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm validate` 均 exit 0；API 48、Web 34。 |
| 照片权限矩阵 | PASS | 成员自回收/自恢复、管理员回收后成员禁止恢复、OWNER/ADMIN 恢复、旧未知回收记录管理员降级路径均通过。 |
| 状态与竞态 | PASS | 回收期限、状态条件更新、重复恢复、权限变化和 403 后刷新/不重放通过。 |
| Docker 与存储 | PASS | PostgreSQL、Redis、MinIO、storage-proxy、API、Web healthy；迁移成功；对象存储仍为私有。 |
| 浏览器与响应式 | PASS | Docker Playwright 36 passed / 27 skipped / 0 failed；375、834、1440 覆盖正常、错误、权限和中文反馈状态。 |
| 安全决策回归 | PASS | CI 产物只记录安全摘要；Presigned POST 采用固定 Key + 幂等 `complete` 的已确认语义，未把 S3 重放能力误报为严格一次性。 |

## 环境与边界

- 平台：Windows 宿主、Docker Desktop Linux containers、Chromium。
- 测试数据：仅合成账号、合成家庭和合成媒体；未上传真实 Cookie、手机号、验证码或照片。
- PR #24 的 `branch-flow-develop`、`quality`、`e2e-auth` 均通过，分别对应 Branch Flow run `35204369442` 与 Quality run `35204369171`；检查执行的 PR Head 为 `1847ea047c09e3088a66c1a56b5f55e4c474cefd`。本轮仍是候选 Regression，合并 `develop` 后必须对集成提交独立复验。

## 集成版本 Regression

`PASS`。独立检查精确 merge commit `fb059f073c6c64ffc4e787281a75227e52a1a84a`，其第一父提交为原 `develop` 基线，第二父提交为 PR Head `1847ea047c09e3088a66c1a56b5f55e4c474cefd`。集成 tree 与 PR Head 无文件差异；v2 owned-scope digest 为 `B90FC3FAEC9DCC6CB8A6254A2301B34B1767F3A0EAB767770487DFB1A4C5C80A`，与验收摘要相同。

| 检查 | 结果 | 集成证据 |
| --- | --- | --- |
| 静态、单元与构建 | PASS | 在集成提交检出上 `pnpm validate` exit 0；branch-flow 5、API 48、Web 34、lint、format、typecheck、build、知识库校验通过。 |
| 浏览器与权限 | PASS | Docker 完整 `pnpm e2e`：36 passed、27 按设计跳过、0 failed，涵盖 375、834、1440 与认证、家庭、宝宝、照片回收矩阵。 |
| 迁移与运行栈 | PASS | `prisma migrate deploy` 显示 5 个 migration、无待应用项；Docker API、MinIO、PostgreSQL、Redis、storage-proxy 和 Web 均运行，readiness HTTP 200。 |
| 远端 CI | PASS | `develop@fb059f0…` 的 Quality run `35205302697` 为 success，quality 与 e2e-auth Job 均通过。 |
| Windows 换行 | PASS | Windows 全局 `core.autocrlf=true` 使新 `.ts/.tsx/.css/.mjs` 检出为 CRLF，首次本地 format 检查失败；规范化 33 个工作副本后，逐一核对 Git blob 均与集成 HEAD 相同，Git 差异为零；复跑 `pnpm validate` 全部通过。 |

当前仅完成 `develop` 集成；正式短信服务、公开运营法律文本、HEIC 许可复核和 `develop → release → master → main` 产品晋升仍按后续 Plan 处理。
