---
id: PLAN-20260909-PCVDMF5G-REVIEW
type: review_report
title: "五层分支治理 Review"
status: passed
created_at: 2026-09-09T17:33:09+08:00
updated_at: 2026-09-10T09:39:09+08:00
plan_id: PLAN-20260909-PCVDMF5G
repository_mode: git_remote
reviewed_commit: 113102a23f4ddafb7fbc056bf7585a22793c92c1
reviewed_scope_digest: B950396F4AFEAEB7CD1F934B8BF84494944E957635664911F71388EA6221A13E
ci_status: configured_scope_passed
related_ids: [PLAN-20260909-PCVDMF5G, SPEC-20260909-ASMC5N7Z, RULESET-BRANCH-GOVERNANCE]
supersedes: []
superseded_by: []
---

# Review Report

## 结论

`PASS`。Review 绑定本地已提交候选 `113102a23f4ddafb7fbc056bf7585a22793c92c1`；按 `scope_digest_version: 2` 对 13 个 owned paths 重算得到 `B950396F4AFEAEB7CD1F934B8BF84494944E957635664911F71388EA6221A13E`。三个阻断级问题均已修复并复查：跨目标 status context 复用、strict 策略与单向 merge 历史冲突、点号目录被 scope digest 漏算。

GitHub Actions 仅配置本 Plan 范围内的分支流向检查，结果为 `configured_scope_passed`；完整应用 CI 仍是明确非目标，不冒充已配置。

## 实现与远端配置

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 分支拓扑 | PASS | `develop`、`release`、`master` 从 bootstrap main 同一提交创建，默认分支保持 `main`。 |
| develop 保护 | PASS | Ruleset `22629637` active，无 bypass，只包含 deletion 与 non-fast-forward。 |
| main 保护 | PASS | Ruleset `22709516` active，无 bypass，PR-only、0 审批、解决对话、merge-only、`branch-flow-main`。 |
| master 保护 | PASS | Ruleset `22709517` active，无 bypass，PR-only、0 审批、解决对话、merge-only、`branch-flow-master`。 |
| release 保护 | PASS | Ruleset `22709519` active，无 bypass，PR-only、0 审批、解决对话、merge-only、`branch-flow-release`。 |
| 单向循环兼容 | PASS | 三个 required status checks 的 strict 均为 false；不会要求 source 反向包含 target 上轮 merge commit。 |
| 工作流信任边界 | PASS | `pull_request_target` 只 checkout base SHA，`contents: read`，不执行 head，checkout 固定精确 commit。 |
| 检查隔离 | PASS | Job context 动态为 `branch-flow-<base>`；单元测试和独立 SHA 远端探针均证明不跨目标复用。 |
| 合并历史 | PASS | PR #5、#6、#7、#8、#9、#10 均使用普通 merge commit；没有 force push。 |
| 临时资产 | PASS | PR #3、#4、#11、#12 均已关闭；两个 probe feature 分支均已删除；现有 `feature/project-foundation` 未删除。 |

## 规则符合性

| Rule | 结果 | Review 证据 |
| --- | --- | --- |
| `BRANCH-001` | PASS | 五类分支职责在 Rule、Spec、远端 refs 一致。 |
| `BRANCH-002` | PASS | 自动矩阵与实际 PR #5/#6/#7/#8/#9/#10 覆盖完整晋升链。 |
| `BRANCH-003` | PASS | main/master/release 各自 active PR-only Ruleset，无 bypass、禁止删除/强推。 |
| `BRANCH-004` | PASS | 直接协作者仍只有一人；审批数 0，Review 对话必须解决。 |
| `BRANCH-005` | PASS | develop 的普通 fast-forward 探针成功，Ruleset 禁止删除与非快进。 |
| `BRANCH-006` | PASS | 功能分支使用 kebab-case，PR #5 合法进入 develop；临时分支已清理。 |
| `BRANCH-007` | PASS | 三个目标 context 分别 required；正负远端 PR 证明强制生效。 |
| `BRANCH-008` | PASS | 所有实际晋升均为 merge commit，边界可从 GitHub PR 重建。 |
| `BRANCH-009` | NOT_APPLICABLE | 本次是治理配置，不是产品版本发布，不创建 Tag/Release。 |
| `BRANCH-010` | PASS | Spec、Execution Log、Ruleset ID、PR、SHA 和 API 回读证据齐全。 |
| `SRC-001` | PASS | 修改前读取 AGENTS、Docs/Rules 协议与阶段菜单。 |
| `SRC-002` | PASS | 用户要求、设计决定、远端事实和异常发现分别记录。 |
| `SRC-003` | PASS | 通过当前 active Spec/Rule/Plan 和 GitHub API 定位事实。 |
| `SRC-004` | PASS | GitHub Rulesets 参数以官方 API schema 与实际响应核对。 |
| `SRC-005` | PASS | 用户本轮只报告合并，没有新增未确认长期规则。 |
| `SRC-006` | PASS | 分支模型和执行方案均有用户明确确认。 |
| `SRC-007` | PASS | 技术修正保持用户确认的五层职责和单向链不变。 |
| `SRC-008` | PASS | 先核验 PR、refs、Rulesets、Actions、协作者，再修改。 |
| `SRC-009` | PASS | 本地、远端分支和合并状态均使用精确 SHA 区分。 |
| `SRC-010` | PASS | 索引由 `update-indexes.ps1` 确定性生成并检查。 |
| `REPO-001` | PASS | 没有覆盖应用代码、LICENSE、README 或用户资产。 |
| `REPO-002` | PASS | 修改位于更新后的 owned paths；新增 digest hook/test 明确入 scope。 |
| `REPO-003` | PASS | 只删除本 Plan 创建且已关闭的临时 probe refs，没有删除用户分支。 |
| `REPO-004` | PASS | 没有新增凭据、环境文件、构建产物或日志。 |
| `REPO-005` | PASS | 每次提交前核对 status、diff、tree SHA 和 API 结果。 |
| `REPO-006` | PASS | 没有 reset、force push 或直接更新稳定/发布分支。 |
| `REPO-007` | PASS | 已归档 Plan/Achievement/哈希清单保持未修改且验证通过。 |
| `GIT-001` | PASS | 仓库模式为 git_remote，根目录为当前工作区。 |
| `GIT-002` | PASS | Git HTTPS 失败与 API 精确远端新鲜度分别如实记录。 |
| `GIT-003` | PASS | 修改前工作树 clean，无 owned path 重叠。 |
| `GIT-004` | PASS | State 固定当前 base、work branch、target、digest version 和 owned paths。 |
| `GIT-005` | PASS | 当前只有本 Plan active，overlap 为空。 |
| `GIT-006` | PASS | Review 绑定已提交候选和 v2 scope digest。 |
| `GIT-007` | PASS | accepted commit/digest 保持 null，等待用户验收最终证据候选。 |
| `GIT-008` | PASS | integrated commit/digest 保持 null，未提前归档。 |
| `GIT-009` | PASS | 远端写入来自用户执行授权；稳定分支均通过 PR，没有 force。 |
| `GIT-010` | PASS | Git 443 不可用、完整 CI 非目标、远端 Actions 结果均准确标记。 |
| `IMPL-001` | PASS | 实现遵守确认的分支角色、流向和单人审批边界。 |
| `IMPL-002` | PASS | Workflow、脚本、测试、Rule、Spec、State 和索引同步。 |
| `IMPL-003` | PASS | 上下文隔离、strict=false 和 digest v2 都有明确兼容理由。 |
| `IMPL-004` | PASS | Execution Log 可重建 bootstrap、晋升、Ruleset 和探针过程。 |
| `IMPL-005` | PASS | 三项发现修复后才形成 PASS 结论。 |
| `IMPL-006` | PASS | 未扩张业务模块、应用 CI、部署或产品发布。 |
| `TEST-001` | PASS | 每个 MUST 有本地测试、API 回读、PR check 或结构化证据。 |
| `TEST-002` | PASS | 本表覆盖 Plan 引用的全部 Rule ID。 |
| `TEST-003` | PASS | Review 后执行独立 Regression，不复用 Review 结论。 |
| `TEST-004` | PASS | 记录退出码、Ruleset ID、commit、PR、check context 和 SHA。 |
| `TEST-005` | PASS | 没有遗留 FAIL/UNVERIFIED；预期负向失败单独标识。 |
| `TEST-006` | PASS | 回归范围来自 workflow、Git 历史、规则和摘要依赖。 |
| `TEST-007` | PASS | 复用 Node test、pnpm validate、PowerShell hooks 和 GitHub Actions。 |
| `TEST-008` | PASS | 当前是候选回归；最终证据进入 main 后仍需集成复验。 |
| `TEST-009` | PASS | 已配置的 Branch Flow Actions 全部按预期结束；完整 CI 明确非目标。 |
| `TEST-010` | PASS | 只声明 Windows、本地工具和 GitHub-hosted Actions 的实际覆盖。 |
| `SAFE-001` | PASS | 工作流权限最小，不执行不受信任 head；无生产秘密。 |
| `SAFE-004` | PASS | GitHub token 只由 gh keyring 使用，没有写入文件或报告。 |

## 已修复发现

| 严重级别 | 发现 | 修复与复查 |
| --- | --- | --- |
| High | 通用 `branch-flow` context 可在同 SHA、不同 base PR 间混用。 | 按 base 隔离 context，拆分三个 Ruleset；不同 SHA 正负探针验证。 |
| High | `TrimStart('./')` 会把 `.github` 变成 `github`，可能漏算关键工作流。 | 摘要算法 v2 精确移除 `./`，新增点号路径测试；v1 保留给不可变历史。 |
| Medium | strict status policy 与单向 merge-commit 晋升在第二轮冲突。 | strict=false；仍要求 target-specific check 和合法来源，PR #9/#10 证明可重复晋升。 |
| Process | confirmed Plan 曾随实现修正改写。 | 在候选提交 `113102a…` 恢复冻结 Plan 原文；实际偏差只记录于可变 Spec、State、Execution 与报告。 |

## 剩余边界

- 单人仓库无法要求非作者批准；增加第二位 write 协作者后必须升级为至少 1 个批准。
- 当前只强制分支流向，不包含完整 lint/typecheck/test/build CI；这是后续 CI Plan 的职责。
- 未执行可能意外改变生产 ref 的 deletion/force/direct-push 破坏性探针；对应保护由 active Ruleset API 和无 bypass 配置证明。
- UI、响应式、运行时业务状态与本治理变更无关，记为 NOT_APPLICABLE。
