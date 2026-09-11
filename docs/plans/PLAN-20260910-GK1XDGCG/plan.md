---
id: PLAN-20260910-GK1XDGCG
type: plan
title: "建立手机号认证与 Redis 服务端会话"
status: confirmed
created_at: 2026-09-10T13:23:11+08:00
updated_at: 2026-09-10T13:23:11+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260910-V9P4SBX8, SPEC-20260908-5BD26QCA, SPEC-20260910-TAMMQYAH]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户逐项确认账号、短信、会话、响应式、法律草案和完整质量 CI 默认决策，并明确要求 PLEASE IMPLEMENT THIS PLAN。"
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids: [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-BRANCH-GOVERNANCE
    version: 1
    rule_ids: [BRANCH-001, BRANCH-002, BRANCH-006, BRANCH-007, BRANCH-008, BRANCH-010]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 1
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007, TEST-008, TEST-009, TEST-010]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 1
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 1
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004]
---

# 建立手机号认证与 Redis 服务端会话

## 目标与依据

依据 `DES-20260910-V9P4SBX8` 与 `SPEC-20260910-TAMMQYAH`，交付手机号注册、密码/短信登录、找回密码、Redis Session、安全 Cookie、CSRF/Origin 防护、受保护路由和完整质量 CI，使后续家庭 Plan 可依赖真实账号上下文。

## 当前事实

- 基线 `origin/develop@1b22fa7b97155dd616442e1a34f4453b2cacfc39`，工作分支 `feature/auth-session-foundation`，集成目标 `origin/develop`。
- Prisma 尚无业务模型；API 仅有健康接口；Web 所有路径仍回退工程状态页。
- PostgreSQL、Redis、OpenAPI、React Router、TanStack Query、React Hook Form、Zod、Vitest/Jest/Playwright 已存在。
- 远端 preflight verified、工作树 clean，无活动 Plan 重叠；用户本轮没有新增需入 Rules 的长期规则候选。

## 范围与步骤

1. 创建账号/协议 migration、Redis 单例、认证配置与固定依赖。
2. 实现 Challenge、Delivery、限流、Argon2id、Session、CSRF、Origin 和 Auth API。
3. 扩展 Problem Details/OpenAPI/生成客户端，并保持健康接口兼容。
4. 实现认证页、法律草案、受保护账号页、404 与受控工程状态页，覆盖 375/834/1440。
5. 增加 API/Web/E2E 测试和只读完整质量 CI。
6. 运行迁移、lint、format、typecheck、test、build、e2e、Docker 和项目校验；绑定候选提交与 scope digest。
7. 完成 Review 和独立 Regression，进入 `acceptance_pending` 等待用户试玩；不自动合并或归档。

## 验收条件

- Spec 中 8 个 Auth API 与 OpenAPI/客户端一致；手机号、密码、Challenge、Session 和 CSRF 正负路径均通过。
- Redis 不可用不回退内存；验证码单次消费、过期、用途、尝试次数和限流参数有效。
- 密码重置和账号版本变化使旧 Session 失效；浏览器无 localStorage token，Cookie 属性符合环境边界。
- 登录、注册、找回、法律草案、受保护页、404、状态页在三视口无溢出，覆盖加载/成功/错误/限流/过期/会话失效及键盘焦点。
- CI 在 PR/push 执行 quality 与 auth e2e，固定 Action commit、最小权限、不使用真实秘密或个人数据。
- `pnpm validate`、Playwright、migration deploy、OpenAPI 确定性、完整栈和 `validate-project.ps1 -Check` 均通过；任何 FAIL/UNVERIFIED 阻止验收。

## 非目标与风险

- 不实现真实短信、正式法律文本、微信/OIDC/MFA、家庭或儿童业务；不修改 Ruleset required checks。
- production 未配置短信时验证码必须 503；开发模式不得在 production 启用。
- 原生 Argon2、Redis/Session 中间件顺序、跨源 Cookie 和 CI service containers 是重点 Review 风险。
- Plan B 只能在本 Plan 集成归档后从新鲜 develop 建立，不能提前占用重叠路径。

