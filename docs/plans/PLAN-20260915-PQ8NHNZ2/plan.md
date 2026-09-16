---
id: PLAN-20260915-PQ8NHNZ2
type: plan
title: "建立多宝宝档案与当前宝宝会话基础"
status: confirmed
created_at: 2026-09-15T10:21:58+08:00
updated_at: 2026-09-15T10:21:58+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260911-9Z3KRKCQ, DES-20260915-S2PV4FM8, SPEC-20260911-3YV4GCRZ, SPEC-20260915-8RKJ7RGM]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户确认按 Plan C–H 顺序拆分，并于 2026-09-15 明确指示‘确认计划，开始实施’。"
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

# 建立多宝宝档案与当前宝宝会话基础

## 目标、基线与范围

在 `origin/develop@b3b12b0e588873853b71960c23ded0cc1a62dcc3` 和已归档家庭身份基础上，交付可实际创建、查看、编辑、切换、归档和恢复的多宝宝档案，并把当前宝宝纳入 Redis Session。工作分支固定为 `feature/baby-profile-foundation`，集成目标固定为 `origin/develop`。

本 Plan 新增一份前向 Prisma migration、Baby API/服务/维护任务、Session/OpenAPI 客户端扩展、宝宝引导与管理 UI、三视口测试和项目文档证据；根级 `playwright.config.ts` 仅用于隔离本 Plan 的完整 E2E Redis key 与代理 IP 测试语义。已归档 Plan/Achievement/归档哈希永久只读。

## 实施步骤

1. 新增 `BabyProfile`、状态 enum、家庭/成员关系和归档清理索引；空库和 Plan B 数据库均可前向部署。
2. 集中实现 Baby Policy、CRUD、activate、archive、restore 与确定性回退；所有请求重新校验 ACTIVE Membership，OWNER/ADMIN 管理，MEMBER 只读/切换。
3. Session 增加 `activeBabyId`，登录、会话恢复、家庭激活、宝宝激活和归档后统一修正；`AccountSummary` 同步扩展。
4. 增加数据库驱动的每小时维护任务，以 PostgreSQL advisory lock 批量清理超过 30 天的归档宝宝；任务幂等、可重试，不引入队列。
5. 实现宝宝创建、编辑、切换、归档和恢复界面；无宝宝时按角色展示创建引导或等待管理员中文空状态；375/834/1440 同期完成。
6. 更新 OpenAPI/生成客户端、API/Web/Playwright 测试、README、AGENTS 和中央索引，记录执行证据并形成固定候选。

## 验收条件

- 一个家庭可创建多个同名宝宝；昵称 trim 后 1–30 字符，生日必填且不在未来，性别可不填。
- OWNER/ADMIN 可创建、编辑、归档和恢复；MEMBER 可查看和激活，但管理 mutation 返回 403。
- 未加入家庭、跨家庭 babyId 和已清理宝宝统一隐藏存在性；前端只显示中文错误。
- `activeBabyId` 仅存在于当前 Session；无效时按当前家庭 `(createdAt DESC,id DESC)` 回退，切换家庭不会保留其他家庭宝宝。
- 归档当前宝宝后立即回退；30 天内可恢复，达到边界后不可恢复并由幂等任务永久清理。
- 现有认证、家庭、邀请、Activity、CSRF、Session 有效期、Docker readiness 和三视口应用壳无回归。
- OpenAPI 确定生成；完整本地门禁、Review、独立 Regression 和 PR CI 无 FAIL/UNVERIFIED 后才进入人工验收。

## 非目标、风险与交付

- 不实现头像上传、照片、视频、里程碑、成长数据、首页聚合、评论、反应、真实短信、正式法律文本、家庭删除或所有权转移。
- Plan C 的清理任务目前只删除宝宝档案；后续 Plan 在各自 migration/服务中扩展关联内容和对象清理，不能提前创建空业务表。
- 日期使用数据库 `date`，30 天清理期限使用 UTC 时间戳；页面按用户本地日期输入和展示。
- Review 绑定候选提交和 v2 owned-scope digest，逐条覆盖全部固定 Rule；Regression 独立覆盖数据库、Session、权限、维护任务、三视口和既有认证/家庭能力。
- 用户必须针对固定候选明确验收并另行授权对应 PR 合并；普通反馈不等于合并授权。集成后摘要相同且复验通过才可归档。
