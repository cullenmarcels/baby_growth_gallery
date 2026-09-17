---
id: PLAN-20260916-83SYH180-REVIEW
type: review_report
title: "照片上传基础 Review"
status: pending
created_at: 2026-09-16T13:30:00+08:00
updated_at: 2026-09-17T10:27:35+08:00
plan_id: PLAN-20260916-83SYH180
repository_mode: git_remote
reviewed_commit: 20bcfe9275022c6e71c8659bad74fc1ed5c2b55f
reviewed_scope_digest: 8503BA92A4334E5699C4E2D94A4D534389A0CDDA6788D54718B0E91D7FEE848D
ci_status: pending
related_ids: [PLAN-20260916-83SYH180, SPEC-20260916-5Z69DCQE, DES-20260916-4XCFYD80]
supersedes: []
superseded_by: []
---

# Review Report

当前实现候选为 `20bcfe9275022c6e71c8659bad74fc1ed5c2b55f`，v2 owned-scope digest 为 `8503BA92A4334E5699C4E2D94A4D534389A0CDDA6788D54718B0E91D7FEE848D`。上一轮 `5cce3eb` 仅保留为历史审查事实。Review 仍为 `pending`，不得进入 Regression。

## 已核对事实

- `origin/develop@fb6fa7a94528255aca77ab04b0009f1cd3064b29` 未漂移；工作分支从该基线创建，归档内容和历史 migration 未修改，变更路径处于 Plan D `owned_paths` 内。
- `pnpm validate` exit 0：依赖来源/许可、lint、format、typecheck、API 42、Web 27、branch-flow 5、build、项目知识库校验通过。
- 最新 Alpine API 镜像真实处理 JPEG、PNG、WebP、HEIC、HEIF；Windows 宿主 Docker 完整栈的 375/834/1440 Playwright 为 36 passed、27 designed skips、0 failed；PostgreSQL/Redis/对象存储 readiness 均 up；隔离区枚举为 0。
- 空库和 Plan C 数据库的前向 migration、OpenAPI 双次确定生成、Bucket 私有访问及精确 Origin/方法 CORS 已完成验证；仅使用合成文件与合成账号。
- 前期 Review 发现的第三次 lease 崩溃滞留、处理中丢弃、回收站授权预览、重签到期跨越 1 小时窗口、维护日志底层 stack 与 E2E 等待竞态均已修复并复查。
- 本轮 Review 又发现上传批次刷新后不可返回编辑、HEIC 安全缩略图未替换和站内导航缺少上传中确认。新候选已修复：Web 31、API 42、branch-flow 5、`pnpm validate` exit 0；完整 Docker E2E 在 375/834/1440 为 36 passed、27 designed skips、0 failed，其中桌面流程使用真实合成 HEIC。运行时所有依赖 ready，隔离区为空。
- `20bcfe9` 追加真实 S3 篡改与跨角色私有草稿测试，并修复 Worker 租约过期后旧尝试误删新尝试变体的竞态；对没有数据库 Variant 行的半成品 Key 也执行对象优先清理。新候选 `pnpm validate` exit 0：API 45、Web 31、branch-flow 5；新 Alpine API 镜像构建 exit 0，完整 Docker E2E 36 passed、27 designed skips、0 failed。PostgreSQL/Redis/对象存储 readiness 均 up，隔离区 0 个对象；应用已恢复常规本地配置。

## 尚待用户确认的验收口径

1. Plan D 同时要求 CI 失败上传 trace/截图且不上传 Cookie/签名字段。原始 Playwright trace 可包含网络载荷；候选实现只上传不含请求载荷的 `.last-run.json` 状态。是否接受这项安全优先的偏差，或要求实现可验证脱敏后再保留 trace？
2. [AWS 官方 FAQ](https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/faq.html) 明确预签名请求在有效期内可以多次使用，单次语义不是 S3 原生能力。候选固定随机对象 Key、Content-Type、大小和最多 10 分钟有效期，但不能保证签名只能执行一次。用户须确认“一张凭证只对应单一对象 Key”即可，或要求另加版本锁定/回收机制实现严格单次语义。

上述两项涉及已确认 Plan 的实质解释，`IMPL-003` 与最终安全/测试验收暂为 `UNVERIFIED`；正式 64 条 Rule 符合性矩阵将在口径确认并完成必要修订后形成，不把未决项写成 PASS。远端 PR CI 尚未触发，`ci_status=pending`。当前无人工验收或合并授权。
