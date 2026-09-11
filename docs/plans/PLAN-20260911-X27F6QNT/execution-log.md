---
id: PLAN-20260911-X27F6QNT-EXEC
type: execution_log
title: "家庭身份基础执行记录"
status: open
created_at: 2026-09-11T10:21:26+08:00
updated_at: 2026-09-11T14:48:30+08:00
plan_id: PLAN-20260911-X27F6QNT
related_ids: [PLAN-20260911-X27F6QNT, DES-20260911-9Z3KRKCQ, SPEC-20260911-3YV4GCRZ]
supersedes: []
superseded_by: []
---

# 执行记录

## 修改前门禁

- 已读取 AGENTS、Docs/Rules Index、Planning/Development 所需规则、Plan A 当前实现和家庭设计截图。
- 用户消息是对已决策完整 Plan B 的实施授权；内容属于本 Plan 的业务契约，不新增跨项目长期 Rule。
- 远端 preflight：git_remote、HEAD `701f26a…`、origin verified、clean、无 blocking reason 或 active Plan overlap。
- 创建工作分支 `feature/family-identity-foundation`；集成目标固定 `origin/develop`。
- 已归档 Plan A、Achievement 与 ARCHIVE.sha256 不在 owned scope，保持不变。

## 状态变化

| 时间 | 原状态 | 新状态 | 原因 |
| --- | --- | --- | --- |
| 2026-09-11T10:21:26+08:00 | — | confirmed | 用户明确要求实施完整 Plan B。 |
| 2026-09-11T10:21:26+08:00 | confirmed | in_progress | 远端、工作树、基线和 owned scope 门禁通过。 |

## 实施记录

- 新增 Family、FamilyMembership、FamilyInvitation、FamilyActivity Prisma 模型与前向 migration；数据库部分唯一索引保证每个家庭最多一个 ACTIVE OWNER，家庭级联和账号 Restrict/SetNull 关系按 Spec 固定。
- Family API 已交付创建/列出/激活/读取家庭、成员读取/角色调整/移除/退出、邀请创建/列出/撤销/接受及动态 cursor 分页共 13 个端点；所有 mutation 复用 Plan A 的 Session、Origin、CSRF 与 Problem Details。
- 权限集中于 FamilyPolicyService；家庭业务和 FAMILY_CREATED、MEMBER_JOINED、MEMBER_ROLE_CHANGED、MEMBER_LEFT 动态在同一 Serializable PostgreSQL 事务写入，角色 no-op 不重复写 Activity。
- 邀请采用 12 位 Crockford Base32、HMAC 域分隔、7 天有效、明文只在创建响应出现一次；LEFT/REMOVED Membership 恢复原记录并重置为 MEMBER，创建者失权会在同一事务撤销未用邀请。
- 邀请接受使用 Redis 账号/IP 双限流；Redis 故障不降级。高并发回归发现 Prisma 7 adapter 将 PostgreSQL `40001/40P01` 包装为 `DriverAdapterError(cause.kind=TransactionWriteConflict)`，已按真实错误结构加入最多 5 次短退避重试，避免把可重试 Serializable 冲突错误转换为 500。
- Session 增加 `activeFamilyId`，登录、恢复、退出或被移除后均按 `(joinedAt DESC, id DESC)` 修正；AccountSummary 从恒定 null 扩展为 nullable UUID。
- OpenAPI 补充 path/query parameters、Problem Details media type 与 Activity oneOf 联合类型；生成客户端提供全部家庭方法并保持 mutation 不自动重放。
- Web 新增首次创建/加入引导、桌面 Navbar、平板/移动底栏、家庭切换器、成员权限操作、确认对话框、一次性邀请面板、邀请列表和家庭动态分页；375/834/1440 均无横向溢出，业务数据全部由真实 API 返回。
- 时间轴、图集、里程碑和成长数据保持明确“尚未开放”，不创建伪宝宝、照片或成长数据；原 Plan A 登录、注册、找回密码、法律草案、状态页和 404 路由保持有效。

## 候选前验证

- `pnpm lint`、`pnpm format:check`、`pnpm typecheck`、`pnpm test`、`pnpm build` 均 PASS / exit 0；API 20 项、Web 14 项和 branch-flow 5 项测试全部通过。
- `pnpm validate` 与 `hooks/validate-project.ps1 -Check` 均 PASS / exit 0，项目知识库和仓库模式校验通过。
- Windows Chromium 完整本地矩阵：28 passed、23 个按设计 skip、0 failed；viewport-independent API 契约只在 1440 project 执行，UI 创建家庭、导航与视觉基线在 375/834/1440 全部执行。
- Docker frozen-lockfile API/Web 镜像完整重建并 healthy；部署态家庭与 readiness 矩阵为 9 passed、6 个 viewport-independent skip、0 failed，PostgreSQL、Redis、objectStorage 均为 up。
- 现有 Plan A 数据库前向应用 Plan B migration PASS；全新临时空数据库依次应用 Plan A 和 Plan B 两个 migration PASS，验证后已删除临时数据库。
- OpenAPI 与 schema client 连续两次重新生成 SHA-256 组合值一致，确定性检查 PASS。
- 新增三个 Windows 视觉基线，只使用合成家庭“晨光之家”和合成称呼“家人甲”；邀请码在视觉截取后才生成，不进入截图。
- 首轮全量回归暴露并修复两项真实问题：FamilyActivityService 缺少显式 Nest 注入导致动态 500；React Query 全量 clear 与退出路由竞争导致回跳 `/app`。修复后对应专项和全量回归均通过。

## 候选审查补强

- 候选预查没有把并发邀请消费、账号级邀请接受限流、无效 cursor 和墓碑公共序列化标记为已验证；先返回 Development 补充自动化证据，再重新固定候选。
- 新增真实数据库/API 并发验收：两个账号并行接受同一口令，结果严格为一个 `200`、一个统一 `400 INVITATION_INVALID`，最终家庭只有一个新 Membership。
- 新增账号限流边界验收：前 10 次有效格式的无效口令均返回中性 `INVITATION_INVALID`，第 11 次返回 `429 RATE_LIMITED`；测试使用独立 Redis 前缀，未清除成功后的账号或 IP 计数。
- 补充未加入家庭隐藏 404、MEMBER 无邀请权限 403、角色 no-op 不新增 Activity、撤销口令统一无效、无效/未知版本 cursor，以及墓碑公共响应不泄漏原 type、actor、subject、summary 的验证。
- 新增 5 项 Family Web 组件集成测试，覆盖 onboarding 模式/字段错误、mutation 服务错误、无家庭跳转、MEMBER 权限隐藏与空动态，以及家庭访问失败的安全错误状态；全部复用现有 Vitest、Testing Library 和 React Query 测试能力，不新增依赖。
- 使用回滚事务实测家庭数据库级联：删除 Family 后 Membership、Invitation、Activity 计数均为 0，随后 ROLLBACK，不留下审查数据。
- 补强后 `pnpm validate` PASS / exit 0；使用 `bgg-planb-review-a0acfe9` 隔离前缀的三视口完整 E2E 为 28 passed、23 skipped、0 failed。
