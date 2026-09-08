---
id: PLAN-20260907-001
type: plan
title: "建设阶段菜单与规则有效性体系"
status: archived
created_at: 2026-09-07T16:49:15+08:00
updated_at: 2026-09-07T17:18:08+08:00
related_ids: []
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "确认实施 PLAN-20260907-001"
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 1
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 1
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 1
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 1
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 1
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 1
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004]
---

# 建设阶段菜单与规则有效性体系

## 现状与依据

- 根目录 `AGENTS.md` 已定义资料优先级和基础执行原则，但 `rules/` 为空。
- `docs/` 已形成 Plan、执行、Review、人工确认和 Achievement 证据链。
- 用户要求 Rules 采用精确但不冗杂的菜单入口，并按 Exploration、Planning、Development、Review、Regression、Acceptance 阶段路由。
- 用户要求 AI 在修改前识别“以后不要、需要考虑、必须”等长期注意事项，先询问是否写入 Rules；得到一次确认后自动分类、存档并从本次修复起生效。
- 用户已明确确认实施本计划。

## 目标

- 建立阶段菜单和可复用规则模块，避免同一规则在多个阶段重复维护。
- 建立规则候选识别、用户一次确认、自动分类、版本升级和旧版归档流程。
- 让每个 Plan 固定引用精确 Ruleset 版本和 Rule ID。
- 通过结构校验、Review 符合性矩阵和独立 Regression 证明规则有效。
- 将规则变更纳入现有 Docs 证据链，保持历史可追溯且当前入口清晰。

## 范围

- 创建 `rules/README.md`、`rules/INDEX.md`。
- 创建六个阶段菜单和六个当前规则模块。
- 创建 archive 索引和 SHA-256 清单。
- 将此前已确认的项目原则整理为首批规则。
- 更新 `AGENTS.md`，加入阶段入口和修改前规则候选门禁。
- 更新 `docs/README.md`，加入 Rules 引用、`regression-report.md`、`in_regression` 和新归档要求。
- 创建只读的 `hooks/validate-rules.ps1`。
- 为本 Plan 保存执行、Review 和 Regression 证据。

## 非目标

- 不定义产品页面、组件、文案、视觉值或业务行为。
- 不确定框架、包管理器、代码风格、断点、浏览器范围或部署方式。
- 不修改已归档的 `PLAN-20260904-001` 或 `ACH-20260904-001`。
- 不把未经用户确认的 AI 最佳实践自动提升为 active Rule。
- 不创建本 Plan 的 Achievement，直到用户明确授权归档。

## 关联 Design / Spec

无。当前项目尚未登记产品 Design 或 Spec；本计划只建设开发治理基础设施。

## 适用 Rules

本 Plan 用于创建上方 `applicable_rules` 中列出的六个 Ruleset v1。由于这些规则在计划确认时尚未落盘，其确认依据是本 Plan 的完整讨论稿和用户明确回复；实施后必须通过校验脚本及 Review 逐条核对。

## 实施步骤

1. 建立 Rules 协议、中央菜单、阶段菜单、模块和历史入口。
2. 写入首批规则及来源、范围、阶段和验证方式。
3. 更新根入口的规则候选门禁和阶段读取要求。
4. 扩展 Docs 计划证据接口及状态机。
5. 实现规则结构、引用、版本、归档哈希和计划证据校验。
6. 执行正向校验和计划规定的负面测试。
7. 生成 Review 规则符合性矩阵并修复阻断问题。
8. 独立执行 Regression，确认既有归档未改变且证据链仍有效。
9. 进入 `acceptance_pending`，等待用户确认。

## 验收条件

- `rules/INDEX.md` 能把六类任务阶段路由到精确菜单。
- 阶段菜单只保存路由、输入、输出和门禁，不复制规则正文，且每份不超过 80 行。
- 六个 Ruleset 均拥有稳定入口、唯一 ID、版本、来源、适用阶段和健康状态。
- 每个 MUST Rule 至少拥有一种验证模式。
- 规则候选必须在修改前确认；一次确认完成入库和本次生效授权。
- 旧 Ruleset 进入只读 archive 并由 SHA-256 清单保护。
- Plan 能固定引用 Ruleset 版本和 Rule ID。
- Review 覆盖全部适用 Rule，Regression 成为独立证据。
- 校验脚本能发现计划列出的结构和引用错误。
- `AGENTS.md` 不超过 100 行，所有内部链接有效。
- 已归档 Plan 和 Achievement 的基线哈希保持不变。

## Review 要求

- 逐条核对本 Plan 中全部 applicable Rule。
- 检查菜单无正文复制、规则无多处真相、历史入口不参与正常路由。
- 检查候选识别、排除、确认、冲突和当前 Plan 修订规则完整。
- 检查校验脚本无写入副作用，并运行正向和负向场景。
- 对不适用的 UI 或业务检查写明理由。

## Regression 要求

- 验证既有 `PLAN-20260904-001` 和 `ACH-20260904-001` 哈希未改变。
- 验证既有 Docs 链接、Plan/Achievement 一对一关系仍然成立。
- 验证没有为本 Plan 提前生成 Achievement。
- 验证根入口和 Docs Index 仍可快速定位当前事实。

## 风险与限制

- 当前不是 Git 仓库，因此通过 archive SHA-256 清单提供额外防篡改检查。
- 自然语言规则候选的语义识别由 AI 执行；脚本只能验证入库后的结构、关系和证据。
- 产品和技术栈尚未定义，因此首批规则只能覆盖已确认的通用治理要求。

## 人工归档门槛

只有 Review 和 Regression 通过、本 Plan 为 `acceptance_pending`，且用户明确表示 `PLAN-20260907-001` 可以归档时，才能生成 `ACH-20260907-001-*` 并将 Plan 更新为 `archived`。
