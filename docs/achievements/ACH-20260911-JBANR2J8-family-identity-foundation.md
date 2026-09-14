---
id: ACH-20260911-JBANR2J8
type: achievement
title: "家庭身份、成员权限、单次邀请与家庭动态基础：完成归档"
status: archived
created_at: 2026-09-14T13:50:23+08:00
updated_at: 2026-09-14T13:50:23+08:00
related_ids: [PLAN-20260911-JBANR2J8, PLAN-20260911-JBANR2J8-EXEC, PLAN-20260911-JBANR2J8-REVIEW, PLAN-20260911-JBANR2J8-REGRESSION, PLAN-20260911-JBANR2J8-ACCEPTANCE, PLAN-20260911-X27F6QNT, SPEC-20260911-3YV4GCRZ, DES-20260911-9Z3KRKCQ, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-GIT-COLLABORATION, RULESET-BRANCH-GOVERNANCE, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-RESPONSIVE-UI, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260911-JBANR2J8
confirmed_by: user
confirmed_at: 2026-09-14T13:31:00+08:00
archived_at: 2026-09-14T13:50:23+08:00
confirmation_record: "确认验收候选 8c740de，并授权合并 PR #22 到 develop"
repository_mode: git_remote
reviewed_commit: 66344d706a7b572d7c7af2b796af0bdd819d67c2
reviewed_scope_digest: AA322064285FD1EEE1C3C650DA7602DB1E4E33FCB43D3C714890EFD940DFF7D3
accepted_commit: 8c740de3587abd7791b5415e54e315efb8cfaac9
accepted_scope_digest: F0A052EE1C47F58A63640EF1F51862246C351EED6BF59367EF86DCF2230856EA
integrated_commit: b3f2b4682f2b7a831069eab147334b5183c7892b
integrated_scope_digest: F0A052EE1C47F58A63640EF1F51862246C351EED6BF59367EF86DCF2230856EA
scope_digest_version: 2
ci_status: configured_scope_passed
platform_scope: windows11-docker-github-actions
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/22
---

# `ACH-20260911-JBANR2J8` — 家庭身份、成员权限、邀请与动态基础

## 归档摘要

- 原家庭 Plan `PLAN-20260911-X27F6QNT` 完成主体能力后，在人工验收中发现英文错误与撤销缺少确认，遂由修订 Plan [`PLAN-20260911-JBANR2J8`](../plans/PLAN-20260911-JBANR2J8/plan.md) 接管并重新形成候选；历史证据保留为 superseded。
- Review：[`passed`](../plans/PLAN-20260911-JBANR2J8/review-report.md)。
- 候选与集成 Regression：[`passed`](../plans/PLAN-20260911-JBANR2J8/regression-report.md)。
- 用户于 `2026-09-14T13:31:00+08:00` 明确验收最终 PR Head 并授权合并 PR #22 到 develop。
- Accepted 与 integrated v2 scope digest 相同，普通 merge 没有改变验收范围。

## 已交付功能

### 家庭数据、Session 与权限

- PostgreSQL 新增 `Family`、`FamilyMembership`、`FamilyInvitation` 和 `FamilyActivity` 的前向 migration；唯一 ACTIVE OWNER、成员关系唯一性、级联与查询索引约束生效。
- 一个账号可加入多个家庭，Session 保存 `activeFamilyId`；登录、恢复、退出或被移除后按最近加入关系确定性修正当前家庭。
- 服务端集中执行 OWNER/ADMIN/MEMBER 权限矩阵；家庭称呼仅用于显示，不参与授权。
- 创建、加入、角色变化、退出与移除在同一 PostgreSQL 事务内写入对应家庭 Activity，游标分页稳定且墓碑响应不泄露原内容。

### 单次邀请与安全边界

- 12 位 Crockford Base32 邀请口令采用安全随机源，明文只在创建响应中出现一次；数据库仅保存带域分隔的 keyed HMAC。
- 邀请 7 天有效、单人单次消费；撤销、过期、已用和无效口令统一隐藏内部状态，接受动作受账号/IP Redis 限流保护。
- 创建者失权时自动撤销未用邀请；并发接受只允许一个成功，LEFT/REMOVED 成员重入时恢复原 Membership 并降为 MEMBER。
- 撤销事务持久化 `revokedAt`，有效列表过滤已撤销项，旧口令无法再加入；重复撤销保持幂等。

### Web、响应式与中文错误

- 实现家庭 onboarding、创建/加入、多家庭切换、成员与角色管理、邀请一次性展示/复制/撤销、动态分页和未开放模块页面。
- 1024px 以上使用桌面 Navbar，375 与 834 使用紧凑顶部栏及 MobileTabBar；三视口覆盖无横向溢出、键盘、焦点、对话框、aria-live 与 reduced-motion。
- 所有页面错误统一通过稳定 API code 映射中文；未知或英文底层异常只显示中文兜底，不再直接渲染服务端英文详情。
- 创建者使用自己的有效邀请码时显示“你已经是这个家庭的成员，无需重复加入。”且不消费口令；邀请撤销前必须经过可访问的二次确认。

## Review、Regression 与版本绑定

- Reviewed implementation candidate：`66344d706a7b572d7c7af2b796af0bdd819d67c2`；v2 digest：`AA322064285FD1EEE1C3C650DA7602DB1E4E33FCB43D3C714890EFD940DFF7D3`。
- 用户验收的最终 PR Head：`8c740de3587abd7791b5415e54e315efb8cfaac9`；v2 digest：`F0A052EE1C47F58A63640EF1F51862246C351EED6BF59367EF86DCF2230856EA`。
- GitHub merge commit：`b3f2b4682f2b7a831069eab147334b5183c7892b`；v2 digest：`F0A052EE1C47F58A63640EF1F51862246C351EED6BF59367EF86DCF2230856EA`。
- 候选 PR 的 branch-flow、quality、e2e-auth 全部通过；集成 `pnpm validate`、API 20/20、Web 18/18、branch-flow 5/5、build、项目校验、migration、OpenAPI 和 Docker readiness 通过。
- Windows Chromium 集成 Docker E2E 为 28 passed、23 designed skips、0 failed；`develop@b3f2b46…` 的 Quality run `34809978508` 为 success。

## 已处理偏差与保留边界

- 初始 Plan B 候选的英文页面错误与立即撤销行为没有被静默修改历史；通过新 Plan、`RULESET-IMPLEMENTATION-QUALITY v2 / IMPL-007` 和新候选完成修订。
- 候选 Regression 曾出现一次不可复现的并行邀请接受 500；单项、两轮家庭套件、五路并发与集成全量矩阵均未复现，作为观察项保留。
- 集成首次 E2E 使用默认 5173 Origin 连接只允许 8080 的 Docker API，安全机制按设计拒绝；使用明确 Docker URL 后完整通过，没有为测试放宽 Origin/CSRF。
- 真实短信服务商未接入，固定验证码仍仅限 development/test；法律文本仍为草案。
- 家庭删除、所有权转移、宝宝档案、成人完整资料、照片、视频、评论、反应、里程碑、成长数据、非 Chromium 浏览器不在本阶段完成范围。

## 关联证据

- Spec：[`SPEC-20260911-3YV4GCRZ`](../specs/SPEC-20260911-3YV4GCRZ-family-identity/spec.md)。
- Design：[`DES-20260911-9Z3KRKCQ`](../designs/DES-20260911-9Z3KRKCQ-family-identity-ui/design.md)。
- Plan：[计划正文](../plans/PLAN-20260911-JBANR2J8/plan.md)。
- Execution：[执行记录](../plans/PLAN-20260911-JBANR2J8/execution-log.md)。
- Review：[Review Report](../plans/PLAN-20260911-JBANR2J8/review-report.md)。
- Regression：[Regression Report](../plans/PLAN-20260911-JBANR2J8/regression-report.md)。
- Acceptance：[Acceptance Record](../plans/PLAN-20260911-JBANR2J8/acceptance-record.md)。

## 人工确认与不可变状态

- 确认主体：用户。
- 原始确认语义：“确认验收候选 8c740de，并授权合并 PR #22 到 develop”。
- 归档时间：`2026-09-14T13:50:23+08:00`。
- 最终状态：`archived`。

本 Achievement 及对应 Plan 包从归档提交进入 `origin/develop` 起永久只读。后续修复或新业务必须创建新 Plan，不得改写本归档。
