---
id: PLAN-20260909-PCVDMF5G-REGRESSION
type: regression_report
title: "五层分支治理 Regression"
status: passed
created_at: 2026-09-09T17:33:09+08:00
updated_at: 2026-09-10T09:56:49+08:00
plan_id: PLAN-20260909-PCVDMF5G
repository_mode: git_remote
candidate_commit: 113102a23f4ddafb7fbc056bf7585a22793c92c1
integrated_commit: 19590f9db9bc55c85e9beb3608bdaec684a6a8a3
ci_status: configured_scope_passed
related_ids: [PLAN-20260909-PCVDMF5G]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论

`PASS`。候选 `113102a23f4ddafb7fbc056bf7585a22793c92c1` 的独立回归与 `origin/main@19590f9db9bc55c85e9beb3608bdaec684a6a8a3` 的集成回归均通过；没有遗留 FAIL 或 UNVERIFIED。最终 PR Head 与 merge commit 的 Git tree、v2 owned scope digest 完全一致，用户验收没有失效。

## 候选回归矩阵

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 分支流向矩阵 | PASS | 5 个允许组合、10 个禁止/边界组合全部符合预期。 |
| 工作流隔离 | PASS | 单元测试确认动态 base context、base SHA checkout、无 head SHA checkout。 |
| 点号路径规范化 | PASS | PowerShell/Node 测试确认 `.github` 保留前导点且不与 `github` 重叠。 |
| Scope digest v2 | PASS | `.github` 产生非空 SHA-256；历史 Plan 默认 v1，全部既有 digest 仍通过校验。 |
| 聚合项目质量 | PASS | `pnpm validate`：ESLint、Prettier、typecheck、API 8/8、Web 3/3、Node 5/5、三个 workspace build、Project Validation 全部通过。 |
| 索引与知识库 | PASS | `update-indexes.ps1 -Write/-Check` 与 `validate-project.ps1 -Check` 通过，归档清单未改变。 |
| develop 正向能力 | PASS | 无内容 fast-forward `f60e658… → a9e836a…` 成功；证明 direct push 未被误禁。 |
| release 正向保护 | PASS | PR #9 `develop → release` 只产生 `branch-flow-release=SUCCESS`，CLEAN 后 merge。 |
| master 正向保护 | PASS | PR #10 `release → master` 只产生 `branch-flow-master=SUCCESS`，CLEAN 后 merge。 |
| main 正向保护 | PASS | PR #11 `master → main` 只产生 `branch-flow-main=SUCCESS`，CLEAN；非产品发布，随后关闭未合并。 |
| 非法旁路 | PASS | 独立 SHA 的 PR #12 `feature/* → release` 只产生 `branch-flow-release=FAILURE` 且 BLOCKED。 |
| Ruleset 回读 | PASS | 四个 active Ruleset 的 target、rules、approval、merge method、context、strict 与 bypass 逐字段符合 Spec。 |
| 临时资源清理 | PASS | PR #3/#4/#11/#12 closed；probe branches 删除；open PR 列表为空。 |
| 历史与现有分支 | PASS | 未 force/delete 长期分支；`feature/project-foundation` 保留。 |
| UI/业务回归 | NOT_APPLICABLE | 没有修改 apps、运行时契约、样式、视口或业务状态。 |

## 当前远端快照

| Ref | SHA |
| --- | --- |
| `main` | `0978a9dc72fc3d4e731e9f515c406d493bd6f52d` |
| `master` | `e974cbfdf9726df1448e18effd4db72ce20b3af4` |
| `release` | `de07c69381ab1ee74bbda1df175e71631ed22dfb` |
| `develop` | `a9e836a7eb2d23cad1f7951bf0e9b01fb4f85c2d` |

分支树存在验证用 merge/no-content commit 差异，但文件树一致；这是普通晋升历史，不是代码漂移。`master` 的验证提交没有进入 `main`，因为 PR #11 明确不是产品发布。

## 集成回归

| 范围 | 结果 | 集成证据 |
| --- | --- | --- |
| PR 与 ancestry | PASS | PR #16 `MERGED`；Head `5d573665…` 是 `origin/main@19590f9d…` 的祖先。 |
| Tree 与摘要 | PASS | Head/merge tree 同为 `f728834…`；accepted/integrated v2 digest 同为 `42404B86…A09AA`。 |
| 聚合质量 | PASS | 在 fetch 后与 main tree 相同的工作树运行 `pnpm validate`，所有 lint、format、typecheck、测试、构建和项目校验通过。 |
| Rulesets | PASS | develop/main/master/release 四个 Ruleset 仍 active，目标、规则、context、strict 与 bypass 无漂移。 |
| 远端清洁度 | PASS | 没有开放 probe PR；临时 probe feature refs 已删除。 |
| CI 范围 | PASS | `branch-flow-main` 在 PR #16 成功；完整应用 CI 仍为本 Plan 非目标。 |
