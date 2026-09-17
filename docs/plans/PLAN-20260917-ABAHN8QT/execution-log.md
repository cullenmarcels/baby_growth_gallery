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
- 验证结果：`pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均通过；隔离 API/MinIO/Redis/Web 栈下照片 E2E 34/36 通过、2 项失败。失败均为共享数据库中后台照片处理重试时序（一个 834 视口等待草稿、一个 PNG/HEIC 批次在 30 秒内为 `DRAFT,QUEUED`），未发现权限断言失败；首次直接复用开发栈的完整 E2E 另因 Redis 前缀和 API 地址未隔离而限流，已改用隔离前缀复验。
- `hooks/validate-rules.ps1` 通过（65 条规则、14 个 Ruleset）；项目校验在未提交保护归档快照时按仓库规则阻断，待候选提交后重跑。Review/Regression 尚未通过，保留原 Plan D 两项待确认门禁。
