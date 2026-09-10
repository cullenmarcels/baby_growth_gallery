---
id: PLAN-20260910-JBD9BWHZ
type: plan
title: "修订认证密码最小长度并重新形成候选"
status: confirmed
created_at: 2026-09-10T16:23:24+08:00
updated_at: 2026-09-10T16:23:24+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260910-V9P4SBX8, SPEC-20260910-TAMMQYAH, SPEC-20260910-VP1CDG7N, PLAN-20260910-GK1XDGCG]
supersedes: [PLAN-20260910-GK1XDGCG]
superseded_by: []
confirmed_by: user
confirmation_basis: "用户明确提出：需求调整：将密码的位数限制为‘至少6位及以上’。"
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

# 修订认证密码最小长度并重新形成候选

## 目标与依据

依据用户最新明确需求和 `SPEC-20260910-VP1CDG7N`，把注册、密码登录与找回密码的密码长度统一调整为 6–128 个字符，并重新完成原认证阶段的完整候选、Review、Regression 与人工验收流程。原设计 `DES-20260910-V9P4SBX8` 的布局和交互状态继续有效，无需创建视觉修订。

## 当前事实

- 原 Plan `PLAN-20260910-GK1XDGCG` 的候选 `72e30f1f…` 已通过 Review，但尚未完成 Regression 或人工验收。
- 用户的新密码长度要求改变了接口、UI 和验收契约，必须新建 Spec/Plan 修订；旧候选证据保留但不再有效用于最终验收。
- 继续使用基线 `origin/develop@1b22fa7b97155dd616442e1a34f4453b2cacfc39`、工作分支 `feature/auth-session-foundation`、PR #21 与集成目标 `origin/develop`。
- 远端 preflight verified，变更前工作树 clean；旧 Plan 同步进入 superseded 后不存在活动 owned-path 重叠。
- 本次产品特定密码策略不构成跨项目通用 Rules 候选。

## 范围与步骤

1. 创建替代 Spec，保持除密码最小长度外的认证、会话、安全、API、响应式和上线边界不变。
2. 将 API Zod 校验、Swagger/OpenAPI、生成客户端与 Web Zod/提示统一为最少 6、最多 128 个字符。
3. 增加 5 位拒绝、精确 6 位注册/登录/改密成功及原有长口令兼容的测试证据。
4. 重新生成 OpenAPI，运行 lint、format、typecheck、test、build、E2E、项目校验、迁移与完整栈回归。
5. 提交并推送新候选，在 PR #21 取得完整 CI 成功后重新绑定 v2 owned-scope digest。
6. 完成独立 Review、Regression 后进入 `acceptance_pending`，等待用户对新候选试玩确认；不自动合并或归档。

## 验收条件

- 注册、密码登录、密码重置的服务端与 OpenAPI 均为 `minLength: 6`、`maxLength: 128`；前端显示“密码至少需要 6 个字符”。
- 5 位输入在验证码消费/数据写入前被拒绝，精确 6 位输入可完成注册、密码登录和密码重置，129 位仍被拒绝。
- Unicode、空格和更长口令继续允许；不增加组成规则、不静默截断。
- Argon2id `m=19456,t=2,p=1`、登录限流、Challenge、Redis Session、CSRF/Origin、Cookie、authVersion 撤销等原安全契约无回归。
- 登录、注册、找回、法律草案、受保护页、404、状态页在 375/834/1440 的既有正常/加载/错误/限流/过期/会话状态继续通过。
- OpenAPI 确定性、迁移、Docker 完整栈、本地门禁、PR `branch-flow-develop`、`quality`、`e2e-auth` 均 PASS；FAIL/UNVERIFIED 阻止验收。

## Review 与 Regression

- Review 必须绑定新候选提交与 v2 owned-scope digest，逐项复核 59 条适用 Rule、密码边界、生成契约和旧安全机制。
- Regression 必须独立复跑认证关键路径、三视口、状态页、迁移、Docker 与项目治理校验，并记录与旧 Review 候选的差异。
- 用户确认只对新候选提交及摘要有效；密码策略或 owned scope 再变化时确认失效。

## 非目标、风险与归档门槛

- 不实现真实短信、正式法律文本、微信/OIDC/MFA、家庭或儿童业务；不修改远端 Ruleset required checks。
- 6 位最低长度较旧策略弱，保留最大长度、Argon2id 和速率限制，并允许用户使用更长口令；本 Plan 不擅自恢复到 12 位。
- 只有新候选 Review/Regression、用户明确验收、PR 合并到 `develop`、integrated digest 复核与集成回归全部通过后才能归档；Plan B 此前仍不得开始。
