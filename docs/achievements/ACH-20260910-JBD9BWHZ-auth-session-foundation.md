---
id: ACH-20260910-JBD9BWHZ
type: achievement
title: "手机号认证与 Redis 服务端会话：完成归档"
status: archived
created_at: 2026-09-11T09:31:53+08:00
updated_at: 2026-09-11T09:31:53+08:00
related_ids: [PLAN-20260910-JBD9BWHZ, PLAN-20260910-JBD9BWHZ-EXEC, PLAN-20260910-JBD9BWHZ-REVIEW, PLAN-20260910-JBD9BWHZ-REGRESSION, PLAN-20260910-JBD9BWHZ-ACCEPTANCE, PLAN-20260910-GK1XDGCG, SPEC-20260910-VP1CDG7N, SPEC-20260910-TAMMQYAH, DES-20260910-V9P4SBX8, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-GIT-COLLABORATION, RULESET-BRANCH-GOVERNANCE, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-RESPONSIVE-UI, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260910-JBD9BWHZ
confirmed_by: user
confirmed_at: 2026-09-11T09:31:53+08:00
archived_at: 2026-09-11T09:31:53+08:00
confirmation_record: "确认验收候选 b8a36f4，并授权合并 PR #21 到 develop"
repository_mode: git_remote
reviewed_commit: b8a36f4795c0378fe6652fc249ade83dc1c47104
reviewed_scope_digest: 042C04A117C6B02B7FAC7264A32B81994C012B6AAE15B7BA468CD0A8AD1DE27D
accepted_commit: ec39b105cd868fb08132a1f076d5161072f7fc5b
accepted_scope_digest: B20F1287996C98151E1CDBC5BFA8A7368387D107AC8B15CFCE161F385B538801
integrated_commit: 7354720b400f098e539b65a6211756aaffa6b21e
integrated_scope_digest: B20F1287996C98151E1CDBC5BFA8A7368387D107AC8B15CFCE161F385B538801
scope_digest_version: 2
ci_status: configured_scope_passed
platform_scope: windows11-docker-github-actions
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/21
---

# `ACH-20260910-JBD9BWHZ` — 手机号认证与 Redis 会话基础

## 归档摘要

- 对应修订 Plan：[`PLAN-20260910-JBD9BWHZ`](../plans/PLAN-20260910-JBD9BWHZ/plan.md)。
- 原认证 Plan `PLAN-20260910-GK1XDGCG` 因用户在验收前将密码最小长度从 12 修订为 6 而 superseded；历史 Review 证据保留。
- Review：[`passed`](../plans/PLAN-20260910-JBD9BWHZ/review-report.md)。
- 候选与集成 Regression：[`passed`](../plans/PLAN-20260910-JBD9BWHZ/regression-report.md)。
- 用户于 `2026-09-11T09:31:53+08:00` 明确验收实现候选并授权合并 PR #21 到 develop。
- Accepted 与 integrated v2 scope digest 相同，合并过程未改变验收范围。

## 已交付功能

### 账号、密码与法律接受

- PostgreSQL `Account` 和 `LegalAcceptance` 的首个前向 Prisma migration。
- 中国大陆 `+86` 手机号注册、密码登录、验证码登录和短信找回密码。
- 密码允许 Unicode、空格和长口令，最终长度策略为 6–128 个字符，不静默截断或强制组成。
- Argon2id 参数保持 `m=19456,t=2,p=1`；密码重置递增 `authVersion` 并撤销全部旧 Session。
- 协议与隐私页面明确标记为待正式审核草案。

### 验证码、Redis 与限流

- Redis 应用级单例被 Session Store、Challenge、限流和 readiness 共享；不可用时不回退到内存会话。
- 6 位验证码、5 分钟有效、最多 5 次尝试、用途绑定、新 Challenge 使旧 Challenge 失效、成功后原子单次消费。
- Redis 仅保存 keyed HMAC 和手机号摘要，不保存验证码明文或把完整手机号放入 key。
- 实现手机号/IP 验证码限流和账号/IP 密码登录限流。
- `VerificationDeliveryPort` 隔离供应商；开发/测试使用固定或内存适配器，production 禁止固定验证码且未配置真实短信时返回 503。

### Session、CSRF 与 API

- Redis 服务端 Session，不在 localStorage 保存认证 token。
- HttpOnly、SameSite=Lax、Path=/ 且无 Domain 的 Cookie；production 使用 Secure 与 `__Host-` 前缀。
- 登录/注册后 regenerate，退出销毁，空闲/绝对期限和 remember-me 差异有效。
- 全部 mutation 执行 Origin allowlist 和 `x-csrf-token` synchronizer 防护。
- 实现 8 个 Auth API、扩展 Problem Details，OpenAPI 作为确定性客户端唯一来源。

### Web、响应式与 CI

- 实现 `/login`、`/register`、`/forgot-password`、`/legal/*`、受保护 `/app`、开发态 `/system/status` 和 404。
- 处理 Session 启动恢复、安全 return path、过期退出、倒计时、错误/限流、键盘焦点、aria-live 和 reduced-motion。
- 375/834/1440 分别实现单栏/双栏认证布局，无横向溢出。
- GitHub Actions `quality.yml` 使用最小权限、固定 Action SHA、Node 24.20.0、pnpm 11.21.0、PostgreSQL 18.6、Redis 8.4 和 Chromium。

## Review、Regression 与版本绑定

- Reviewed candidate：`b8a36f4795c0378fe6652fc249ade83dc1c47104`；v2 digest：`042C04A117C6B02B7FAC7264A32B81994C012B6AAE15B7BA468CD0A8AD1DE27D`。
- 用户验收时的最终 PR Head：`ec39b105cd868fb08132a1f076d5161072f7fc5b`；v2 digest：`B20F1287996C98151E1CDBC5BFA8A7368387D107AC8B15CFCE161F385B538801`。
- GitHub merge commit：`7354720b400f098e539b65a6211756aaffa6b21e`；v2 digest：`B20F1287996C98151E1CDBC5BFA8A7368387D107AC8B15CFCE161F385B538801`。
- 候选 `pnpm validate` 及独立 Regression 通过；PR #21 的 branch-flow、quality、e2e-auth 通过。
- 集成 `pnpm validate` 通过；API 13/13、Web 9/9、三视口集成 E2E 24/24、OpenAPI 确定性、migration deploy 和 develop Quality run `34550845315` 通过。

## 已处理偏差与保留边界

- 用户将密码最小长度从 12 修订为 6 后，建立新 Spec/Plan，原候选和历史 Review 保留而不改写。
- 密码最小 6 位较原策略弱；Argon2id 和登录限流只能部分缓解，不宣称安全等价，应继续鼓励长口令。
- 人工预览曾混用 `127.0.0.1` 和 `localhost`，导致 SameSite Cookie 无法维持 Challenge；统一 host 并使用新 Redis 前缀后相同流程通过，产品候选未改动。
- 真实短信服务商未接入；当前仅开发/测试固定码和内存适配器。
- 法律文本仍为草案；未实现微信/OIDC/MFA、家庭、宝宝、照片、里程碑或成长数据。
- Node 24 下固定 `libphonenumber-js` 的 Jest JSON import deprecation warning 不影响当前通过结果；升级依赖时需复核。

## 关联证据

- Spec：[`SPEC-20260910-VP1CDG7N`](../specs/SPEC-20260910-VP1CDG7N-auth-session-password-revision/spec.md)。
- Design：[`DES-20260910-V9P4SBX8`](../designs/DES-20260910-V9P4SBX8-auth-session-ui/design.md)。
- Plan：[计划正文](../plans/PLAN-20260910-JBD9BWHZ/plan.md)。
- Execution：[执行记录](../plans/PLAN-20260910-JBD9BWHZ/execution-log.md)。
- Review：[Review Report](../plans/PLAN-20260910-JBD9BWHZ/review-report.md)。
- Regression：[Regression Report](../plans/PLAN-20260910-JBD9BWHZ/regression-report.md)。
- Acceptance：[Acceptance Record](../plans/PLAN-20260910-JBD9BWHZ/acceptance-record.md)。

## 人工确认与不可变状态

- 确认主体：用户。
- 原始确认语义：“确认验收候选 b8a36f4，并授权合并 PR #21 到 develop”。
- 归档时间：`2026-09-11T09:31:53+08:00`。
- 最终状态：`archived`。

本 Achievement 及对应 Plan 包从归档提交进入 `origin/develop` 起永久只读。后续短信供应商、家庭身份或其他功能必须创建新 Plan，不得改写本归档。
