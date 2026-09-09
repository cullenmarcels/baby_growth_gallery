---
id: SPEC-20260909-ASMC5N7Z
type: spec
title: "五层分支治理与晋升保护规格"
status: active
created_at: 2026-09-09T17:33:09+08:00
updated_at: 2026-09-09T18:02:04+08:00
related_ids: [PLAN-20260909-PCVDMF5G, RULESET-BRANCH-GOVERNANCE]
supersedes: []
superseded_by: []
---

# 五层分支治理与晋升保护规格

## 目标

在 GitHub 仓库建立可执行、可审计、不会锁死当前单人维护者的五类分支模型，并通过 Ruleset 与可信 `branch-flow` 检查强制正常晋升链。

## 分支拓扑

```text
feature/* → develop → release → master → main
```

| 分支 | 语义 | 直接 push | 合法来源 |
| --- | --- | --- | --- |
| `main` | 最终稳定基线 | 禁止 | `master` PR |
| `master` | 人工确认的已发布版本 | 禁止 | `release` PR |
| `release` | 待发布测试候选 | 禁止 | `develop` PR |
| `develop` | 开发阶段整体集成 | 允许 | `feature/*` 直接 merge 或 PR |
| `feature/*` | 独立功能开发 | 允许 | 从 `develop` 创建并回归 `develop` |

默认分支保持 `main`。`master`、`release`、`develop` 在 bootstrap PR 合并后从同一个新 `main` commit 创建，避免初始漂移。

## GitHub Ruleset

### 稳定与发布分支

`main`、`master`、`release` 各使用一个 active branch Ruleset；三者的公共参数相同，但 required check 分别绑定 `branch-flow-main`、`branch-flow-master`、`branch-flow-release`，避免相同 head commit 在不同 base PR 之间复用检查结论：

- require pull request before merging；
- required approving review count 为 0；
- require review thread resolution；
- allowed merge method 为 merge；
- block force pushes；
- restrict deletions；
- 无 bypass actor，管理员同样受规则约束；
- 对应的 `branch-flow-<base>` 首次成功运行后加入 required status checks；
- 当前不要求其他 CI 检查。

### develop

独立 active Ruleset 匹配 `develop`：

- 不要求 PR；
- 允许普通 fast-forward push 和 PR merge；
- block force pushes；
- restrict deletions；
- 无 bypass actor。

`feature/*` 不建立长期保护规则，允许功能开发者维护自己的提交历史；合并后的删除由维护者按 PR 决定，本阶段不自动删除既有分支。

## branch-flow 契约

输入为 PR 的 base/head ref：

| Base | 允许的 Head |
| --- | --- |
| `develop` | `feature/<kebab-case-topic>` |
| `release` | `develop` |
| `master` | `release` |
| `main` | `master` |

其他组合退出非零。检查使用 `pull_request_target`，工作流与校验脚本从 PR base SHA checkout；只读取 base/head 名称，不 checkout 或执行 PR head 内容。工作流只授予 `contents: read`，第三方 Action 固定到精确 commit。单个验证 Job 的检查名动态包含 base ref，形成 `branch-flow-develop`、`branch-flow-release`、`branch-flow-master`、`branch-flow-main` 四个互不混用的上下文。

## Bootstrap

保护建立前允许且只允许一次 `feature/branch-governance → main` bootstrap PR，基线固定为 `9146012d2b8350c2a542701ddcdd86c13f289066`。该 PR 把本 Spec、Ruleset、Plan、检查脚本和工作流带入默认分支。

用户合并 bootstrap PR 后：

1. 从新的 `main` HEAD 创建 `develop`、`release`、`master`；
2. 启用一个 develop Ruleset 和三个稳定/发布 Ruleset；
3. 分别触发目标隔离的 `branch-flow-<base>`，并将对应上下文设为各稳定/发布分支 required check；
4. 使用合法和非法 base/head 矩阵验证本地脚本；
5. 使用真实 PR/API 验证远端保护，不用破坏性 force/delete 作为生产探针；
6. 后续工作严格沿正常晋升链，不再允许 bootstrap 例外。

## 单人审批与升级条件

当前只有 `cullenmarcels` 一个直接协作者。PR 作者不能批准自己的 PR，因此审批数保持 0，但仍要求 PR、解决对话和自动流向检查。增加至少一位具有 write 权限的协作者并获得用户确认后，创建新 Ruleset 版本，把稳定/发布分支升级为至少 1 名非作者批准，并评估 stale approval、latest-push approval 与 CODEOWNERS。

## 发布标记

业务版本完成 `master → main` 后使用 `vMAJOR.MINOR.PATCH` Tag 标记精确 `main` commit，并让 GitHub Release 绑定该 Tag。当前治理 bootstrap 不构成产品发布，不创建版本 Tag。

## 非目标

- 不在本 Plan 引入完整 lint、typecheck、test、build、e2e CI；只增加分支流向治理检查。
- 不部署应用、不创建 GitHub Environment、不发布产品版本。
- 不删除现有 `feature/project-foundation`。
- 不要求签名提交、线性历史、merge queue 或 CODEOWNERS。
- 不增加第二个协作者或真实审批账号。
