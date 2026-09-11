---
id: PLAN-20260911-X27F6QNT
type: plan
title: "建立家庭身份、成员权限、单次邀请与家庭动态基础"
status: confirmed
created_at: 2026-09-11T10:21:26+08:00
updated_at: 2026-09-11T10:21:26+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260911-9Z3KRKCQ, SPEC-20260910-VP1CDG7N, SPEC-20260911-3YV4GCRZ, ACH-20260910-JBD9BWHZ]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户逐项确认当前家庭自动选择、创建者失权自动撤销邀请、仅锁定未来事件码与信封、邀请接受限流 10 账号/30 IP，并明确要求实施完整 Plan B。"
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
    rule_ids: [BRANCH-001, BRANCH-002, BRANCH-003, BRANCH-004, BRANCH-005, BRANCH-006, BRANCH-007, BRANCH-008, BRANCH-009, BRANCH-010]
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

# 建立家庭身份、成员权限、单次邀请与家庭动态基础

## 目标、现状与边界

依据 `SPEC-20260911-3YV4GCRZ` 和 `DES-20260911-9Z3KRKCQ`，在已归档 Plan A 的账号、Session、CSRF 和 OpenAPI 基础上交付真实多家庭身份。当前 `origin/develop@701f26aef605ccac7c1bded89fcb0e3c5e53a54c` 只有 Account/LegalAcceptance、`activeFamilyId:null` 占位和受保护欢迎页，没有家庭表、权限、邀请或动态实现。

本 Plan 实现 Family、Membership、Invitation、Activity，13 个 API、Session 当前家庭修正、响应式应用壳、onboarding、家庭页面、邀请和成员管理、动态分页及完整测试。真实短信、家庭删除、所有权转移、宝宝/照片/成长来源模块和正式发布均为非目标。

## 实施顺序

1. 新增可前向部署的 Prisma migration、关系、部分唯一 OWNER 索引和生成客户端。
2. 实现 Family access/policy、Activity writer、Invitation/HMAC/Redis 限流和事务服务，扩展 Session activeFamilyId。
3. 实现已确认 API、Problem codes、Swagger/OpenAPI 和确定性 API client。
4. 建立响应式 AppShell、家庭切换、引导、家庭/成员/邀请/动态页面和未开放页面。
5. 补齐 API、Web 和 Playwright 的正常、权限、并发、分页、墓碑、安全与三视口矩阵。
6. 验证空库与 Plan A 库升级、OpenAPI 确定性、Docker readiness 和完整本地门禁，固定候选提交与 v2 scope digest。
7. Review 逐条覆盖本 Plan 固定规则；独立 Regression 通过后进入人工验收，不自动合并或归档。

## 验收条件

- 创建家庭原子产生唯一 OWNER 和 FAMILY_CREATED；账号可加入、切换多个家庭，Session 无效 ID 按 joinedAt/id 确定性修正。
- OWNER/ADMIN/MEMBER 权限矩阵、OWNER 不变量及未授权资源隐藏均由服务端执行。
- 12 位单次 7 天邀请只存 HMAC；并发只成功一次；失权自动撤销；账号/IP 限流和统一错误有效。
- 加入、角色变化、退出/移除与活动同事务；稳定 cursor 分页无重复遗漏；墓碑 API 不泄漏原内容。
- OpenAPI/生成客户端与 13 个接口一致，所有 mutation 继续执行 Session、Origin 和 CSRF。
- Web 完成 onboarding、多家庭切换、成员/邀请管理、动态与未开放页；375/834/1440 的正常、空、加载、错误、权限、冲突和墓碑状态无溢出且可键盘操作。
- Plan A 认证与状态页无回归；migration、lint、format、typecheck、test、build、E2E、validate、Docker 和 PR CI 全部 PASS。FAIL/UNVERIFIED 阻止验收。

## Review、Regression 与归档

- Review 绑定已提交候选和 v2 owned-scope digest，检查数据约束、事务、授权、秘密最小化、OpenAPI、UI 矩阵及全部适用 Rule。
- Regression 独立验证认证回归、家庭权限、邀请并发/限流、Session 修正、分页/墓碑、三视口、迁移和 Docker；不得以 Review 替代。
- 用户确认只绑定固定候选与 digest；目标、契约、权限或 owned scope 变化需修订 Plan 或重新验收。
- 只有得到具体 PR 合并授权、合并到 origin/develop、integrated digest 匹配且集成复验/CI 通过后才能归档并生成 Achievement。

## 风险与默认决定

- Session 不持久化账号级最近家庭，新 Session 自动选择 joinedAt/id 最新 ACTIVE Membership。
- 失权创建者的未用邀请自动撤销；接受限流固定账号 10/15m、IP 30/15m。
- 后续五类 Activity 现在只固定事件码与信封，payload 留给来源 Plan。
- 原家庭截图中的持久明文口令被一次性安全面板替代；1024 px 是应用壳断点，834 使用底部导航。
- Redis 或数据库中途故障可能使请求明确失败；不得回退到内存状态或伪造成功。
