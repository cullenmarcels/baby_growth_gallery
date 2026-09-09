---
id: PLAN-20260907-001-REGRESSION
type: regression_report
title: "建设阶段菜单与规则有效性体系：Regression 报告"
status: passed
created_at: 2026-09-07T16:49:15+08:00
updated_at: 2026-09-07T17:14:03+08:00
plan_id: PLAN-20260907-001
related_ids: [PLAN-20260907-001, PLAN-20260907-001-EXEC, PLAN-20260907-001-REVIEW]
supersedes: []
superseded_by: []
---

# Regression 报告

## 影响范围

- 根入口导航。
- Docs 当前协议和 Plan 台账。
- 新增 Rules 与校验 Hook。
- 既有 archived Plan 和 Achievement 的完整性。

## 回归选择依据

- 根据 `AGENTS.md`、Docs 协议、Rules 目录、Hook、测试和 Plan 证据的实际修改范围选择回归。
- 使用实施前保存的 SHA-256 验证旧 Plan 和旧 Achievement 没有被追溯修改。
- 重新运行完整校验与负面测试，验证 Review 文件更新后门禁仍然可靠。

## 检查结果

| 检查项 | Result | Evidence |
| --- | --- | --- |
| 既有 Plan 哈希 | PASS | `63BC8A...C90BC7A5`，与实施前基线一致 |
| 既有 Achievement 哈希 | PASS | `A8E60F...0524453`，与实施前基线一致 |
| Rules/Docs 内部链接 | PASS | `validate-rules.ps1` 返回 PASSED |
| Plan/Achievement 一对一关系 | PASS | archived 旧 Plan 恰有 1 个 Achievement |
| 本 Plan 未提前生成 Achievement | PASS | `ACH-20260907-001-*` 数量为 0 |
| Rules 结构与证据 | PASS | 12 Ruleset、36 Rule、25 Markdown、83 行 AGENTS |
| 正向结构测试 | PASS | 1/1 通过 |
| 负面错误检测 | PASS | 10/10 被正确拒绝 |
| 初始 archive 状态 | PASS | v1 无旧版，快照数量 0，清单存在 |

## 设备与状态覆盖

- 桌面端：NOT_APPLICABLE，本 Plan 未修改网站或 UI。
- 平板端：NOT_APPLICABLE，本 Plan 未修改网站或 UI。
- 移动端：NOT_APPLICABLE，本 Plan 未修改网站或 UI。
- 正常、空、加载、错误和运行时边界状态：NOT_APPLICABLE，本 Plan 只修改开发治理资料和校验脚本。

## 未覆盖内容与剩余风险

- 未运行网站构建、浏览器或 UI 测试，因为项目尚无网站代码和技术栈，且本 Plan 不创建运行时功能。
- 自然语言候选识别仍依赖遵守 AGENTS 的 AI；结构测试无法替代语义判断。
- 当前非 Git 仓库，旧归档由基线哈希核对，未来 Rules archive 由 `MANIFEST.sha256` 保护。
- 未发现阻止人工验收的剩余风险。

## 最终结论

`passed`。既有归档未改变、证据链仍有效、完整正负校验通过，允许 Plan 进入 `acceptance_pending`。
