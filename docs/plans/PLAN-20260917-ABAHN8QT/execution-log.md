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
- `hooks/validate-rules.ps1` 通过（65 条规则、14 个 Ruleset）；已应用 Plan D 前向 migration，Docker API/Web、readiness 和 Web 登录页均返回成功。权限实现提交为 `4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d`，随后以 `2e54ba0f092f6729edd2532a4a0f8c3dcab0db99` 固定本次验证证据；提交后工作树 clean，`origin/develop` 未变化。正式候选范围摘要将在门禁决策确认后按最终提交重算。
- 本次实现和自动化证据已达到候选交接条件，但 Review/Regression 尚未签署。原 Plan D 保留的两项用户决策仍是 Review 前置门禁：CI 失败产物是否只允许上传安全状态摘要；Presigned POST 是否在固定对象 Key/签名条件之外增加服务端一次性执行语义。未得到确认前不标记 Review 通过、不创建 PR，也不进入人工验收确认。
- 用户随后确认两项门禁口径：CI 失败时只上传安全状态摘要，不上传原始 trace、截图和完整报告；Presigned POST 接受固定对象 Key + 服务端幂等 `complete`，不要求 S3 层严格一次性执行。该确认已写入 Plan，并按确认语义完成 Review 与独立 Regression。
- 正式 Review 结论 `PASS`：绑定候选 `4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d` 和 v2 digest `BEC7641DB2358A29349AA8046449EAFA0647B96C08847A48B33AB2AE6D5F3A2E`，65 条适用 Rule 全部 PASS，无 FAIL/UNVERIFIED。独立 Regression 结论 `PASS`：本地质量门禁、Docker 完整 E2E（36 passed / 27 skipped / 0 failed）、迁移、readiness 和三视口回归均通过。
- Plan 当前进入 `acceptance_pending`；尚未创建 PR、尚未合并 develop，也尚未获得用户人工验收或合并授权。
- 用户原文确认“人工验收通过候选 4d4360e，并授权进入 PR 流程”。本轮 `git fetch --prune origin` exit 0；GitHub API 与本地均核对 `origin/develop@fb6fa7a94528255aca77ab04b0009f1cd3064b29`，工作树 clean，候选实现与 PR Head 间只有 Plan/索引证据文档差异。首次远端预检网络超时给出 `remote_unverified`，重试和 feature 分支建立 upstream 后预检为 `verified`。
- 按授权普通推送 `feature/photo-upload-foundation` 并创建指向 `develop` 的 PR #24：`https://github.com/cullenmarcels/baby_growth_gallery/pull/24`。PR Head `1847ea047c09e3088a66c1a56b5f55e4c474cefd`，v2 owned-scope digest `B90FC3FAEC9DCC6CB8A6254A2301B34B1767F3A0EAB767770487DFB1A4C5C80A`。验收原文、实现候选、PR Head 和 digest 已记录在 Acceptance Record；合并授权尚未取得。
- PR #24 远端检查最终为 `branch-flow-develop=PASS`（run `35204369442`）、`quality=PASS` 和 `e2e-auth=PASS`（run `35204369171`），均针对 PR Head `1847ea047c09e3088a66c1a56b5f55e4c474cefd`。PR 状态 OPEN、目标 develop、mergeable；未执行 merge。验收与 CI 补充证据保留在本地提交，未推送改变已验收的 PR Head。
- 用户另行明确授权“授权合并 PR #24 到 develop”。合并前复核 PR OPEN、base `develop@fb6fa7a94528255aca77ab04b0009f1cd3064b29`、Head `1847ea047c09e3088a66c1a56b5f55e4c474cefd`、验收 digest 可重算一致，三项检查全部 PASS；`gh pr merge 24 --merge` exit 0。PR 状态 MERGED，merge commit 为 `fb059f073c6c64ffc4e787281a75227e52a1a84a`，其两个父提交依次为固定 base 与 PR Head。
- `git fetch --prune origin` 后 `origin/develop` 为精确 merge commit；集成 tree 与 PR Head 无文件差异，integrated v2 digest `B90FC3FAEC9DCC6CB8A6254A2301B34B1767F3A0EAB767770487DFB1A4C5C80A` 与 accepted digest 相同。`develop` Quality run `35205302697` 最终 success，quality 与 e2e-auth Job 均通过。
- 在精确集成提交上独立复验：`pnpm validate` exit 0（branch-flow 5、API 48、Web 34、lint、format、typecheck、build 与项目校验）；Docker `pnpm e2e` exit 0（36 passed、27 designed skips、0 failed）；`prisma migrate deploy` 报告 5 个 migration、无 pending；Docker 全栈运行、readiness HTTP 200。首次 Windows format 检查因 `core.autocrlf=true` 将 33 个新增源码工作副本检出为 CRLF 而失败；运行 Prettier 规范化后逐个核对 Git blob 与 HEAD 相同、Git 差异为零，再复跑全套通过，未改变验收范围。
