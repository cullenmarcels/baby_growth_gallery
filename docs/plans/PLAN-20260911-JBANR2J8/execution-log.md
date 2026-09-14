---
id: PLAN-20260911-JBANR2J8-EXEC
type: execution_log
title: "家庭邀请中文错误与撤销确认执行记录"
status: open
created_at: 2026-09-11T15:18:21+08:00
updated_at: 2026-09-14T10:42:45+08:00
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
