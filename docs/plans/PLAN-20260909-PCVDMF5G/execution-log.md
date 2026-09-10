---
id: PLAN-20260909-PCVDMF5G-EXEC
type: execution_log
title: "五层分支治理执行记录"
status: open
created_at: 2026-09-09T17:33:09+08:00
updated_at: 2026-09-09T18:02:04+08:00
plan_id: PLAN-20260909-PCVDMF5G
related_ids: [PLAN-20260909-PCVDMF5G, SPEC-20260909-ASMC5N7Z, RULESET-BRANCH-GOVERNANCE]
supersedes: []
superseded_by: []
---

# 执行记录

## 修改前门禁

- 用户提出可复用的五类分支、保护和晋升关系；在 AI 展示单人 PR-only 0 审批、Ruleset、`branch-flow` 和 bootstrap 方案后，用户明确回复“好，开始创建执行”，规则候选已确认。
- 已读取 AGENTS、Planning/Development 阶段菜单、Rules/Docs 协议及 Source、Repository、Git、Implementation、Testing、Security 模块。
- 远端 preflight 为 `git_remote`、fresh、clean，无活动 Plan owned path 重叠；`main` 与 GitHub API 均为 `9146012d2b8350c2a542701ddcdd86c13f289066`。
- GitHub 默认分支为 `main`，当前无 Ruleset/branch protection；只有 `cullenmarcels` 一个直接管理员协作者，Actions enabled。
- 从该基线创建 `feature/branch-governance`；没有删除或改写现有分支。

## 固定实现决定

- 单人阶段 required approvals 为 0，但必须 PR、解决对话、通过流向检查；稳定/发布分支无管理员 bypass。
- `branch-flow` 使用 `pull_request_target`，只 checkout PR base SHA，权限固定为 `contents: read`，不执行 PR head 内容。
- `actions/checkout` v6 固定 commit `d23441a48e516b6c34aea4fa41551a30e30af803`。
- bootstrap PR 是保护启用前唯一 `feature/* → main` 例外；合并后从同一 main HEAD 创建三个长期分支并启用保护。

## 当前状态

### 本地实现与验证

- 已新增 Branch Governance Ruleset、Spec、Plan、流向验证器、单元测试、最小权限工作流和 PR 模板，并更新根脚本及确定性索引。
- `hooks/update-indexes.ps1 -Write`：`INDEX_VALIDATION=PASSED`。
- `pnpm branch-flow:test`：2 个测试套件断言，覆盖 5 个合法流向和 10 个非法流向，全部通过。
- `pnpm validate`：ESLint、Prettier、TypeScript、API 8 项测试、Web 3 项测试、branch-flow 测试、三个工作区构建及 `validate-project.ps1 -Check` 全部通过。
- `git diff --check`：通过，无空白错误。
- 候选提交前 `git fetch --prune origin` 因 `github.com:443` 连接重置失败；按 Plan 降级到 GitHub 官方 API，重新读取 `refs/heads/main` 仍为 `9146012d2b8350c2a542701ddcdd86c13f289066`，并确认不存在同 head 的重复 PR。此项记录为传输降级，不把失败的 fetch 伪记为通过。

### 阶段暂停点

本地 bootstrap 候选已经就绪；远端长期分支、Ruleset 和 required check 尚未创建，保持 pending。下一步只推送 `feature/branch-governance` 并创建一次性 bootstrap PR，等待用户在 GitHub 合并后再继续远端配置。

## Bootstrap 合并与远端实施

- 用户于 2026-09-09 明确报告 PR #2 已合并；GitHub API 复核 PR 状态为 `MERGED`，merge commit 与 `refs/heads/main` 均为 `c4a6d7462fc2d20bcc4b5a38ecb1d2db05dcec54`。
- `develop`、`release`、`master` 均从该精确提交以非强制 Git Data API 创建，初始状态无漂移；默认分支仍为 `main`。
- 创建 `Develop history protection` Ruleset `22629637`：active、无 bypass、禁止 deletion 与 non-fast-forward，不要求 PR。
- 创建初版 `Stable and release PR protection` Ruleset `22629639`：active、无 bypass、0 审批、解决 Review 对话、只允许 merge、禁止 deletion 与 non-fast-forward。
- 合法探针 PR #3（`feature/branch-flow-probe → develop`）的 `branch-flow` 在 GitHub Actions 实际通过；非法探针 PR #4（同 head → `release`）实际失败且 `mergeStateStatus=BLOCKED`。两个探针均未合并，随后已关闭；临时 probe 分支已删除，提交不包含文件变化。

## Review 发现：检查上下文必须按目标隔离

- PR #3 与 #4 故意复用同一 head commit 后，GitHub 在该 SHA 上同时展示同名 `branch-flow` 的成功与失败结果，证明通用 context 存在跨目标状态复用风险。
- 修正设计为单 Job 动态检查名 `branch-flow-<base>`，并将一个合并的稳定/发布 Ruleset 拆成 `main`、`master`、`release` 三个 Ruleset，各自要求对应 context。
- 该发现属于实现阶段安全修复，不降低门禁；修复从 `feature/branch-governance-hardening` 开始，沿 `develop → release → master → main` 晋升后重新执行正负探针。

## PR #8 后远端验证与证据链修复

- PR #8 经用户人工确认后合并，merge commit 与 `refs/heads/main` 均为 `0978a9dc72fc3d4e731e9f515c406d493bd6f52d`。
- 最终 active Ruleset：develop `22629637`；main `22709516`；master `22709517`；release `22709519`。四者均无 bypass，稳定/发布分支分别要求 `branch-flow-main`、`branch-flow-master`、`branch-flow-release`。
- required status 的 strict 策略设为 false：检查仍为必需，但不要求 source 包含 target 上一轮生成的 merge commit，避免单向晋升链在第二轮被历史拓扑锁死。
- develop 使用普通 fast-forward API 提交无内容验证 commit `a9e836a7eb2d23cad1f7951bf0e9b01fb4f85c2d`；PR #9 的 `branch-flow-release`、PR #10 的 `branch-flow-master`、PR #11 的 `branch-flow-main` 分别独立通过。#9、#10 使用 merge commit 完成验证晋升；#11 不是产品发布，验证后关闭且未合并。
- 独立 SHA `1fb8bdb6acb582c1f8ae240c6f165cb566a18dd5` 的非法 PR #12（`feature/branch-flow-negative → release`）只产生 `branch-flow-release=FAILURE`，`mergeStateStatus=BLOCKED`；随后关闭 PR 并删除临时分支。
- 计算候选 owned scope digest 时发现 `project-library.ps1` 使用 `TrimStart('./')`，会把 `.github` 误规范化为 `github` 并漏算工作流。已将修复纳入 scope，只剥离精确 `./` 前缀，并新增 PowerShell/Node 回归测试。
- 为保持已归档 Plan 的既有摘要不可变，摘要算法显式版本化：没有 `scope_digest_version` 的历史状态继续使用 v1；当前 Plan 固定为 v2。验证器按状态版本重算，既不改写历史摘要，也不让新 Plan 漏算点号目录。

## 候选 Review 与 Regression

- 点号路径和 digest v2 修复后，`pnpm branch-flow:test` 为 5/5，`pnpm validate` 全部通过；历史 v1 digest 与当前 v2 digest 同时通过项目校验。
- confirmed `plan.md` 曾在上下文隔离修正时被同步改写；候选前已恢复 bootstrap 时的冻结正文，实际偏差只保存在可变 Spec、State、Execution 和报告中。
- Review 绑定候选 `113102a23f4ddafb7fbc056bf7585a22793c92c1`，v2 owned scope digest 为 `B950396F4AFEAEB7CD1F934B8BF84494944E957635664911F71388EA6221A13E`。
- 独立候选 Regression 通过，Plan 进入 `acceptance_pending`；accepted/integrated 证据仍为 null，等待最终证据 PR head 和用户明确验收。
