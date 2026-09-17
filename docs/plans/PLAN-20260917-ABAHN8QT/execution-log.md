---
id: PLAN-20260917-ABAHN8QT-EXEC
type: execution_log
title: "照片回收权限修订执行记录"
status: in_progress
created_at: 2026-09-17T10:43:49+08:00
updated_at: 2026-09-17T10:43:49+08:00
plan_id: PLAN-20260917-ABAHN8QT
related_ids: [PLAN-20260917-ABAHN8QT, SPEC-20260917-NHHC01TR, DES-20260917-8EVTR3RJ]
supersedes: []
superseded_by: []
---

# Execution Log

- 修改前本地 HEAD `7c2b9de0a99df5598d218eb6e325b332b2567223`、`feature/photo-upload-foundation`、工作树 clean；`git fetch --prune origin` exit 0，`origin/develop@fb6fa7a94528255aca77ab04b0009f1cd3064b29` 与原始基线一致。通用 preflight 因功能分支无 upstream 给出 `remote_freshness=unverified`，以精确目标引用核对补足，不误报其通过。
- 用户确认长期 `SAFE-005` 以及修订方案：管理员回收成员照片后成员不得恢复；旧回收记录未知操作者，仅管理员恢复；本人 MEMBER 回收仍可本人恢复。已向用户逐项说明当前照片回收、宝宝归档、家庭成员和邀请限制的适用操作与页面反馈，明确不加入全局封禁或管理员读取他人私有草稿。
- 只读核对发现旧 `PhotoPolicyService.canManagePublished` 同时用于回收和恢复，导致作者可撤销管理员回收；Web 对所有 TRASHED 卡片显示恢复按钮。本地开发库有 1 条来源未知的旧回收记录，仅记录数量，不输出内容。
- 按项目冻结规则新建 Spec、Design、Plan 修订，旧 Plan D 状态转为 superseded；`RULESET-SECURITY-PRIVACY v1` 完整快照的规范化 SHA-256 与原文相同，v2 新增 SAFE-005 并登记历史清单。
- 新增 Prisma 前向迁移 `20260917120000_photo_recycle_authority`：记录 `trashedByMembershipId` 与 `trashedByRole`，并以配对 CHECK 约束保证来源字段一致；已在本地 Docker PostgreSQL 成功 `prisma migrate deploy`。升级后核对到 1 条旧 TRASHED 记录，来源仍为双 null。
- 服务端恢复权限改为：当前 OWNER/ADMIN 可恢复有效回收；MEMBER 仅能恢复本人以 MEMBER 身份回收的照片；旧来源未知记录对 MEMBER 安全拒绝。恢复使用回收快照、期限和状态条件更新，成功后清空来源字段；新增 `canRestore` 和 `PHOTO_RESTORE_ADMIN_REQUIRED` 中文契约。
- Web 管理中心按 `canRestore` 隐藏不可用恢复按钮，展示中文管理员说明；旧页面请求遭 403 时刷新照片/家庭查询且不重放 mutation。补充 API/Web 单测与合成 E2E 角色矩阵。
- 验证结果：`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过；Docker 完整栈在 API 使用内部 `minio:9000`、显式 `TRUST_PROXY=1` 和隔离 Redis 前缀后，`pnpm e2e` 通过 `36 passed / 27 skipped / 0 failed`（375、834、1440 三视口，认证、家庭、宝宝、照片流程均纳入）。此前隔离运行的失败来自额外本地 API 进程与错误的内部 S3 端点，已停止竞争进程并按 Docker 栈配置复验，不属于当前代码失败。
- `hooks/validate-rules.ps1` 通过（65 条规则、14 个 Ruleset）；已应用 Plan D 前向 migration，Docker API/Web、readiness 和 Web 登录页均返回成功。候选固定为 `4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d`，v2 `owned_paths` scope digest 为 `BEC7641DB2358A29349AA8046449EAFA0647B96C08847A48B33AB2AE6D5F3A2E`；提交后工作树 clean，`origin/develop` 未变化。
- 本次实现和自动化证据已达到候选交接条件，但 Review/Regression 尚未签署。原 Plan D 保留的两项用户决策仍是 Review 前置门禁：CI 失败产物是否只允许上传安全状态摘要；Presigned POST 是否在固定对象 Key/签名条件之外增加服务端一次性执行语义。未得到确认前不标记 Review 通过、不创建 PR，也不进入人工验收确认。
