---
id: PLAN-20260923-NF3S35VD
type: plan
title: 修订照片卡片信息与详情来源导航
status: confirmed
created_at: 2026-09-23T14:59:18+08:00
updated_at: 2026-09-23T14:59:18+08:00
related_ids:
  [
    SPEC-20260923-SN5XW196,
    DES-20260923-290T84JW,
    SPEC-20260917-KSVSF8BN,
    DES-20260917-YQWSZG09,
    SPEC-20260920-QQ9SQ9VT,
    DES-20260920-SAX3DM0H,
    PLAN-20260920-BR79695D,
  ]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: '用户明确要求实施照片浏览修订计划，并补充确认照片从图集、时间轴、里程碑进入后应返回原界面；Plan F 已集成归档。'
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

# 照片浏览信息与来源导航修订

## 基线与前置条件

Plan F `PLAN-20260920-BR79695D` 已归档，远端集成提交 `860be884287e8875f380e1dade3b38e629f4b8d5`；当前已刷新 `origin/develop` 与本地 `develop` 均为 `99d0adc02aa01572601e58f4fa03ea936ce6488f`。本 Plan 从该基线建立独立分支 `feature/photo-browse-experience-revision`。开始文件修改前确认工作树干净且无活动 Plan 路径重叠。

冻结依据为 `SPEC-20260923-SN5XW196`、`DES-20260923-290T84JW` 以及照片浏览、里程碑混合时间轴规格和设计。原 Plan E 与已归档 Plan F 均不可变。

## 目标和范围

1. 在图集和时间轴已发布照片摘要增加受限的上传者显示名 DTO；将照片创建者 Membership 当前存储显示名用于公开照片卡片，不暴露其他个人资料。
2. 图集/时间轴共用卡片显示“上传者：姓名”；最多 15 个 Unicode 字符完整展示，超出显示前 15 字加 `…`，完整名称保留在 title 与辅助文本。
3. 明确区分图集、时间轴、里程碑照片详情来源。返回按钮与固定路由匹配来源；上一张/下一张保留来源参数，未知来源及不完整里程碑参数安全回退图集。
4. 修改相应 API、Web、OpenAPI 生成客户端、回归和 E2E 测试及必要的导航文档索引。

## 非目标与保护

- 不增加数据库迁移或新表，不更改照片、家庭、宝宝、Membership 或里程碑权限，不增加头像、角色、上传时间、滚动恢复或历史栈导航。
- 不调整照片可见性、签名预览生命周期、列表分页排序、详情相邻照片顺序、混合时间轴判别联合或管理端 DTO。
- 里程碑入口参数不得改变目标资源鉴权；返回链接只用于导航，服务端仍按当前会话/家庭/宝宝权限重新验证。

## 精确文件所有权

- API：`apps/api/src/photo/photo.dto.ts`、`apps/api/src/photo/photo.service.ts`、`apps/api/src/photo/photo.controller.ts`、`apps/api/test/photo-gallery.spec.ts`。
- Web：`apps/web/src/app/PhotoBrowse.tsx`、`PhotoBrowse.test.tsx`、`PhotoBrowse.module.css`、`MilestoneApp.tsx`、`MilestoneApp.test.tsx`、`MilestoneApp.module.css`。
- 生成接口与 E2E：`packages/api-client/openapi.json`、`packages/api-client/src/schema.d.ts`、`packages/api-client/src/client.ts`、`packages/api-client/src/index.ts`、`tests/e2e/photo.spec.ts`、`tests/e2e/milestone.spec.ts`。
- 证据文档：本 Plan 包 `docs/plans/PLAN-20260923-NF3S35VD/`、`docs/specs/SPEC-20260923-SN5XW196-photo-browsing-experience-revision/`、`docs/designs/DES-20260923-290T84JW-photo-browsing-experience-revision/`、`docs/INDEX.md`、`AGENTS.md`。

若实现过程发现必须扩大所有权，先复核活动 Plan 重叠与基线，并通过新修订 Plan 处理范围/验收变化；不得编辑 Plan F 所有文件或其他未授权文件。

## 实施顺序

1. 生成 Plan、Spec、Design IDs 并核对无碰撞；固定基线、远端、功能分支和 owned paths；登记索引与执行记录。
2. 在仅用于发布照片摘要的 DTO 查询中联接创建者 Membership 显示名，保持其它 DTO 与权限查询不变；更新 OpenAPI，运行既有确定性客户端生成。
3. 实现三类来源解析与固定路由，确保详情状态和上一张/下一张链接传播经验证来源；里程碑照片入口传自身 ID。
4. 更新共享照片卡片上传者呈现及 Unicode 截断；验证 title、辅助文本、卡片链接语义和窄屏布局。
5. 更新 API/Web/E2E 回归，执行生成、定向测试、类型检查、构建、照片/里程碑 E2E、三个视口人工/自动检查及 `hooks/validate-project.ps1 -Check`。
6. 完成后形成独立 Review 和 Regression 证据，提交候选供用户人工验收。后续提交、推送、创建 PR、合并、晋升和归档仍需各自明确授权。

## 验收标准

- 图集页与时间轴页响应都返回正确的 `uploadedBy.displayName`；响应不包含账户 ID、Membership ID、手机号、角色。管理列表和草稿响应仍保持既有 `PhotoSummaryDto` 契约。
- 显示名 15 Unicode 字符完整，16 字及以上截断为前 15 字加 `…`；title 与可访问名称保留完整“上传者：姓名”。
- `/app/gallery`、`/app/timeline` 与 `/app/milestones/:milestoneId` 照片入口分别带 `from=gallery|timeline|milestone`，里程碑还带 UUID `milestoneId`。三个返回按钮文案及固定目标准确；直接深链、未知来源、缺失/非法参数均安全回退图集。
- 上一张/下一张顺序和两端行为不变，并对当前来源持续传播参数。
- API 保护测试保持跨家庭/宝宝隔离、草稿/回收不可见、分页稳定、签名预览私有；时间轴混合照片/里程碑顺序与访问行为不回归。
- 在 375×812、834×1112、1440×1000 验证图集、时间轴与里程碑详情照片入口，上传者单行右对齐，无水平溢出，焦点和 Tab 顺序正常。
- OpenAPI/客户端生成须稳定一致；API、Web 定向测试、类型检查、构建、照片和里程碑 E2E、项目校验逐项记录 `PASSED|FAILED|UNAVAILABLE|UNVERIFIED`，不可用不得算通过。

## 风险与处理

Membership 显示名以已有成员记录为来源，必须沿用照片与 Membership 的现有归属关系，避免变更查权语义；详情查询仍是管理与预览权限依据。URL 参数不可信，只允许枚举来源与受格式验证的 milestoneId，目标 URL 始终由代码构造固定应用路径。

## Review / Regression / 交付

Review 绑定候选提交与 v2 owned-scope digest，逐一检查 DTO 最小披露、路由参数白名单、详情状态、上一张/下一张、Unicode 边界和响应式布局。独立 Regression 覆盖照片、里程碑、家庭/宝宝权限、管理 DTO、混合时间轴和生成确定性。人工验收绑定同一候选；验收后不得推送或创建 PR，除非另获授权。远端模式只有经独立授权集成到 `origin/develop` 并完成集成复验后才能归档。
