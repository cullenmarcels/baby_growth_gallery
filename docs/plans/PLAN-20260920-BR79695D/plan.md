---
id: PLAN-20260920-BR79695D
type: plan
title: "实现成长里程碑、清单提醒与时间轴整合"
status: confirmed
created_at: 2026-09-20T15:37:48+08:00
updated_at: 2026-09-20T15:37:48+08:00
related_ids: [SPEC-20260920-QQ9SQ9VT, DES-20260920-SAX3DM0H, SPEC-20260915-8RKJ7RGM, SPEC-20260917-KSVSF8BN]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户明确要求 PLEASE IMPLEMENT THIS PLAN：Plan F 成长里程碑、清单提醒与时间轴整合。"
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
    version: 2
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006, RESP-007]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 2
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004, SAFE-005]
---

# Plan F：成长里程碑、清单提醒与时间轴整合

## 目标与依据

依据 `SPEC-20260920-QQ9SQ9VT` 与 `DES-20260920-SAX3DM0H`，在 Plan E 的真实照片能力上完成共享里程碑清单、12 个中性模板、自定义项目、完成进度、应用内提醒、最多 10 张已发布照片关联，以及照片／里程碑混合时间轴。实现范围同时遵循首个宝宝成长业务规格、照片浏览规格和当前规则版本。

## 范围与非目标

- 增加前向 Prisma migration、里程碑领域 API、OpenAPI 生成客户端、三个正式页面及时间轴/家庭动态整合。
- 作者管理自己的里程碑，OWNER/ADMIN 管理全部，其他 MEMBER 只读；所有请求重新校验 ACTIVE Membership 和 ACTIVE 宝宝。
- 照片回收同步解除里程碑关联；宝宝永久清理同步处理里程碑与动态墓碑。
- 不实现医学建议、逾期、外部通知、评论、反应、视频、公开分享、成长数据、首页聚合或发布分支晋升。

## 实施顺序

1. 固定 `origin/develop@77c602c58f7f266e4fbee979b21e82b5de7b8085`、功能分支、Rules 和 owned paths；建立 Spec、Design、Plan 状态与执行记录。
2. 实现数据模型、migration、策略、事务、分页、并发版本、家庭动态和照片／宝宝生命周期整合。
3. 扩展时间轴判别联合和 v2 游标，兼容照片 v1 游标；导出 OpenAPI 并生成客户端。
4. 实现里程碑列表、新建、详情、完成／撤销、照片选择和三视口状态；所有操作按钮单行。
5. 完成 API、Web、E2E、migration 与完整项目验证；提交候选后执行绑定提交的 Review 和独立 Regression，再交用户人工验收。

## 验收与交付

验证模板唯一性、进度、提醒、日期边界、最多 10 张照片、隔离、权限变化、并发冲突、回收解除、清理墓碑及混合时间轴稳定分页。UI 在 375／834／1440 覆盖正常、空、加载、错误、只读、冲突、签名失效、键盘和焦点行为。候选、PR、合并、归档推送与发布晋升分别遵循独立授权；本 Plan 只以 `origin/develop` 为集成目标。
