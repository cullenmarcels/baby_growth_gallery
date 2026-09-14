---
id: PLAN-20260911-JBANR2J8-EXEC
type: execution_log
title: "家庭邀请中文错误与撤销确认执行记录"
status: open
created_at: 2026-09-11T15:18:21+08:00
updated_at: 2026-09-14T10:53:44+08:00
plan_id: PLAN-20260911-JBANR2J8
related_ids: [PLAN-20260911-JBANR2J8, PLAN-20260911-X27F6QNT, DES-20260911-9Z3KRKCQ, SPEC-20260911-3YV4GCRZ]
supersedes: []
superseded_by: []
---

# 执行记录

## 修改前门禁

- 已读取 AGENTS、Docs/Rules Index、当前 Family Spec/Design、原 Plan 状态及相关代码与测试。
- 远端 preflight：git_remote、HEAD `805a979d…`、origin verified、clean、无活动 Plan 路径冲突。
- 用户将“页面错误提示均使用中文”明确要求记住，已归档 `RULESET-IMPLEMENTATION-QUALITY v1` 并建立 v2 `IMPL-007`；修订 Plan 从本次修改起固定新规则。
- 后端审计确认：撤销事务设置 `FamilyInvitation.revokedAt`；列表过滤 revoked 记录；接受事务将 revoked 邀请统一判为 `INVITATION_INVALID`。前端缺少确认是独立问题。

## 状态变化

| 时间 | 原状态 | 新状态 | 原因 |
| --- | --- | --- | --- |
| 2026-09-11T15:18:21+08:00 | — | confirmed | 用户明确提出人工验收修订与长期中文错误规则。 |
| 2026-09-11T15:18:21+08:00 | confirmed | in_progress | 远端、工作树、修订范围和规则入库门禁通过。 |
| 2026-09-14T10:42:45+08:00 | in_progress | in_review | 中文错误、撤销确认与失效证据实现完成，候选前本地/Docker/三视口验证通过。 |
| 2026-09-14T10:45:27+08:00 | in_review | in_regression | Review 绑定候选 `66344d7…` 与 v2 digest，64 条固定 Rule 无 FAIL/UNVERIFIED。 |
| 2026-09-14T10:49:33+08:00 | in_regression | acceptance_pending | 独立 `pnpm validate`、Docker 全量三视口 E2E 与 readiness 全部通过；等待 PR 新候选 CI。 |

## 实施记录

- 新增统一 `userFacingError`，使用 `ApiClientError.problem.code` 映射中文；认证和家庭全部错误出口复用该函数，未知 API、原始 `Error` 和英文 `detail` 只进入中文兜底，不直接显示到页面。
- `ALREADY_FAMILY_MEMBER` 固定显示“你已经是这个家庭的成员，无需重复加入。”；后端保持先验证邀请、再判断 ACTIVE Membership 的既有语义，不消费口令。
- 邀请列表的“撤销”改为先打开现有键盘可操作 `ConfirmDialog`；取消不调用 API，确认后执行一次撤销并刷新有效邀请列表。
- 真实 API 验证扩展为：创建者自用返回 `409 ALREADY_FAMILY_MEMBER` 后其他账号仍可接受；撤销后列表不再出现邀请；重复撤销返回 `204`；已撤销口令返回 `400 INVITATION_INVALID`。
- 三视口浏览器用例覆盖确认框打开、取消、再次确认、成功通知和列表移除。视觉基线中的成员加入日期未被 `<time>` mask 覆盖，跨 9/11→9/14 仅变化 15 像素；保留原基线并设置 `maxDiffPixels: 20`，不接受结构或布局变化。

## 候选前验证

- `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均 PASS；API 20 项、Web 18 项、branch-flow 5 项通过。
- 家庭专项 Docker E2E 最终为 8 passed、10 designed skips、0 failed；全量三视口 E2E 为 28 passed、23 designed skips、0 failed。
- 初次 Docker E2E 曾出现一个并行接受邀请的瞬时 `500`，单项复跑和后续两次并行家庭关键路径均通过，未复现；该失败保留为 Regression 观察项，不静默抹除。
- Docker 最新 API/Web 镜像完成 frozen-lockfile 构建并运行；五个服务正常，API readiness 的 PostgreSQL、Redis、objectStorage 均为 up。
- 数据库 2 个 migration 均已应用且 schema up to date；本修订未改变数据库或 API 契约。
- OpenAPI/client 连续两次重生成无 Git 差异；哈希读取与确定性检查通过。
- 自动化前仅清除 `bgg-compose:rl:*` 临时限流键，不删除 Session、Challenge、账号、家庭或其他持久数据。

## Review 证据

- 候选提交：`66344d706a7b572d7c7af2b796af0bdd819d67c2`。
- v2 owned-scope digest：`AA322064285FD1EEE1C3C650DA7602DB1E4E33FCB43D3C714890EFD940DFF7D3`。
- 64 条固定 Rule 全部 PASS 或有触发条件依据的 NOT_APPLICABLE，无 FAIL/UNVERIFIED；PR 新候选 CI 如实为 pending。
- 针对初次瞬时 500，再以 5 个并行 worker 重复“创建者自用 409 后成员成功加入”关键路径，5/5 通过。

## 独立 Regression

- Review 后重新执行 `pnpm validate`：exit 0；项目聚合校验 PASS。
- 清除 32 个自动化临时限流键后，在最新 Docker 候选上独立执行全量 E2E：28 passed、23 designed skips、0 failed。
- 回归结束后 API readiness 为 ok，PostgreSQL、Redis、objectStorage 均为 up；Docker 服务继续保留供用户试玩。
- Regression 状态为 passed，但 PR #22 新提交 CI 仍为 pending，未将本地结果冒充远端结果。

## PR CI

- 已普通推送功能候选与 Review/Regression 证据到现有 PR #22；目标保持 `develop`，未 merge、rebase、force push 或创建 Tag。
- PR 证据头 `d3a785720ad8f09185e5b271358fc1e69c4f4a64`：`branch-flow-develop` PASS（3s）、`quality` PASS（1m6s）、`e2e-auth` PASS（1m19s）。
- 记录 CI 的最终证据提交会再次触发检查；只有最终 PR head 三项仍成功才交付人工验收。
