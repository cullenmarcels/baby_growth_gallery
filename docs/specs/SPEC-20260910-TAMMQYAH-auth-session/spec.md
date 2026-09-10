---
id: SPEC-20260910-TAMMQYAH
type: spec
title: "手机号认证与 Redis 会话规格"
status: active
created_at: 2026-09-10T13:23:11+08:00
updated_at: 2026-09-10T13:23:11+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260910-V9P4SBX8, SPEC-20260908-5BD26QCA, PLAN-20260910-GK1XDGCG]
supersedes: []
superseded_by: []
---

# 手机号认证与 Redis 会话规格

## 目标

在现有 NestJS/React Monorepo 上交付中国大陆手机号注册、密码登录、短信验证码登录、找回密码和 Redis 服务端会话，为后续家庭权限提供可信账号上下文。

## 数据与密码

- PostgreSQL `Account` 保存 UUID、唯一 `phoneE164`、Argon2id `passwordHash`、可空 displayName、`ACTIVE|DISABLED`、authVersion、验证/改密/创建/更新时间。
- `LegalAcceptance` 保存账号、条款版本、隐私版本与确认时间；不保存 IP 或设备指纹。
- 密码允许 Unicode/空格，长度 12-128，不做字符组成强制；Argon2id 最低 `m=19456,t=2,p=1`。
- 手机号仅接受可规范化为中国大陆 `+86` 的号码；普通输出和日志只使用合成或脱敏值。

## 验证码与限流

- Challenge 保存在 Redis：6 位数字、5 分钟有效、最多 5 次验证、按手机号摘要与用途绑定、单次原子消费、新 Challenge 使旧 Challenge 失效。
- 同手机号 60 秒一次、每小时 5 次、每天 10 次；同 IP 每小时 20 次申请。
- 密码登录同账号 15 分钟最多 5 次，超限阻断 15 分钟；同 IP 15 分钟最多 30 次。
- Redis 只保存 keyed HMAC；key 不包含完整手机号。错误不得泄漏账号是否存在。
- Delivery 使用端口抽象；test 使用内存适配器，development 可显式启用固定非秘密验证码，production 禁止开发适配器且未配置真实供应商时返回 503。

## 会话、安全与配置

- `express-session` + `connect-redis`，`resave=false`、`saveUninitialized=false`；禁止内存 Store 回退。
- Session 保存 accountId、authVersion、authMethod、issued/lastSeen/absoluteExpiresAt、CSRF token；登录或权限变化重新生成 ID。
- Cookie 为 HttpOnly、SameSite=Lax、Path=/、无 Domain；HTTPS production 使用 Secure 与 `__Host-` 名称。本地非安全 Cookie 只允许 loopback origin 与显式开发模式。
- 未记住：12 小时空闲、24 小时绝对期限；记住：7 天空闲、30 天绝对期限。
- 状态修改校验 allowlist Origin 与 `x-csrf-token`；Token 使用 synchronizer pattern 保存在 Session。非幂等请求不自动重放。
- 密码重置递增 authVersion，使全部旧 Session 失效。

## API

| Method | Path | Contract |
| --- | --- | --- |
| GET | `/api/v1/auth/csrf` | `{ csrfToken }` |
| POST | `/api/v1/auth/verification-challenges` | `{ phone, purpose }` -> 202 `{ challengeId, expiresInSeconds, resendAfterSeconds }` |
| POST | `/api/v1/auth/register` | Challenge、code、password、条款版本 -> 201 AccountSummary + Session |
| POST | `/api/v1/auth/login/password` | phone、password、remember -> 200 AccountSummary + Session |
| POST | `/api/v1/auth/login/code` | Challenge、code、remember -> 200 AccountSummary + Session |
| GET | `/api/v1/auth/session` | 200 AccountSummary；无有效会话为 401 |
| POST | `/api/v1/auth/logout` | 销毁 Session -> 204 |
| POST | `/api/v1/auth/password/reset` | Challenge、code、newPassword -> 204 |

`AccountSummary` 只含 id、displayName、phoneMasked、activeFamilyId(null)。Problem Details 增加可选稳定 `code` 与 `violations[{field,code}]`，健康接口保持兼容。OpenAPI 是生成客户端唯一来源，所有浏览器请求默认 `credentials=include`。

## Web 行为

- `/` 按 Session 跳转 `/login` 或 `/app`；公开页为 login/register/forgot-password/legal；`/app` 受保护；未知路径为 404。
- return path 只接受站内绝对路径；Session 恢复期间不显示受保护内容。
- 实现密码和短信两种登录；微信/OIDC/MFA 不在范围。
- 工程状态页移至 `/system/status`，由构建变量显式启用，production 默认关闭。

## 非目标与上线边界

- 不实现真实短信供应商、公开运营法律文本、微信、家庭、宝宝、照片、里程碑或成长数据。
- 草案协议和开发验证码不能作为生产上线证据；production 未配置短信必须明确不可用。
- 不修改远端 Ruleset required checks；新增质量 CI 的失败会阻止本 Plan 归档。

