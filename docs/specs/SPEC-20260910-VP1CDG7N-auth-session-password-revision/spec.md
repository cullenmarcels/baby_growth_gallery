---
id: SPEC-20260910-VP1CDG7N
type: spec
title: "手机号认证与 Redis 会话规格（密码长度修订）"
status: active
created_at: 2026-09-10T16:23:24+08:00
updated_at: 2026-09-10T16:23:24+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260910-V9P4SBX8, SPEC-20260908-5BD26QCA, SPEC-20260910-TAMMQYAH, PLAN-20260910-GK1XDGCG, PLAN-20260910-JBD9BWHZ]
supersedes: [SPEC-20260910-TAMMQYAH]
superseded_by: []
---

# 手机号认证与 Redis 会话规格（密码长度修订）

## 修订说明与目标

本规格完整替代 `SPEC-20260910-TAMMQYAH`。用户在原候选 Review 通过、尚未验收时明确将密码限制调整为“至少 6 位及以上”；本修订唯一有意改变的产品策略是把密码最小长度从 12 个字符降为 6 个字符，最大长度、哈希、会话撤销、限流及其他认证安全边界不变。

在现有 NestJS/React Monorepo 上交付中国大陆手机号注册、密码登录、短信验证码登录、找回密码和 Redis 服务端会话，为后续家庭权限提供可信账号上下文。

## 数据与密码

- PostgreSQL `Account` 保存 UUID、唯一 `phoneE164`、Argon2id `passwordHash`、可空 displayName、`ACTIVE|DISABLED`、authVersion、验证/改密/创建/更新时间。
- `LegalAcceptance` 保存账号、条款版本、隐私版本与确认时间；不保存 IP 或设备指纹。
- 密码允许 Unicode、空格和长口令，长度 6–128 个字符，不做字符组成强制，不静默截断；5 个或更少字符必须拒绝，6 个字符必须允许进入注册、密码登录和密码重置流程。
- Argon2id 最低参数保持 `m=19456,t=2,p=1`；降低输入最小长度不得降低哈希参数或绕过限流。
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

注册、密码登录和密码重置的 OpenAPI 输入约束必须统一为 `minLength: 6`、`maxLength: 128`；服务端仍是最终校验边界，前端提示必须与其一致。

`AccountSummary` 只含 id、displayName、phoneMasked、activeFamilyId(null)。Problem Details 增加可选稳定 `code` 与 `violations[{field,code}]`，健康接口保持兼容。OpenAPI 是生成客户端唯一来源，所有浏览器请求默认 `credentials=include`。

## Web 行为

- `/` 按 Session 跳转 `/login` 或 `/app`；公开页为 login/register/forgot-password/legal；`/app` 受保护；未知路径为 404。
- return path 只接受站内绝对路径；Session 恢复期间不显示受保护内容。
- 注册和找回密码页对 5 位密码显示“密码至少需要 6 个字符”，6 位输入不再触发长度错误；密码登录也使用相同边界。
- 实现密码和短信两种登录；微信/OIDC/MFA 不在范围。
- 工程状态页移至 `/system/status`，由构建变量显式启用，production 默认关闭。

## 验收边界

- 服务端、Web Schema、OpenAPI 和生成客户端的密码长度契约一致。
- 5 位密码在消费验证码或写入账号前返回字段校验错误；同一尚有效 Challenge 随后可用于 6 位密码注册。
- 精确 6 位密码可注册、密码登录和重置；129 位密码仍被拒绝；Unicode、空格及 12 位以上长口令继续有效。
- 原规格的 Session regenerate、CSRF/Origin、验证码单次消费、authVersion 撤销、Cookie、限流、三视口和 CI 验收项全部继续通过。

## 非目标与上线边界

- 不实现真实短信供应商、公开运营法律文本、微信、家庭、宝宝、照片、里程碑或成长数据。
- 草案协议和开发验证码不能作为生产上线证据；production 未配置短信必须明确不可用。
- 6 位最低长度降低了单个短密码的抗猜测强度；产品决策由登录限流和 Argon2id 部分缓解，但不等同于强口令。界面允许并鼓励用户使用更长口令，不设置 6 位固定长度或仅数字限制。
- 不修改远端 Ruleset required checks；新增质量 CI 的失败会阻止本 Plan 归档。
