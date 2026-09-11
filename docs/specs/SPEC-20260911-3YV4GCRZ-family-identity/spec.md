---
id: SPEC-20260911-3YV4GCRZ
type: spec
title: "家庭身份、成员权限、单次邀请与家庭动态规格"
status: active
created_at: 2026-09-11T10:21:26+08:00
updated_at: 2026-09-11T10:21:26+08:00
related_ids: [DES-20260908-ZVZKM07B, DES-20260911-9Z3KRKCQ, SPEC-20260910-VP1CDG7N, PLAN-20260911-X27F6QNT]
supersedes: []
superseded_by: []
---

# 家庭身份、成员权限、单次邀请与家庭动态规格

## 目标与身份边界

在已归档的手机号认证和 Redis Session 上增加多家庭身份。账号可加入多个家庭，一个 Session 选择一个活动家庭；所有资源请求根据 PostgreSQL ACTIVE Membership 重新授权，不信任前端 familyId、角色或称呼。家庭称呼仅用于展示，OWNER/ADMIN/MEMBER 才是授权角色。

## 数据模型

- `Family`：UUID、trim 后 1–40 字符的 name、createdByAccountId、createdAt、updatedAt。
- `FamilyMembership`：familyId/accountId 唯一；role 为 OWNER/ADMIN/MEMBER，status 为 ACTIVE/LEFT/REMOVED；displayName trim 后 1–30 字符；joinedAt、leftAt、updatedAt。
- 数据库部分唯一索引保证每个家庭最多一个 ACTIVE OWNER；应用禁止 OWNER 退出、移除和降级，使本阶段始终恰有一个 ACTIVE OWNER。
- `FamilyInvitation`：只保存唯一 tokenDigest、固定 MEMBER role、创建者 Membership、7 天 expiresAt、used/revoked/created 时间及 usedByAccountId。明文只在创建响应返回一次。
- `FamilyActivity`：familyId、可空 actorMembershipId、字符串 type、schemaVersion、可空 subject、最小 JSON summary、ACTIVE/TOMBSTONED、occurred/tombstoned 时间；按 `(familyId, occurredAt, id)` 索引。
- Family 删除时级联删除 Membership、Invitation 和 Activity，但本阶段不开放删除 API；账号删除受 Family/Membership 关系限制。

## 角色规则

- OWNER 创建/撤销邀请、管理 ADMIN/MEMBER；不能退出、移除自己或转移所有权。
- ADMIN 创建/撤销 MEMBER 邀请、移除 MEMBER；不能操作 OWNER 或其他 ADMIN。
- MEMBER 查看家庭、成员、动态并可主动退出。
- 未加入或已退出的家庭统一 404 `FAMILY_NOT_FOUND`；角色不足 403 `FAMILY_PERMISSION_DENIED`；并发状态冲突 409 `FAMILY_STATE_CONFLICT`；OWNER 不变量冲突 409 `FAMILY_OWNER_REQUIRED`。

## 邀请安全

- 使用安全随机源生成 12 位 Crockford Base32，显示 `XXXX-XXXX-XXXX`；输入去空格/连字符、转大写并兼容 O→0、I/L→1。
- 使用 `AUTH_HMAC_SECRET` 和 `family-invitation:v1:` 域分隔做 SHA-256 HMAC；数据库、日志、文档和测试快照不得保存明文。
- 接受尝试按账号 10 次/15 分钟、IP 30 次/15 分钟限流；成功不清除计数；Redis 故障 503，不回退内存。
- 无效、已用、撤销、过期或创建者失权统一 400 `INVITATION_INVALID`。有效口令对应已是 ACTIVE 成员时 409 `ALREADY_FAMILY_MEMBER`，且不消费口令。
- 接受使用 Serializable 事务和有限冲突重试；口令只能成功一次。LEFT/REMOVED 重新加入恢复原 Membership、role=MEMBER、更新 displayName/joinedAt、清 leftAt。
- 邀请创建者退出、被移除或 ADMIN 降为 MEMBER 时，同事务撤销其全部未用邀请；接受时再次检查创建者权限。

## Session 当前家庭

- Session 增加 `activeFamilyId`，`AccountSummary.activeFamilyId` 为 `string|null`。
- 当前 ID 有效则保留；无效或缺失时按 `joinedAt DESC,id DESC` 选择最近 ACTIVE Membership；没有则为 null。
- 登录、`GET /auth/session`、退出/移除后的请求均执行修正；创建、接受和 activate 成功后写 Session。
- 不扫描或批量改写其他浏览器 Session；它们在下次 Session/家庭请求时由数据库授权立即修正。

## 事务一致的活动投影

固定事件码：`FAMILY_CREATED`、`MEMBER_JOINED`、`MEMBER_ROLE_CHANGED`、`MEMBER_LEFT`、`PHOTO_UPLOADED`、`COMMENT_ADDED`、`REACTION_ADDED`、`MILESTONE_RECORDED`、`GROWTH_RECORDED`。

本阶段只产生前四类 schemaVersion 1 事件：

- FAMILY_CREATED `{familyName}`。
- MEMBER_JOINED `{membershipId,displayName,role,joinKind:NEW|REJOINED}`。
- MEMBER_ROLE_CHANGED `{membershipId,displayName,fromRole,toRole}`。
- MEMBER_LEFT `{membershipId,displayName,reason:LEFT|REMOVED}`。

业务写入和 Activity 必须同一 PostgreSQL 事务；角色 no-op 不写事件。后五类仅固定事件码和公共信封，payload 由未来来源 Plan 定义。内部墓碑化清 subjectId/summary 并标记时间；公共 API 只返回 `CONTENT_DELETED` 和通用文案，不泄漏原类型、actor、subject 或 summary。

## API 与分页

- 实现已确认的 13 个 Family 接口：创建/列表/激活/详情/成员列表/角色调整/移除/退出、邀请创建/列表/撤销/接受及活动列表。
- FamilySummary 含 id/name/createdAt/currentMembership；FamilyMember 不返回 accountId；邀请列表不返回 token/digest；接受响应同时返回 FamilySummary 与 AccountSummary。
- 所有 mutation 复用 Plan A Origin、CSRF、HttpOnly Session 和 Problem Details，不自动重放。
- Activity 默认 20、最大 50，按 `(occurredAt DESC,id DESC)`；opaque cursor 是严格 base64url `{v:1,occurredAt,id}`，无效返回 400 `CURSOR_INVALID`。
- OpenAPI 是生成客户端唯一来源；客户端 Query key 必须包含 familyId，避免跨家庭缓存泄漏。

## Web 与响应式

- `/app` 按当前家庭跳转或进入 onboarding；实现 onboarding、family page、family switcher 和四个尚未开放路由。
- `>=1024px` 桌面顶部 Navbar，`<1024px` 紧凑顶部栏与 MobileTabBar；验证 375/834/1440。
- 邀请明文仅在创建成功面板出现一次；复制失败保留手工选择能力。
- 覆盖正常、空、加载、错误、分页、权限、失效和并发状态；表单使用 React Hook Form + Zod，支持键盘、焦点、aria-live 与 reduced-motion。

## 非目标与上线边界

- 不实现真实短信、家庭删除、所有权转移、ADMIN 邀请、账号删除、宝宝/成人资料、头像、照片、视频、评论、反应、里程碑或成长数据来源模块。
- 不增加消息队列、Outbox 或最终一致性；不持久化账号级最近家庭。
- 不修改远端 required checks，不创建 main 发布 Tag，不把开发验证码或法律草案当作生产能力。
