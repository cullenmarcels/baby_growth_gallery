---
id: ACH-20260907-001
type: achievement
title: "建设阶段菜单与规则有效性体系：完成归档"
status: archived
created_at: 2026-09-07T17:18:08+08:00
updated_at: 2026-09-07T17:18:08+08:00
related_ids: [PLAN-20260907-001, PLAN-20260907-001-EXEC, PLAN-20260907-001-REVIEW, PLAN-20260907-001-REGRESSION, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-RESPONSIVE-UI, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260907-001
confirmed_by: user
confirmed_at: 2026-09-07T17:18:08+08:00
archived_at: 2026-09-07T17:18:08+08:00
confirmation_record: "PLAN-20260907-001 可以归档"
---

# `ACH-20260907-001` — 阶段菜单与规则有效性体系

## 归档摘要

- 对应 Plan：[`PLAN-20260907-001`](../plans/PLAN-20260907-001/plan.md)
- 最终状态：`archived`
- AI Review：[`passed`](../plans/PLAN-20260907-001/review-report.md)
- Regression：[`passed`](../plans/PLAN-20260907-001/regression-report.md)
- 人工确认：用户于 `2026-09-07T17:18:08+08:00` 明确授权归档。
- 关联 Design / Spec：无；本 Plan 只建设开发治理基础设施。
- Git 提交：无；归档时项目目录不是 Git 仓库。

## 已确认 Plan 快照

### 现状与目标

实施前 `rules/` 为空，项目已有 AGENTS 入口和 Docs 变更证据链，但没有按开发阶段组织的现行规则，也没有自动接收用户长期注意事项的机制。

本 Plan 的目标是建立：

- 精确但不冗杂的阶段菜单；
- 单一来源的可复用规则模块；
- 修改前 Rule 候选识别和用户一次确认；
- Ruleset 版本、旧版归档和历史哈希；
- Plan 固定 Rule 版本；
- Rule Review 符合性矩阵；
- 独立 Regression 证据；
- Achievement 中的完整规则闭环。

### 实施范围

- 创建 Rules 操作协议、中央索引、六个阶段菜单和六个规则模块。
- 把此前确认的项目原则整理成可验证 Rule。
- 更新 `AGENTS.md` 的规则入口和修改前候选门禁。
- 扩展 Docs 的 Plan、Review、Regression 和 Achievement 接口。
- 创建只读结构校验器和可重复负面测试。
- 保护既有 archived Plan 与 Achievement 不被追溯修改。

### 非目标

- 不定义产品页面、组件、业务行为、文案或视觉值。
- 不确定框架、包管理器、代码风格、断点、浏览器范围或部署方式。
- 不修改已归档的 `PLAN-20260904-001` 和 `ACH-20260904-001`。
- 不让 AI 未经用户确认自行增加 active Rule。

### 验收条件快照

- Rules Index 可以把六类任务阶段路由到精确菜单。
- 阶段菜单不复制规则正文且每份不超过 80 行。
- 六个当前 Ruleset 拥有稳定入口、唯一 ID、版本、来源和健康状态。
- 每个 MUST Rule 至少有一种验证方式。
- Rule 候选必须在修改前确认，一次确认完成入库和本次生效。
- 旧 Ruleset 由 archive 和 SHA-256 清单保护。
- Plan 固定引用 Ruleset version 和 Rule ID。
- Review 覆盖全部适用 Rule，Regression 形成独立证据。
- 自动校验能发现规定的结构、引用和证据错误。
- `AGENTS.md` 不超过 100 行，内部链接有效。
- 既有 archived Plan 和 Achievement 哈希不变。

## 实际完成的修改

- 创建 [`rules/README.md`](../../rules/README.md)，定义职责、读取顺序、规则接口、候选识别、一次确认、分类、计划影响、版本、归档、健康状态和完成门禁。
- 创建 [`rules/INDEX.md`](../../rules/INDEX.md)，提供 Exploration、Planning、Development、Review、Regression、Acceptance 六阶段入口。
- 创建 6 个 `rules/stages/*.md`；每份为 52–60 行，只保存阶段路由和门禁。
- 创建 6 个 `rules/modules/*.md`，形成 36 条带唯一 ID、Level、范围、触发、验证、例外和来源的当前 Rule。
- 创建 [`rules/archive/INDEX.md`](../../rules/archive/INDEX.md) 和 [`MANIFEST.sha256`](../../rules/archive/MANIFEST.sha256)。当前为首次 v1，没有旧版快照且没有制造 v000。
- 更新根目录 `AGENTS.md`，加入修改前候选检查、阶段入口和 AI 自动维护责任，最终为 83 行。
- 更新 [`docs/README.md`](../README.md)，加入 Plan 固定规则版本、`in_regression`、独立 Regression Report 和 Achievement 新证据要求。
- 更新 [`docs/INDEX.md`](../INDEX.md)，加入 Rules、Review、Regression 和人工验收状态。
- 创建只读 [`hooks/validate-rules.ps1`](../../hooks/validate-rules.ps1)。
- 创建可重复 [`tests/test-validate-rules.ps1`](../../tests/test-validate-rules.ps1)，覆盖 1 个正向和 10 个负面场景。
- 为本 Plan 创建完整的 Plan、Execution、Review、Regression 和本 Achievement。

## Rule 候选自动接收结果

未来 AI 在修改文件前必须检测用户消息中的长期约束，例如“以后”“每次”“不要”“必须”“需要考虑”“记住”。命中后：

1. 暂停文件修改，只允许只读探查。
2. 检查重复、冲突、Ruleset、阶段、范围、Level 和验证方式。
3. 展示包含原话与规范化结果的候选确认卡。
4. 等待用户确认是否写入 Rules 并从本次修复起生效。
5. 一次确认同时授权规则入库、版本化、旧版归档、索引更新和当前 Plan/修订 Plan 关联。
6. 用户说“只用于本次”时作为 Plan 特定约束，不写入 Rules。

AI 自行发现的最佳实践只能作为候选，不能未经用户确认成为 active Rule。

## 实际使用的 Rules

### `RULESET-SOURCE-EVIDENCE` v1

`SRC-001`、`SRC-002`、`SRC-003`、`SRC-004`、`SRC-005`、`SRC-006`、`SRC-007`、`SRC-008`

### `RULESET-REPOSITORY-SAFETY` v1

`REPO-001`、`REPO-002`、`REPO-003`、`REPO-004`、`REPO-005`

### `RULESET-RESPONSIVE-UI` v1

`RESP-001`、`RESP-002`、`RESP-003`、`RESP-004`、`RESP-005`、`RESP-006`

### `RULESET-IMPLEMENTATION-QUALITY` v1

`IMPL-001`、`IMPL-002`、`IMPL-003`、`IMPL-004`、`IMPL-005`、`IMPL-006`

### `RULESET-TESTING-QUALITY` v1

`TEST-001`、`TEST-002`、`TEST-003`、`TEST-004`、`TEST-005`、`TEST-006`、`TEST-007`

### `RULESET-SECURITY-PRIVACY` v1

`SAFE-001`、`SAFE-002`、`SAFE-003`、`SAFE-004`

六个阶段菜单 `STAGE-EXPLORATION`、`STAGE-PLANNING`、`STAGE-DEVELOPMENT`、`STAGE-REVIEW`、`STAGE-REGRESSION`、`STAGE-ACCEPTANCE` 均为 v1。

## 与原计划的偏差

无实质范围或结果偏差。

唯一实施期缺陷是校验脚本首次运行时，PowerShell 条件表达式中的 `-and` 被错误解释为 `Test-Path` 参数；已增加括号修复，随后正向校验和全部负面测试连续通过。

归档时仅为 12 个当前 Ruleset 补充 `related_achievement_ids: [ACH-20260907-001]` 和对应 `updated_at`，没有修改 Rule 正文、Rule ID 或 version。

## Review 结论

Review 覆盖全部 36 条 Rule：

| Ruleset | PASS | NOT_APPLICABLE | FAIL | UNVERIFIED |
| --- | ---: | ---: | ---: | ---: |
| `RULESET-SOURCE-EVIDENCE` | 8 | 0 | 0 | 0 |
| `RULESET-REPOSITORY-SAFETY` | 5 | 0 | 0 | 0 |
| `RULESET-RESPONSIVE-UI` | 1 | 5 | 0 | 0 |
| `RULESET-IMPLEMENTATION-QUALITY` | 6 | 0 | 0 | 0 |
| `RULESET-TESTING-QUALITY` | 7 | 0 | 0 | 0 |
| `RULESET-SECURITY-PRIVACY` | 2 | 2 | 0 | 0 |
| 合计 | 29 | 7 | 0 | 0 |

响应式 UI 和敏感数据的 NOT_APPLICABLE 项均有明确理由：本 Plan 只修改开发治理资料和校验脚本，没有修改网站 UI，也没有处理敏感数据。

Review 最终状态为 `passed`，不存在 FAIL 或 UNVERIFIED。

## Regression 结论

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 既有 Plan 哈希 | PASS | 与实施前 `63BC8A99...C90BC7A5` 一致 |
| 既有 Achievement 哈希 | PASS | 与实施前 `A8E60F72...0524453` 一致 |
| Rules/Docs 内部链接 | PASS | 校验器返回 PASSED |
| 已归档 Plan/Achievement 一对一 | PASS | `PLAN-20260904-001` 恰有一个 Achievement |
| 本 Plan 未提前归档 | PASS | 人工确认前 Achievement 数量为 0 |
| Rules 结构 | PASS | 12 Ruleset、36 Rule、83 行 AGENTS |
| 正向测试 | PASS | 1/1 |
| 负面测试 | PASS | 10/10 被正确拒绝 |
| 初始 archive | PASS | v1 无旧版快照，Manifest 存在 |

本 Plan 不修改网站或 UI，因此桌面、平板、移动端及正常、空、加载、错误等运行时状态回归为 NOT_APPLICABLE，并已在原 Regression Report 中记录理由。

Regression 最终状态为 `passed`。

## 自动校验与测试结果

最终结构校验：

```text
RULES_VALIDATION=PASSED
RULESET_COUNT=12
RULE_COUNT=36
MARKDOWN_FILE_COUNT=25
ARCHIVE_FILE_COUNT=0
AGENTS_LINE_COUNT=83
```

最终测试：

```text
RULES_VALIDATOR_TESTS=PASSED
POSITIVE_CASES=1
NEGATIVE_CASES=10
```

被正确拒绝的负面场景包括：重复 Rule ID、缺失 Ruleset、非法状态、MUST 无验证方式、阶段坏引用、Plan 错误版本、Review 漏项、archived Plan 缺 Achievement、archive 哈希变化和 Markdown 坏链接。

## 剩余风险

- 自然语言中的 Rule 候选需要 AI 进行语义判断；结构脚本只能检查入库后的规则和证据。
- 当前不是 Git 仓库，既有档案通过基线哈希核对，未来 Rules 历史快照由 `MANIFEST.sha256` 保护。
- 产品 Design、Spec、技术栈、断点和浏览器范围仍未定义，Rules 不包含这些未经确认的信息。

这些风险均已显式记录，不阻止本 Plan 归档。

## 证据入口

| 类型 | 入口 |
| --- | --- |
| 确认 Plan | [`PLAN-20260907-001`](../plans/PLAN-20260907-001/plan.md) |
| Execution | [`PLAN-20260907-001-EXEC`](../plans/PLAN-20260907-001/execution-log.md) |
| Review | [`PLAN-20260907-001-REVIEW`](../plans/PLAN-20260907-001/review-report.md) |
| Regression | [`PLAN-20260907-001-REGRESSION`](../plans/PLAN-20260907-001/regression-report.md) |
| Rules 协议 | [`rules/README.md`](../../rules/README.md) |
| Rules 菜单 | [`rules/INDEX.md`](../../rules/INDEX.md) |
| 校验器 | [`hooks/validate-rules.ps1`](../../hooks/validate-rules.ps1) |
| 测试 | [`tests/test-validate-rules.ps1`](../../tests/test-validate-rules.ps1) |

## 人工确认记录

- 确认主体：用户
- 确认时间：`2026-09-07T17:18:08+08:00`
- 针对 Plan：`PLAN-20260907-001`
- 原始确认语义：`PLAN-20260907-001 可以归档`
- 判定：明确指定 Plan ID 和归档动作，满足 Acceptance 与 Docs 协议门槛。

## 最终归档声明

`PLAN-20260907-001` 已完成实施、AI Review、独立 Regression 和用户人工确认，于 `2026-09-07T17:18:08+08:00` 正式归档为 `ACH-20260907-001`。

本 Achievement 自创建起永久只读。后续修改阶段菜单、Rule、版本协议、校验器或证据结构时，必须创建新的 Plan，不得改写本档案。
