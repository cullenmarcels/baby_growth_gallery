---
id: PLAN-20260918-RC0Y5QH3
type: plan
title: "修订 Plan E 宝宝档案与照片管理界面"
status: confirmed
created_at: 2026-09-18T14:37:52+08:00
updated_at: 2026-09-18T14:37:52+08:00
related_ids: [PLAN-20260917-K0AH0D6T, SPEC-20260917-KSVSF8BN, DES-20260917-YQWSZG09, DES-20260918-Y2GFD47V]
supersedes: [PLAN-20260917-K0AH0D6T]
superseded_by: []
confirmed_by: user
confirmation_basis: "用户明确要求 PLEASE IMPLEMENT THIS PLAN：宝宝档案与照片管理界面修订，并确认同场景同级操作按钮等高。"
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

# Plan E 修订：宝宝档案与照片管理界面

## 基线、目标与确认

本 Plan 承接原 Plan E 已在 `feature/photo-gallery-timeline` 完成但尚未人工验收的图集、时间轴、照片详情及头像能力；新增四项界面修正和此前已明确的按钮单行约束。冻结本地基线为 `d401a2d0d29fd9e3b0f71ffae815c3a307a72242`，集成目标仍是 `origin/develop`，详见 `state.md`。原 Plan E 的候选 Review/Regression 只构成历史证据，新候选必须重新验证。

现有五处未提交改动属于本任务此前的按钮单行修复，用户在本 Plan 中明确要求保留并纳入；不得撤销这些改动。受限环境首次远端核验失败，提升权限后的只读核对和 `repository-preflight.ps1 -Remote` 确认 `origin/develop@c0e2108` 与本地跟踪引用一致，且为功能分支祖先。

## 范围与约束

- 基于 `DES-20260918-Y2GFD47V` 修正宝宝新建与编辑、照片处理卡片和管理列表；保持既有 `SPEC-20260917-KSVSF8BN`、`DES-20260917-YQWSZG09` 的业务行为。
- 并排同级操作按钮等高，全部操作按钮文案单行。新增/改动超过五个字符的按钮文案必须由用户决定；本次新增文案仅“取消”。
- 新建取消回到宝宝档案管理页，不发创建请求并聚焦标题；处理卡片标题独行、日期与地点同行、四边 16px padding、顶部“我的上传”主按钮化。
- 管理卡片三／二／一列瀑布流，以照片宽高和卡片实测尺寸排布，保留 API 顺序、分页、筛选、权限和键盘顺序。
- 不修改 API、数据库、旧迁移或 Plan D 归档；不提前晋升 `develop` 之后的分支。原 Plan E 冻结 `plan.md` 保持不变。

## 实施及验收

1. 版本化按钮规则，新增界面 Design 与本修订 Plan；协调与原 Plan E 的路径重叠，更新生成索引及入口。
2. 修改 Web 组件和样式，同步补充宝宝取消导航、按钮边界、卡片字段、padding、瀑布流及焦点测试。
3. 在 375／834／1440 覆盖正常、空、加载、错误、权限、横竖照片、预览失败、加载更多与键盘操作；检查文案单行、同级按钮等高和无横向溢出。
4. 执行 Web、E2E 与 `pnpm validate`；Review 绑定已提交候选和 owned-scope v2 摘要，独立 Regression 复核原 Plan E 与已归档上传/宝宝功能。失败或不可用如实记录。

候选通过后仍由用户对精确版本人工验收。创建 PR、合并、推送证据和远端集成分别遵守既有授权门槛；只有集成到已验证的 `origin/develop` 并复验通过后才能归档。
