---
id: PLAN-20261111-V6ACAR8T
type: plan
title: 超管后台改版
status: confirmed
created_at: 2026-11-11T15:30:14+08:00
updated_at: 2026-11-11T15:30:14+08:00
related_ids: [PLAN-20261111-4TX2SW6A, DES-20261111-9KTXT0TA, SPEC-20261111-H7J6WEKD]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: '用户明确要求 PLEASE IMPLEMENT THIS PLAN 并提供超管后台改版计划。'
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

# 超管后台改版

现有超管账号和家庭操作集中在同一个页面。本修订使用独立路由、深色导航、列表和详情，覆盖管理页面及必要的读接口。家管页面沿用当前流程，账号会话规则、成员变更写接口和本地数据切换计划继续按前序计划执行。

1. 按 DES-20261111-9KTXT0TA 实现成员、家庭列表和可直达详情。验证三视口布局、导航和账户菜单。
2. 两类列表支持搜索、筛选及每页 20 条。验证加载、失败重试、空态和详情返回后恢复 URL 状态。
3. 按 SPEC-20261111-H7J6WEKD 增加仅超管可读取的账号详情和家庭列表计数。生成 OpenAPI 客户端。验证停用账号的有效家庭关系仍计入人数，以及普通账号和家管的页面与接口拦截。
4. 验证开户、临时密码当次展示、建家、成员详情跨模块跳转、首位家管任命及末位保护。复用现有写接口与权限。跨模块操作和家庭角色切换在隔离数据中演练。
5. 在 375、834、1440 像素运行端到端回归，并执行 pnpm validate 与 OpenAPI 一致性检查。记录工作区结果。正式 Review、Regression、验收与归档绑定候选提交和范围摘要，分别记录验收、集成及复验。

本计划在 PLAN-20261111-4TX2SW6A 的受管账号实现上顺序实施，并协调共享文件。隔离环境的合成数据用于回归，现有本地账号及照片数据无需迁移。
