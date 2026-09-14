---
id: PLAN-20260911-JBANR2J8
type: plan
title: "修订家庭邀请中文错误与撤销确认"
status: confirmed
created_at: 2026-09-11T15:18:21+08:00
updated_at: 2026-09-11T15:18:21+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260911-9Z3KRKCQ, SPEC-20260911-3YV4GCRZ, PLAN-20260911-X27F6QNT]
supersedes: [PLAN-20260911-X27F6QNT]
superseded_by: []
confirmed_by: user
confirmation_basis: "用户在 Plan B 人工验收中明确要求：所有显示到页面上的错误提示均使用中文；撤销邀请口令前必须二次确认，并排查撤销后口令是否失效。"
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
    version: 2
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006, IMPL-007]
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

# 修订家庭邀请中文错误与撤销确认

## 目标、依据与当前事实

依据用户最新人工验收意见、`SPEC-20260911-3YV4GCRZ` 和 `DES-20260911-9Z3KRKCQ`，修复家庭邀请的用户错误文案与撤销交互，并重新形成 Plan B 候选。原候选 `3b8b92f…` 已证明家庭主体能力和后端撤销标记有效，但页面会直接显示英文 Problem Details，撤销按钮也会立即执行。

继续使用工作分支 `feature/family-identity-foundation`、PR #22 与集成目标 `origin/develop`。修订基线固定为该分支 clean 提交 `805a979d3927c828127c441b3fd5c07e48aa8768`；不修改已归档 Plan A、Achievement 或归档哈希。

## 范围与步骤

1. 将所有 Web 用户错误出口统一到稳定错误码的中文映射；未知异常只显示中文兜底，不渲染原始英文详情。
2. `ALREADY_FAMILY_MEMBER` 显示明确中文提示，并保持服务端“不消费有效邀请”的既有事务语义。
3. 邀请撤销先打开键盘可操作的二次确认对话框；确认后才调用 API，取消不产生 mutation。
4. 补充组件与真实 API/E2E 证据，验证撤销后列表移除、重复撤销幂等、旧口令统一返回 `INVITATION_INVALID`，并验证创建者自用失败后邀请仍可由其他账号使用。
5. 重新运行规则、代码、测试、构建、三视口、Docker、OpenAPI 与项目校验，固定新候选、Review、Regression 和 PR CI 后返回人工验收。

## 验收条件

- 创建者使用自己的有效邀请重复加入时，页面只显示中文“你已经是这个家庭的成员，无需重复加入。”，不出现英文服务端详情。
- 所有页面错误使用中文；已知 API code 映射为对应中文，未知 API/网络/底层错误使用中文兜底。
- 点击邀请“撤销”只打开确认对话框；取消不调用 API，确认后调用一次，成功提示中文且邀请从有效列表消失。
- 已撤销口令不能再加入家庭，统一返回 `400 INVITATION_INVALID`；重复撤销保持 `204` 幂等。
- 自己重复加入的 `409 ALREADY_FAMILY_MEMBER` 不消费邀请，随后另一个非成员账号仍可成功使用同一口令。
- 现有家庭权限、Session、活动、认证、CSRF、三视口和 Docker readiness 无回归；本地门禁和 PR #22 CI 全部 PASS。

## Review、Regression、风险与归档

- Review 绑定新提交与 v2 owned-scope digest，逐条核对 64 条固定 Rule，重点检查所有用户错误出口、确认对话框可访问性与撤销事务证据。
- Regression 独立复跑 Plan B 家庭关键路径、Plan A 认证回归、375/834/1440、Docker 和项目知识库校验。
- API Problem Details 保持可诊断的稳定 code 与中性 detail；中文是 Web 展示契约，避免客户端依赖英文字符串。
- 不实现新的邀请角色、真实短信、家庭删除或其他业务模块。只有新候选通过 Review/Regression/CI 并获得用户明确验收与合并授权后，才可集成归档。
