---
id: PLAN-20261111-4TX2SW6A
type: plan
title: 家庭专用账号与三级权限修订
status: confirmed
created_at: 2026-11-11T12:00:00+08:00
updated_at: 2026-11-11T12:00:00+08:00
related_ids: [SPEC-20261111-5ZY6HCR3, DES-20261111-Q14HTQJ4, PLAN-20261030-7HNVR9E5]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: '用户明确要求 PLEASE IMPLEMENT THIS PLAN。'
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids: [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 2
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 2
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004, SAFE-005]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 2
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006, RESP-007]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007, TEST-008, TEST-009, TEST-010]
---

# 家庭专用账号与三级权限修订

1. 重做账号凭据、受限首次会话、部署端超管命令和前向迁移。旧账号数据不带入。
2. 建立超管及家庭管理员管理契约，保护末位有效家管、事务一致性及多家庭内容隔离。
3. 实现登录、首次改密、两个独立管理页面及等待入户状态。退役验证码、邀请、旧登录契约。
4. 使用受控账号夹具验证三视口和角色边界。通过项目校验、OpenAPI 生成检查及隔离 Compose 重建后，按备份与回退步骤处理明确核实的本地开发环境。
5. 独立记录候选 Review 和 Regression。人工验收和集成分别绑定精确候选和作用域摘要。

依赖 Plan H 的已合并提交 2bf30dc。与 H 的重叠仅用于统一移除旧认证契约和替换测试开户夹具，保留 H 的首页功能、已验收提交和归档证据。
