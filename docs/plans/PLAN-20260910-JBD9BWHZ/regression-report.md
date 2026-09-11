---
id: PLAN-20260910-JBD9BWHZ-REGRESSION
type: regression_report
title: "认证密码长度修订 Regression"
status: passed
created_at: 2026-09-10T16:23:24+08:00
updated_at: 2026-09-11T09:31:53+08:00
plan_id: PLAN-20260910-JBD9BWHZ
repository_mode: git_remote
candidate_commit: b8a36f4795c0378fe6652fc249ade83dc1c47104
integrated_commit: 7354720b400f098e539b65a6211756aaffa6b21e
ci_status: passed
related_ids: [PLAN-20260910-JBD9BWHZ]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论

`PASS`。独立 Regression 在 Review 证据提交后执行，不修改候选实现。被验证候选仍为 `b8a36f4795c0378fe6652fc249ade83dc1c47104`，v2 digest 仍可重算为 `042C04A117C6B02B7FAC7264A32B81994C012B6AAE15B7BA468CD0A8AD1DE27D`。

## 影响范围与选择依据

修订直接影响注册、密码登录、找回密码、Web 表单错误、OpenAPI 契约和生成客户端；间接风险为 Challenge 被过早消费、Session 撤销回归、响应式文案溢出和隔离服务连通。因此独立复跑全部静态门禁、认证 API/浏览器主路径、三视口视觉基线和 readiness。家庭/照片模块仍未实现，不存在可回归对象。

## 候选检查

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 独立静态/单元门禁 | PASS | `pnpm validate` exit 0；Lint、format、typecheck、13 API、9 Web、build、project validation 全通过。 |
| 密码边界 | PASS | 5 位 API/Web 拒绝，6 位完成注册/登录/重置，129 位单元校验拒绝，Unicode/空格通过。 |
| 会话与安全 | PASS | regenerate、旧 CSRF 拒绝、Challenge 重放拒绝、改密后旧 Session/旧密码失效、HttpOnly Cookie 通过。 |
| 三视口与视觉 | PASS | 隔离环境 375/834/1440 的认证、视觉基线、键盘与无溢出检查通过。 |
| 服务连通 | PASS | PostgreSQL/Redis/MinIO 隔离 readiness 在三视口均返回 up。 |
| 远端 CI | PASS | PR #21 `branch-flow-develop`、`quality`、`e2e-auth` 全部成功；Run `34456226183`。 |

## 失败、处理与复验

首次隔离 E2E 的 21 项认证/视觉用例 PASS，3 项 readiness FAIL。诊断确认独立 API 启动命令未传入宿主 MinIO 实际端口，因而使用了默认 `localhost:9000`。补充 `S3_ENDPOINT=http://127.0.0.1:59000` 并使用新 Redis 前缀重启隔离环境，未修改任何候选文件；随后 24/24 认证、视觉与 readiness 全部 PASS。

## 设备、状态与未覆盖内容

- 设备：Windows + Chromium，375×812、834×1112、1440×1000。
- 状态：5 位校验错误、6 位成功、Session 恢复/失效、CSRF/Origin 失败、验证码重放、安全 return path、加载、ready 及无溢出。
- Linux Chromium 由远端 `e2e-auth` 覆盖功能；Windows 继续承担固定像素快照比对。
- 未覆盖真实短信供应商、正式法律文本、家庭与儿童业务；均为 Plan 明确非目标。

## 风险与集成要求

- 6 位最低长度的密码强度风险仍存在，由 Argon2id 和登录限流部分缓解，不应宣称与 12 位策略等价。
- 当前只是候选 Regression；用户验收后仍需 PR 合并、integrated digest 重算和独立集成复验。
- CI 失败或候选 owned scope 再变更将使本结论失效。

## 集成版本 Regression

`PASS`。PR #21 合并后，在精确 `origin/develop@7354720b400f098e539b65a6211756aaffa6b21e` 上独立复验：

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 版本与摘要 | PASS | PR Head `ec39b105…` 是 merge commit 祖先；accepted/integrated v2 digest 均为 `B20F1287…`，owned scope 无差异。 |
| 集成质量门禁 | PASS | `pnpm validate` exit 0；Lint、format、typecheck、13 API、9 Web、build、project validation 全通过。 |
| 契约与迁移 | PASS | OpenAPI 重生成 SHA-256 稳定为 `262694AC…`；`prisma migrate deploy` 无 pending migration。 |
| 响应式与安全 | PASS | 隔离 Redis/ports 下 375/834/1440 认证、视觉、CSRF/Origin、Session 撤销、readiness 24/24 通过。 |
| develop CI | PASS | Push run `34550845315` 对 merge commit 执行 Quality 并成功。 |

平台范围为 Windows 11、Docker Desktop Linux containers、本地 Chromium 与 GitHub Actions Linux Chromium。真实短信、正式法律文本、家庭和儿童业务仍为已声明非目标。
