---
id: ACH-20260917-ABAHN8QT
type: achievement
title: "照片隔离上传、安全处理与管理员优先回收：完成归档"
status: archived
created_at: 2026-09-17T17:36:46+08:00
updated_at: 2026-09-17T17:36:46+08:00
related_ids: [PLAN-20260917-ABAHN8QT, PLAN-20260917-ABAHN8QT-EXEC, PLAN-20260917-ABAHN8QT-REVIEW, PLAN-20260917-ABAHN8QT-REGRESSION, PLAN-20260917-ABAHN8QT-ACCEPTANCE, SPEC-20260917-NHHC01TR, DES-20260917-8EVTR3RJ, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-GIT-COLLABORATION, RULESET-BRANCH-GOVERNANCE, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-RESPONSIVE-UI, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260917-ABAHN8QT
confirmed_by: user
confirmed_at: 2026-09-17T17:18:27+08:00
archived_at: 2026-09-17T17:36:46+08:00
confirmation_record: "人工验收通过候选 4d4360e，并授权进入 PR 流程；随后授权合并 PR #24 到 develop"
repository_mode: git_remote
reviewed_commit: 4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d
reviewed_scope_digest: BEC7641DB2358A29349AA8046449EAFA0647B96C08847A48B33AB2AE6D5F3A2E
accepted_commit: 1847ea047c09e3088a66c1a56b5f55e4c474cefd
accepted_scope_digest: B90FC3FAEC9DCC6CB8A6254A2301B34B1767F3A0EAB767770487DFB1A4C5C80A
integrated_commit: fb059f073c6c64ffc4e787281a75227e52a1a84a
integrated_scope_digest: B90FC3FAEC9DCC6CB8A6254A2301B34B1767F3A0EAB767770487DFB1A4C5C80A
scope_digest_version: 2
ci_status: passed
platform_scope: windows11-docker-github-actions
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/24
---

# `ACH-20260917-ABAHN8QT` — 照片上传与回收权限基础

## 归档摘要

- 原照片上传 Plan `PLAN-20260916-83SYH180` 因管理员回收优先规则被修订 Plan [`PLAN-20260917-ABAHN8QT`](../plans/PLAN-20260917-ABAHN8QT/plan.md) 替代；原 Plan 保留历史状态，不改写 Plan A–C 的归档。
- 用户明确验收候选 `4d4360e` 并授权进入 PR 流程，之后单独授权合并 PR #24 到 `develop`。本文件的 `confirmed_at` 是写入验收证据的时刻，不冒充用户消息的精确发送时间。
- Review、独立 Regression、PR 检查、普通 merge 和精确集成复验均通过。Accepted 与 integrated v2 `owned_paths` 摘要相同，原人工验收继续有效。

## 已交付范围

- 浏览器向私有 S3/MinIO 隔离前缀直传；服务端对文件真实格式、大小、像素、动画和权限重新校验。JPG/PNG/WebP/HEIC/HEIF 进入服务端处理，原图完成处理后清理。
- 处理链生成去源元数据的三种静态 WebP 变体，保存拍摄日期；持久 Worker、lease、重试与维护清理避免半成品失去追踪。
- 创建者私有草稿、元数据编辑、选中草稿原子发布、家庭动态、授权预览、上传管理中心及 30 天草稿/回收站期限已接通；家庭成员不能读取他人的私有草稿。
- 回收操作记录 Membership 与当时角色。当前 OWNER/ADMIN 可恢复有效回收；普通 MEMBER 只可恢复自己以 MEMBER 身份回收的照片。管理员回收或来源未知的旧记录，对 MEMBER 禁止恢复并提供中文页面反馈；`canRestore` 与服务端条件校验保持一致。
- 失败 CI 只上传安全状态摘要，不上传原始 trace、截图或完整报告；Presigned POST 使用固定对象 Key、短时签名和服务端幂等 `complete`，不宣称 S3 层严格一次性执行。

## 版本、Review 与集成证据

- Reviewed implementation candidate：`4d4360e0e1deca3ab9cdd1c88c21ee5cc3cee62d`；v2 digest `BEC7641DB2358A29349AA8046449EAFA0647B96C08847A48B33AB2AE6D5F3A2E`。65 条适用 Rule 全部 PASS，无 FAIL/UNVERIFIED。
- Accepted PR Head：`1847ea047c09e3088a66c1a56b5f55e4c474cefd`；v2 digest `B90FC3FAEC9DCC6CB8A6254A2301B34B1767F3A0EAB767770487DFB1A4C5C80A`。相对实现候选仅增加 Plan 与索引证据。
- PR #24 普通 merge commit：`fb059f073c6c64ffc4e787281a75227e52a1a84a`；v2 digest `B90FC3FAEC9DCC6CB8A6254A2301B34B1767F3A0EAB767770487DFB1A4C5C80A`。其第二父提交为 accepted PR Head，集成 tree 与该 Head 无文件差异。
- PR Head 的 `branch-flow-develop`（run `35204369442`）、`quality` 与 `e2e-auth`（run `35204369171`）均 PASS；精确 merge commit 的 Quality run `35205302697` 为 success。
- 集成提交上 `pnpm validate` exit 0，branch-flow 5、API 48、Web 34、lint、format、typecheck、build 与项目校验通过；Docker `pnpm e2e` 为 36 passed、27 designed skips、0 failed，覆盖 375、834、1440；5 个 migration 无 pending，完整栈 readiness HTTP 200。

## 偏差、风险与后续边界

- Windows 全局 `core.autocrlf=true` 导致首次本地 format 检查失败；规范化工作副本后逐个核对 Git blob 均与集成 HEAD 相同，Git 差异为零，复跑通过。没有修改用户验收的实现内容。
- HEIC/HEIF 的 LGPL WASM 依赖仅获准封闭测试；公开发布前仍需独立许可复核。真实短信供应商与正式法律文本也尚未交付，当前实现不代表具备公开运营条件。
- 图集、时间轴、照片详情、视频、评论、里程碑和成长数据不在本 Plan。未创建产品发布 Tag，也未执行 `develop → release → master → main` 晋升。

## 关联证据与冻结

- 现行 [Spec](../specs/SPEC-20260917-NHHC01TR-photo-recycle-authority/spec.md) 与 [Design](../designs/DES-20260917-8EVTR3RJ-photo-recycle-authority-ui/design.md)；原照片上传 [Spec](../specs/SPEC-20260916-5Z69DCQE-photo-upload-foundation/spec.md) 与 [Design](../designs/DES-20260916-4XCFYD80-photo-upload-ui/design.md) 保留替代链。
- [Plan](../plans/PLAN-20260917-ABAHN8QT/plan.md)、[Execution Log](../plans/PLAN-20260917-ABAHN8QT/execution-log.md)、[Review Report](../plans/PLAN-20260917-ABAHN8QT/review-report.md)、[Regression Report](../plans/PLAN-20260917-ABAHN8QT/regression-report.md)、[Acceptance Record](../plans/PLAN-20260917-ABAHN8QT/acceptance-record.md)。
- 归档时间：`2026-09-17T17:36:46+08:00`。Plan 包与本 Achievement 纳入 `docs/ARCHIVE.sha256` 后永久只读，后续变更必须新建 Plan。
