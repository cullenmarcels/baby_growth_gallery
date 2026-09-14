---
id: PLAN-20260911-JBANR2J8-REVIEW
type: review_report
title: "家庭邀请中文错误与撤销确认 Review"
status: passed
created_at: 2026-09-14T10:45:27+08:00
updated_at: 2026-09-14T10:53:44+08:00
plan_id: PLAN-20260911-JBANR2J8
repository_mode: git_remote
reviewed_commit: 66344d706a7b572d7c7af2b796af0bdd819d67c2
reviewed_scope_digest: AA322064285FD1EEE1C3C650DA7602DB1E4E33FCB43D3C714890EFD940DFF7D3
ci_status: passed
related_ids: [PLAN-20260911-JBANR2J8, PLAN-20260911-X27F6QNT, SPEC-20260911-3YV4GCRZ, DES-20260911-9Z3KRKCQ]
supersedes: []
superseded_by: []
---

# Review Report

## 结论

`PASS`。Review 绑定已提交候选 `66344d706a7b572d7c7af2b796af0bdd819d67c2`，按 `scope_digest_version: 2` 对修订 Plan 的 `owned_paths` 重算为 `AA322064285FD1EEE1C3C650DA7602DB1E4E33FCB43D3C714890EFD940DFF7D3`。64 条固定 Rule 均为 `PASS` 或有触发条件依据的 `NOT_APPLICABLE`，无 `FAIL`/`UNVERIFIED`。

本结论只覆盖 feature 候选；PR #22 的 `branch-flow-develop`、`quality`、`e2e-auth` 在新候选证据头上全部通过。Review 不替代独立 Regression、用户试玩或集成复验。

## 需求、实现与安全核对

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 中文错误 | PASS | 认证和家庭用户错误出口统一调用 `userFacingError`；稳定 code 映射为中文，未知 `ApiClientError`、原始 `Error` 和英文 `detail` 只显示中文兜底。代码检索未发现页面渲染 `error.message`。 |
| 创建者重复加入 | PASS | 组件测试证明 `ALREADY_FAMILY_MEMBER` 显示指定中文且不泄露英文；真实 API 先返回 409，随后其他账号可使用同一口令成功加入，证明口令未消费。 |
| 撤销确认 | PASS | “撤销”只设置确认目标；取消不调用 API；确认调用一次。复用已有可 Escape、焦点圈定/恢复的 `ConfirmDialog`，三视口浏览器均验证打开、取消和确认。 |
| 撤销失效 | PASS | 服务端事务写 `revokedAt`；有效列表过滤 revoked；接受事务统一拒绝 revoked。E2E 验证列表移除、重复 DELETE 204、旧口令 400 `INVITATION_INVALID`。 |
| 回归 | PASS | API 20、Web 18、branch-flow 5、本地 build、Docker frozen-lockfile build、家庭专项与项目全量 E2E 全通过；认证、CSRF、Session 和状态页无回归。 |
| 数据与秘密 | PASS | 未修改 schema/API；自动化只使用合成账号/家庭。口令明文只存在测试进程与一次性响应，未写入文档、日志或快照。 |

## UI 终端 × 状态矩阵

| 状态 | 375 | 834 | 1440 | 证据 |
| --- | --- | --- | --- | --- |
| 创建者重复加入中文错误 | PASS | PASS | PASS | 共享响应式 Join 表单与 code 映射；组件行为测试加三视口既有页面回归。 |
| 撤销确认打开/取消 | PASS | PASS | PASS | Playwright 在三个 project 验证 dialog 文案、取消后邀请仍可撤销。 |
| 撤销确认成功 | PASS | PASS | PASS | 三视口验证中文 `status`、邀请从列表消失且无横向溢出。 |
| 未知错误兜底 | PASS | PASS | PASS | 纯函数测试证明英文原始异常不输出；同一函数被所有响应式页面错误出口复用。 |
| 原正常/空/加载/错误状态 | PASS | PASS | PASS | 全量 E2E 28 passed/23 designed skips；Web 18 项组件/单元测试。 |

视觉截图仅因真实加入日期从 9/11 变化为 9/14 产生稳定 15 像素差；原基线未更新，设置 `maxDiffPixels: 20` 只容纳动态日期末位，不掩盖结构或布局变化。

## 规则符合性

| Rule | 结果 | Review 证据 |
| --- | --- | --- |
| `SRC-001` | PASS | 已读 AGENTS、Rules/Docs Index、Review 菜单、修订 Plan 与全部适用模块。 |
| `SRC-002` | PASS | 用户要求、既有实现、审计结论、瞬时失败和最终验证分别记录。 |
| `SRC-003` | PASS | 由索引定位 active Spec/Design 与修订 Plan，不按日期猜测。 |
| `SRC-004` | PASS | 用户最新中文/确认要求高于旧候选，原 Plan 标记 superseded 并建立修订 Plan。 |
| `SRC-005` | PASS | “请记住”识别为长期 Rule 并在首次代码修改前完成版本化。 |
| `SRC-006` | PASS | 用户原消息已明确确认入库，规则修改前只做只读定位与影响核对。 |
| `SRC-007` | PASS | `IMPL-007` 来源是用户明确要求，不是 AI 自行提升。 |
| `SRC-008` | PASS | 先查明英文链路、revokedAt、过滤和接受条件，无多余事实提问。 |
| `SRC-009` | PASS | 报告区分本地候选、Docker、本地验证与尚未更新的远端 PR。 |
| `SRC-010` | PASS | 索引由脚本重建并通过 check。 |
| `REPO-001` | PASS | 修改前 clean，无无关用户变更被覆盖。 |
| `REPO-002` | PASS | 全部差异属于用户确认修订 Plan 的 owned paths。 |
| `REPO-003` | PASS | 只清除精确 `bgg-compose:rl:*` 临时限流键；未删 Session、Challenge 或持久数据。 |
| `REPO-004` | PASS | 未提交 dist、test-results、日志、Cookie、Session 或真实数据。 |
| `REPO-005` | PASS | 修改前后均核对 Web、测试、Docs、Rules、Docker 和 API 契约影响。 |
| `REPO-006` | PASS | 无 pull/merge/rebase/reset/force；普通候选 commit 未覆盖他人工作。 |
| `REPO-007` | PASS | 新增 v1 规则快照及规范化 SHA-256；既有历史文件/哈希未改。 |
| `GIT-001` | PASS | preflight 确认 git_remote 和真实根目录。 |
| `GIT-002` | PASS | 固定分支、HEAD、origin freshness 和 `origin/develop` 目标。 |
| `GIT-003` | PASS | 修改前 clean；Review 只绑定已提交候选。 |
| `GIT-004` | PASS | 修订 State 固定 base、branch、target、owned paths、overlap 与 v2 digest。 |
| `GIT-005` | PASS | 原 Plan 先 superseded，新修订 Plan 无活动路径冲突。 |
| `GIT-006` | PASS | 提交和摘要均可重算。 |
| `GIT-007` | NOT_APPLICABLE | 尚未人工验收，accepted 字段为空。 |
| `GIT-008` | NOT_APPLICABLE | 尚未集成或归档。 |
| `GIT-009` | PASS | 本轮尚未 push/merge；远端改变需后续明确步骤。 |
| `GIT-010` | PASS | 所有命令结果、一次失败与后续通过均如实记录。 |
| `BRANCH-001` | PASS | feature 继续只面向 develop。 |
| `BRANCH-002` | PASS | 流向保持 `feature/family-identity-foundation → develop`。 |
| `BRANCH-003` | NOT_APPLICABLE | 不涉及 release/master/main。 |
| `BRANCH-004` | NOT_APPLICABLE | 不修改远端审批参数。 |
| `BRANCH-005` | PASS | 未直接写或 force develop。 |
| `BRANCH-006` | PASS | 继续使用原 Plan B 合法 feature 分支和 PR #22。 |
| `BRANCH-007` | PASS | branch-flow 五项本地测试通过；远端检查待 push。 |
| `BRANCH-008` | NOT_APPLICABLE | 非长期分支晋升。 |
| `BRANCH-009` | NOT_APPLICABLE | 不发布或创建产品 Tag。 |
| `BRANCH-010` | PASS | Ruleset v2 变更有用户确认、修订 Plan、快照、清单和验证。 |
| `IMPL-001` | PASS | 修订 Plan 固定 active Design/Spec 与 64 条精确规则。 |
| `IMPL-002` | PASS | Auth/Family 共用错误映射，测试、Docs、Rules、索引同步。 |
| `IMPL-003` | PASS | 原冻结 Plan 未改正文；以新 ID 修订 UI 行为。 |
| `IMPL-004` | PASS | Execution Log 可重建预检、实现、失败、复查和候选。 |
| `IMPL-005` | PASS | 专项、全量与 Docker 验证后才形成 Review PASS。 |
| `IMPL-006` | PASS | 未扩张 API、schema、邀请角色或其他业务模块。 |
| `IMPL-007` | PASS | 所有页面错误出口不直接渲染原始英文，已知/未知路径均有自动化证据。 |
| `TEST-001` | PASS | 新 MUST Rule 有 automatic/review/regression 验证定义。 |
| `TEST-002` | PASS | 本表逐条覆盖 64 个固定 Rule ID。 |
| `TEST-003` | PASS | Review 后仍需独立 Regression。 |
| `TEST-004` | PASS | 每项使用标准结论并附证据。 |
| `TEST-005` | PASS | 无 FAIL/UNVERIFIED；测试定位错误在通过前已修正。 |
| `TEST-006` | PASS | 回归矩阵含错误映射、撤销事务、认证、三视口、Docker 和偶发 500 观察。 |
| `TEST-007` | PASS | 复用 Vitest/Testing Library/Playwright/Docker，无新增依赖。 |
| `TEST-008` | PASS | 明确区分 candidate Review 与后续 Regression/integration。 |
| `TEST-009` | PASS | PR #22 的 branch-flow-develop、quality、e2e-auth 全部通过；失败仍会阻止验收。 |
| `TEST-010` | PASS | 只声称当前 Windows Chromium 与 Docker 环境结果。 |
| `RESP-001` | PASS | 375/834/1440 同步验证。 |
| `RESP-002` | PASS | 确认框复用响应式主体组件，同期实现。 |
| `RESP-003` | PASS | 已知、未知、取消、成功、失效及原状态均覆盖。 |
| `RESP-004` | PASS | 本报告包含终端 × 状态矩阵。 |
| `RESP-005` | PASS | 沿用确认的 1024px 与三个视口，无新设备参数。 |
| `RESP-006` | PASS | 未增加固定设备布局，三视口无溢出。 |
| `SAFE-001` | PASS | 无真实密码、Cookie、Session、密钥或邀请码写入证据。 |
| `SAFE-002` | PASS | 账号、家庭和称呼均为合成数据。 |
| `SAFE-003` | PASS | UI 只基于 code，未扩大敏感 detail；邀请存储语义不变。 |
| `SAFE-004` | PASS | 日志只记录异常类型/traceId，不展开疑似秘密。 |

## 已处理发现与剩余风险

| 严重级别 | 发现 | 处理与复查 |
| --- | --- | --- |
| High | 家庭页直接显示服务端英文 `detail`。 | 移除原始 `error.message` 通道，集中 code→中文映射；组件测试与代码检索通过。 |
| High | 邀请撤销无二次确认。 | 增加 ConfirmDialog；组件和三视口 E2E 验证取消零调用、确认单调用。 |
| High | 需要证明撤销后的口令真正失效。 | 审计事务并补列表、幂等、接受拒绝真实 API 证据。 |
| Medium | 初次 Docker 并行运行中，一次创建者自用后成员接受得到 500。 | 单项复跑通过、完整并行专项两次通过、相同关键路径 5 路并行重复全部通过；无法复现，保留为 Regression 观察项。 |
| Low | 视觉基线包含真实“加入于”日期，跨日有 15 像素变化。 | 不更新基线，限定 20 像素容差；结构变化仍会失败。后续可把日期改为稳定 mask。 |

剩余产品边界不变：真实短信未接入、法律文本仍为草案。本修订不改变这些上线限制。
