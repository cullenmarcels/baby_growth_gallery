---
id: PLAN-20260923-1FC2B42D
type: plan
title: 补充照片详情上传者信息
status: confirmed
created_at: 2026-09-23T17:44:54+08:00
updated_at: 2026-09-23T17:44:54+08:00
related_ids:
  [
    SPEC-20260923-Y0XZXEM0,
    DES-20260923-M1TKDS56,
    PLAN-20260923-NF3S35VD,
    SPEC-20260917-KSVSF8BN,
    DES-20260917-YQWSZG09,
    SPEC-20260920-QQ9SQ9VT,
    DES-20260920-SAX3DM0H,
  ]
supersedes: [PLAN-20260923-NF3S35VD]
superseded_by: []
confirmed_by: user
confirmation_basis: '用户明确要求继续修订当前照片浏览问题，补充在图片详情中显示该图片的上传者。'
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids:
      [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids:
      [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-BRANCH-GOVERNANCE
    version: 1
    rule_ids:
      [
        BRANCH-001,
        BRANCH-002,
        BRANCH-003,
        BRANCH-004,
        BRANCH-005,
        BRANCH-006,
        BRANCH-007,
        BRANCH-008,
        BRANCH-009,
        BRANCH-010,
      ]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 2
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006, IMPL-007]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids:
      [
        TEST-001,
        TEST-002,
        TEST-003,
        TEST-004,
        TEST-005,
        TEST-006,
        TEST-007,
        TEST-008,
        TEST-009,
        TEST-010,
      ]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 2
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006, RESP-007]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 2
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004, SAFE-005]
---

# 补充照片详情上传者信息

## 基线、前置条件与承接范围

Plan F 已完成归档。当前分支 `feature/photo-browse-experience-revision` 基于 `99d0adc02aa01572601e58f4fa03ea936ce6488f`。上一修订 Plan `PLAN-20260923-NF3S35VD` 已开始实施但仍为未提交工作树；本 Plan 取代它并承接其照片卡片上传者、图集/时间轴/里程碑来源返回的完整未提交实现，不重置、不覆盖。当前仓库预检的远端新鲜度为 `unverified`，预检工具有环境错误；只在该本地固定分支实施，不进行远端操作。

## 目标与范围

1. 完成既定图集/时间轴照片卡片显示上传者与三来源返回行为。
2. 使已发布照片详情 API 的 `photo` 字段返回受限 `PublishedPhotoSummaryDto`，与图集和时间轴采用同一 `uploadedBy.displayName` 契约。
3. 照片详情在查看和编辑状态显示完整只读“上传者：姓名”；不向非发布照片、草稿、批次或管理列表扩散该字段。
4. 补充 API、Web 和浏览器测试、OpenAPI/生成客户端、文档与索引。

## 非目标与保护

- 不新增数据库表、列或迁移；不改变权限、发布可见性、私有预览、分页/邻接排序、混合时间轴行为或里程碑内容。
- 不改变三来源固定路由、滚动恢复策略和卡片截断规则，不增加上传者的编辑能力。
- 不提交、推送、创建 PR、合并、晋升或归档。

## 修改范围及所有权

承接原 Plan 的精确 owned paths：`apps/api/src/photo/photo.dto.ts`、`apps/api/src/photo/photo.service.ts`、`apps/api/src/photo/photo.controller.ts`、`apps/api/test/photo-gallery.spec.ts`、`apps/web/src/app/PhotoBrowse.tsx`、`apps/web/src/app/PhotoBrowse.test.tsx`、`apps/web/src/app/PhotoBrowse.module.css`、`apps/web/src/app/MilestoneApp.tsx`、`apps/web/src/app/MilestoneApp.test.tsx`、`apps/web/src/app/MilestoneApp.module.css`、`packages/api-client/openapi.json`、`packages/api-client/src/schema.d.ts`、`packages/api-client/src/client.ts`、`packages/api-client/src/index.ts`、`tests/e2e/photo.spec.ts`、`tests/e2e/milestone.spec.ts`、`docs/INDEX.md`、`AGENTS.md`。新增范围：本 Plan 包、对应补充 Spec/Design，及被本修订替代的 Plan State 与旧 Spec/Design 元数据文件。

## 实施顺序

1. 以追加执行证据方式承接原 Plan 已有实现，登记本次 scope 扩展与 supersession。
2. 将详情 DTO 改为 `PublishedPhotoSummaryDto`，详情服务查询最小化选择照片创建 Membership 的显示名，并复用已发布摘要映射，不改变邻接查询。
3. 在详情标题之后显示只读完整上传者行，保证编辑状态也显示且窄屏可换行。
4. 补 API/Web/E2E 断言，导出 OpenAPI 并确定性生成 API Client。
5. 执行定向与全量测试、类型检查、构建、照片/里程碑 E2E、响应式检查和项目校验，记录 PASS/FAIL/UNAVAILABLE/UNVERIFIED。
6. 验证结果仅作为工作区阶段证据；Review、Regression 和候选验收需在获得提交授权并形成候选后单独完成。

## 验收标准

- 已发布详情 API 的 `photo.uploadedBy` 仅含 `displayName`，且与照片真实创建 Membership 名称匹配；其他详情权限字段及上一张/下一张顺序不变。
- 详情页在查看和编辑状态可见完整“上传者：姓名”；名称按需换行，无卡片宽度或水平溢出回归。
- 图集、时间轴、里程碑来源返回和相邻照片参数传播保持原计划行为；卡片上传者截断和辅助名称保持原计划行为。
- OpenAPI 和生成客户端反映详情 DTO；连续生成结果一致。
- 相关 API/Web 单测、类型检查、构建、照片/里程碑 E2E 和项目校验真实记录结果；不可用/未验证不算通过。

## Review、Regression 与交付边界

代码和验证通过后仍须独立 Review、Regression 和用户人工验收。Git 模式 Review 必须绑定已提交候选与 owned-scope digest；工作区改动不能作为最终通过证据。任何提交、推送、PR、合并、集成或归档均需单独授权。
