---
id: PLAN-20260910-GK1XDGCG-EXEC
type: execution_log
title: "手机号认证与 Redis 会话执行记录"
status: open
created_at: 2026-09-10T13:23:11+08:00
updated_at: 2026-09-10T15:48:00+08:00
plan_id: PLAN-20260910-GK1XDGCG
related_ids: [PLAN-20260910-GK1XDGCG, DES-20260910-V9P4SBX8, SPEC-20260910-TAMMQYAH]
supersedes: []
superseded_by: []
---

# 执行记录

## 修改前门禁

- 已读取 AGENTS、Docs/Rules 协议、Planning/Development 菜单及 Plan 固定的 Source、Repository、Git、Branch、Implementation、Testing、Responsive、Security 模块。
- 用户最新消息是对已逐项确认方案的实施授权，不构成新的长期 Rule 候选。
- 远端 preflight：git_remote、verified、clean、无 blocking reason 或 active Plan overlap。
- 从 `origin/develop@1b22fa7b97155dd616442e1a34f4453b2cacfc39` 创建 `feature/auth-session-foundation`；未改写或删除其他成员分支。
- 实际适用 Rules 与 `plan.md` 固定清单一致。

## 状态变化

| 时间 | 原状态 | 新状态 | 原因 |
| --- | --- | --- | --- |
| 2026-09-10T13:23:11+08:00 | — | confirmed | 用户明确要求实施完整确认方案。 |
| 2026-09-10T13:31:00+08:00 | confirmed | in_progress | 修改前门禁通过，开始 Plan A Development。 |
| 2026-09-10T15:34:59+08:00 | in_progress | in_review | 实现、迁移、三视口 E2E、视觉基线与 Docker 部署态候选门禁通过，固定候选进入 Review。 |

## 实施记录

### 数据、认证与安全基础

- 新增首个前向 Prisma migration：`Account`、`AccountStatus` 与 `LegalAcceptance`；手机号唯一、密码只存 Argon2id 哈希、法律接受不采集 IP 或设备指纹。
- Redis 改为应用级单例，readiness、Session、Challenge 与限流复用；启动阶段连接失败会在有限重试后退出，未回退内存 Store。
- 新增 6 位、5 分钟、用途绑定、旧 Challenge 失效、最多 5 次、原子单次消费的验证码模型；Redis 仅保存 keyed HMAC 和手机号摘要。
- 新增手机号/用途/IP 验证码限流及账号/IP 密码登录限流；成功密码登录只清账号失败计数。
- 固定 Argon2id `19 MiB / 2 / 1`；Windows 候选机三次哈希为 `25/24/24 ms`，未提高或降低参数。
- 实现 Redis Session、环境隔离 Cookie 名、HttpOnly/SameSite/Path、Secure 生产门禁、显式 Trust Proxy、12h/24h 与 7d/30d 会话边界、Session regenerate、退出销毁及 `authVersion` 全局撤销。
- 实现全 mutation Origin + `csrf-sync` 同步 Token 防护；登录/注册 regenerate 后旧 Token 失效且客户端重新取得 Token，不自动重放 mutation。

### API、客户端与 Web

- 实现 Spec 固定的 8 个 `/api/v1/auth/*` 接口，统一 `code`/`violations` Problem Details，并保持健康接口兼容。
- OpenAPI 增加 request body、成功/错误响应和可空字段；生成脚本支持 request body、nullable 与无内容响应，`createApiClient` 默认携带凭据并仅在内存保存 CSRF Token。
- 实现 `/login`、`/register`、`/forgot-password`、两份法律草案、受保护 `/app`、开发态 `/system/status` 和 404；没有微信伪入口或宝宝/家庭伪数据。
- 响应式认证壳在 `>=1024px` 使用桌面双栏，在更窄视口使用单栏；补齐键盘提交、焦点、密码显隐、倒计时、错误摘要、重复提交防护和 reduced-motion。
- 新增只读 `quality.yml`，固定 checkout/setup-node/upload-artifact commit，拆分 quality 与 PostgreSQL/Redis `e2e-auth` Job，不修改远端 required checks。
- CI 功能 E2E 在 Linux 运行；视觉回归绑定本 Plan 要求的 Windows + Chromium 候选环境并在 CI 明确跳过，避免跨平台字体栅格差异制造伪回归。

### 开发期验证

| 检查 | 结果 | 证据摘要 |
| --- | --- | --- |
| `pnpm validate` | PASS / exit 0 | lint、format、typecheck、12 API tests、9 Web tests、build、项目校验全部通过。 |
| OpenAPI 连续生成哈希 | PASS | `OPENAPI_DETERMINISTIC=True`。 |
| 空库 migration deploy | PASS | 首次应用 `20260910134000_auth_session_foundation`；再次执行无 pending migration。 |
| Redis 故障启动 | PASS | 不可达端口在有限重试后 `REDIS_FAILURE_EXIT=1`，无内存回退。 |
| 本地真实认证 E2E | PASS | 375/834/1440；15 个认证测试通过，覆盖 regenerate、重放、密码重置撤销、密码/验证码登录、Cookie 和受保护内容。 |
| 完整浏览器 E2E | PASS | 30 个通过、3 个部署态条件检查跳过；认证和状态页三视口通过。 |
| 视觉基线 | PASS | 登录/注册各 375/834/1440 共 6 张基线，经人工查看无溢出、无真实个人数据。 |
| Docker 完整栈 | PASS | Linux 镜像 frozen install、Argon2 原生构建、API/Web/三项基础设施 health 全通过。 |
| Docker 部署态 E2E | PASS | 24 个通过、9 个仅开发状态页用例按既定生产隐藏规则跳过；浏览器跨源 readiness 与真实认证通过。 |

### 已处理偏差与环境事实

- Windows 默认 PostgreSQL 宿主端口 `5432` 被系统占用/保留；验证改用隔离端口 `55432`，Redis/MinIO/API/Web 同步使用隔离宿主端口，容器内部标准端口和提交配置未改变。
- 首次 Docker 冷构建因 npm TLS 连接被对端重置失败；同一 frozen lockfile 重试后成功，不跳过供应链校验。
- 首轮三视口测试暴露手机号断言固定值错误；改为从各合成手机号推导脱敏结果后复验通过。
- 首轮部署态回归错误访问生产构建中按设计隐藏的 `/system/status`；测试改为由生产 Web 页面直接跨源请求 readiness，开发状态页用例在部署态明确跳过，复验通过。
- 候选收口时发现 Playwright 的 API 子进程未显式透传外层数据库、Redis 和隔离前缀，导致本地持久测试库复跑出现合成账号 409；现已固定透传，并将合成手机号改为每次随机生成，连续候选复验恢复为 30 通过、3 条部署态检查跳过。
- PR #21 首次远端 `quality` 在全新 Linux checkout 的 Lint 步骤失败：被忽略的 Prisma Client 尚未生成，使类型感知规则把 Prisma 调用识别为 unsafe；已在 `quality` 和独立 `e2e-auth` Job 的静态检查/迁移前显式生成 Prisma Client，原候选不再作为最终 Review 对象。
- 为避免测试运行间限流污染，仅清除了本次创建的隔离 Redis 测试库临时键；未删除 PostgreSQL 记录或任何用户数据。
- 候选提交前重新刷新 `origin`，`origin/develop` 仍为固定基线 `1b22fa7b97155dd616442e1a34f4453b2cacfc39`，当前分支相对基线为 `0/0`。

当前没有功能范围偏差；真实短信供应商、正式法律文本、家庭与儿童业务仍按 Plan 明确留后。
