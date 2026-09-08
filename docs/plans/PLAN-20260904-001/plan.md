---
id: PLAN-20260904-001
type: plan
title: "建设 docs 项目变更证据链"
status: archived
created_at: 2026-09-04T17:56:50+08:00
updated_at: 2026-09-07T16:14:06+08:00
related_ids: []
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户明确要求实施已讨论并锁定的 docs 项目变更证据链方案。"
---

# 建设 `docs/` 项目变更证据链

## 目标

把 `docs/` 建设为面向 AI 执行、review 和归档的项目变更证据库，使每次项目变更都能从当前设计与规格追溯到确认计划、执行记录、review 报告和人工验收结果。

## 范围

- 建立 `docs/README.md` 作为文档库操作协议。
- 建立 `docs/INDEX.md` 作为当前真相和计划状态的中央索引。
- 建立 `designs/`、`specs/`、`plans/`、`achievements/` 固定目录。
- 定义 DES、SPEC、PLAN、ACH 的 ID、元数据、状态机、冻结规则和引用规则。
- 定义计划包、执行记录、review 报告和人工归档流程。
- 更新根目录 `AGENTS.md`，登记两个 `docs/` 入口且保持不超过 100 行。
- 使用本计划包记录此次建设过程，完成 AI review 后等待用户确认归档。

## 非目标

- 不定义尚未由用户提供的产品功能、页面、视觉设计、数据模型或技术栈。
- 不创建虚构的 Design、Spec 或 Achievement。
- 不实现未来的 review 自动化脚本或业务网站代码。
- 不因 AI 自审通过而自动生成 Achievement。

## 关联 Design / Spec

无。本计划用于初始化文档证据链协议，项目尚未登记任何产品 Design 或 Spec。

## 实施步骤

1. 建立固定目录和中央入口文件。
2. 在操作协议中定义职责、ID、元数据、状态、冻结、修订和归档规则。
3. 建立中央索引及空的 Design/Spec/Achievement 登记区。
4. 将本计划登记为首个已确认 Plan，并创建执行和 review 旁证。
5. 更新根入口 `AGENTS.md`。
6. 验证结构、链接、状态、ID 唯一性和行数限制。

## 验收条件

- `docs/README.md` 和 `docs/INDEX.md` 存在且职责不重叠。
- 四个固定档案目录存在，最终目录名为 `achievements/`。
- Design、Spec、Plan、Achievement 拥有独立且明确的 ID 规则。
- 中央索引可直接识别当前有效资料、Plan 状态、review 状态和人工验收状态。
- Plan 正文冻结、修订 Plan、待验收 review、人工归档和 Achievement 只读规则明确。
- 本计划拥有 `plan.md`、`execution-log.md` 和 `review-report.md`。
- 不存在未经用户人工确认的 Achievement。
- 根目录 `AGENTS.md` 已登记文档入口且不超过 100 行。

## Review 要求

- 核对固定目录和所有入口链接。
- 核对元数据最低字段、ID 格式和状态集合。
- 核对 Plan、review、人工验收和 Achievement 的门槛没有互相矛盾。
- 核对中央索引与本计划包状态一致。
- 核对未引入任何产品事实或技术栈猜测。
- 本计划仅涉及文档基础设施，网站响应式和 UI 状态验证明确标记为不适用。

## 风险与限制

- 当前目录不是 Git 仓库，无法以提交哈希提供额外不可变证据。
- 中央索引暂由 AI 在每次资料变更时同步维护；尚无自动一致性检查脚本。

## 人工归档门槛

AI review 通过后，本计划只能进入 `acceptance_pending`。只有用户针对 `PLAN-20260904-001` 明确表示“确认完成”“可以归档”或同等明确语义，才能创建 `ACH-20260904-001-*` 并把计划标记为 `archived`。
