---
id: SPEC-20260917-NHHC01TR
type: spec
title: "照片回收的管理员优先权限修订"
status: active
created_at: 2026-09-17T10:43:49+08:00
updated_at: 2026-09-17T10:43:49+08:00
related_ids: [SPEC-20260916-5Z69DCQE, DES-20260917-8EVTR3RJ, PLAN-20260917-ABAHN8QT]
supersedes: [SPEC-20260916-5Z69DCQE]
superseded_by: []
---

# 照片回收的管理员优先权限修订

除本文件明确修订的回收、恢复权限与响应字段外，`SPEC-20260916-5Z69DCQE` 的上传、处理、草稿、发布、30 天保留、对象清理和安全边界继续适用。用户确认的长期规则为 `RULESET-SECURITY-PRIVACY v2 / SAFE-005`；它不授权管理员查看他人的私有草稿。

## 数据与迁移

- `Photo` 新增可空 `trashedByMembershipId`（家庭 Membership UUID）及 `trashedByRole`（回收瞬间的 `OWNER | ADMIN | MEMBER` 快照），只用于回收权限判断，不通过公共 API 返回操作者身份。
- 前向 migration 只添加字段和受保护外键，不回写 Plan D 已共享 migration；现存 `TRASHED` 行无法证明操作者，两个字段保持 `null`，普通成员不得恢复，当前 ACTIVE OWNER/ADMIN 可恢复。开发库只核对到 1 条旧回收记录，不读取其私密内容。
- 每次 `PUBLISHED → TRASHED` 原子记录本次操作者和角色快照、回收时间与 30 天清理期限；`TRASHED → PUBLISHED` 清空这些字段。再次回收以新的操作者覆盖旧事实。

## 恢复授权

- 当前家庭的 ACTIVE OWNER/ADMIN 可以恢复家庭内任意仍在期限内的已回收照片，包括旧记录；不因此取得他人未发布草稿的访问权。
- 普通 MEMBER 仅能恢复自己上传、且由本人在 MEMBER 身份下回收的照片。只凭作者身份不足以恢复由 OWNER/ADMIN 回收的照片；回收者后来退出或降级也不改变当时的限制。
- 成员后来升级为 OWNER/ADMIN 时按当前管理员权限恢复；后来降级为 MEMBER 时只能满足上述本人 MEMBER 回收条件。
- 服务端必须重新校验家庭、宝宝和当前 ACTIVE Membership，并用条件更新固定 `TRASHED` 状态、有效期及成员可恢复的操作者快照，防止旧页面和并发重回收绕过限制。权限不足返回 `403 PHOTO_RESTORE_ADMIN_REQUIRED`，中文详情为“需要家庭管理员恢复此照片。”；跨家庭仍返回 `404 PHOTO_NOT_FOUND`。
- 到期仍返回 `409 PHOTO_RESTORE_EXPIRED`；恢复成功不重复创建 `PHOTO_UPLOADED`，30 天回收期限规则保持不变。

## 公共响应与页面

- `PhotoSummary` 新增必填 `canRestore: boolean`，由服务端针对当前请求者计算；非回收状态固定 `false`。不返回回收者 Membership ID 或角色快照。
- Web 在“我的上传／回收站”对 `canRestore=false` 的本人照片展示“此照片不可自行恢复；若仍在恢复期，请联系家庭管理员。”，不提供可点击的恢复操作；OWNER/ADMIN 在家庭回收站保留恢复入口。该文案也适用于已过期条目，不暗示过期后仍可找管理员恢复。
- 页面缓存过期、家庭角色变化或旧页面点击遭服务端拒绝时，刷新照片与家庭权限，再给出中文说明。无需新增实时推送或全局账号封禁。

## 验收矩阵

覆盖 MEMBER 自己回收并恢复、OWNER/ADMIN 回收 MEMBER 照片后作者直调 API 与页面均不能恢复、其他管理员恢复、旧 `null` 记录、回收者退出或角色变化、成员升级/降级、并发状态变化、跨家庭、到期、重复回收以及 375／834／1440 的正常、加载和错误状态。迁移须验证空库及已有 Plan D 表的数据升级；OpenAPI 与生成客户端确定性一致。
