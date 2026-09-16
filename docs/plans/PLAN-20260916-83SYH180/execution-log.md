---
id: PLAN-20260916-83SYH180-EXEC
type: execution_log
title: "照片上传基础执行记录"
status: in_progress
created_at: 2026-09-16T13:30:00+08:00
updated_at: 2026-09-16T15:15:04+08:00
plan_id: PLAN-20260916-83SYH180
related_ids: [PLAN-20260916-83SYH180, SPEC-20260916-5Z69DCQE, DES-20260916-4XCFYD80]
supersedes: []
superseded_by: []
---

# 执行记录

## 修改前门禁

- 读取 AGENTS、Docs/Rules Index、Development 菜单、Repository Safety、现行 Spec/Design 和相关实现。
- `repository-preflight.ps1 -Remote`：git_remote、`develop@fb6fa7a94528255aca77ab04b0009f1cd3064b29`、origin verified、clean、无活动 Plan overlap/blocking。
- 用户消息是已确认 Plan D；未发现需要另行入库的长期 Rule 候选。适用规则为 plan.md 固定的八个 Ruleset 共 64 条 active Rule。
- 创建 `feature/photo-upload-foundation`；正常流向仅为 feature → develop，历史归档路径不在 owned scope。

## 状态变化

| 时间 | 原状态 | 新状态 | 原因 |
| --- | --- | --- | --- |
| 2026-09-16T13:30:00+08:00 | — | confirmed | 用户明确提交并要求实施 Plan D。 |
| 2026-09-16T13:30:00+08:00 | confirmed | in_progress | 远端、工作树、规则、基线与冲突门禁通过。 |

## 已执行

- 固定六项新增运行时依赖；pnpm frozen lock 保留 Windows/Linux glibc/Linux musl sharp 可选二进制。
- 新增第四个前向 migration 与 Batch/Photo/Variant 模型；未改写前三个 migration。
- 实现双 S3 endpoint、私有 Presigned POST/GET、Redis 限流、Photo Policy/Service、DB Worker、图片安全处理与对象优先维护任务。
- Baby 清理增加“无关联 Photo 才删除”的门禁；发布事务写 `PHOTO_UPLOADED`，永久清理墓碑化。
- 新增完整 Photo OpenAPI、确定生成客户端、上传流程、管理中心、宝宝首页入口和中文错误映射。
- 固定 Bucket 私有访问，新增精确 Origin 的浏览器存储网关；浏览器只允许 `GET/HEAD/POST`，`PUT` 预检为 405，非允许 Origin 不返回跨域授权。
- 增加仓库自有的合成 PNG、HEIC、HEIF fixture，并记录生成工具、许可和 SHA-256；Alpine API 镜像内真实解码 JPEG/PNG/WebP/HEIC/HEIF 全部通过。
- 开发中发现并修复三个实现问题：通用 HEIF 被错误标记为 HEIC、OpenAPI 对 Presigned POST fields 的 additionalProperties 生成不完整、批量套用后编辑区仍显示旧本地状态。修复后分别增加服务端、生成器和三视口浏览器回归覆盖。

## 候选前验证

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| `pnpm validate` | PASS | exit 0；photo dependency、lint、format、typecheck、branch-flow、API 34、Web 27、build、Rules/Docs/索引/Plan 校验全部通过。 |
| `pnpm e2e` | PASS | 独立 Redis 前缀和显式测试代理配置下为 36 passed、27 designed skips、0 failed；覆盖 375/834/1440，API/MinIO 语义只在 1440 执行一次。 |
| 上传 UI 定向复跑 | PASS | 修复批量字段状态后，375/834/1440 三个项目 3/3 通过。 |
| Migration | PASS | 空临时数据库从零应用 4 个 migration；现有 Plan C 数据库前向升级到第四个 migration。任务临时数据库验证后删除。 |
| OpenAPI 确定性 | PASS | 连续两次生成的 OpenAPI/client SHA-256 一致，无非确定性差异。 |
| Docker 与格式矩阵 | PASS | PostgreSQL、Redis、MinIO、storage proxy、API、Web 完整栈运行；API Alpine 镜像内五种格式全部真实处理成功。 |
| S3 安全边界 | PASS | Bucket 匿名访问为 Access Denied；POST/GET/HEAD 的允许 Origin 预检通过，PUT 为 405，非允许 Origin 不获授权。 |
| 对象残留 | PASS | E2E 后枚举测试前缀，`QUARANTINE_OBJECTS=0`，无隔离原图或半成品残留。 |
| 当前运行状态 | PASS | API healthy，PostgreSQL/Redis/MinIO/storage proxy up，Web 在 `http://localhost:8080` 运行。 |

第一次聚合 E2E 使用既有 Redis 前缀时受到历史限流状态干扰；未降低产品阈值，而是为候选验证使用独立测试前缀并复跑通过。第一次上传 UI 定向运行暴露批量地点套用后选中卡片仍保留旧 local state，修复为按 `updatedAt` 重建编辑状态并复跑三视口通过。两次失败均保留为开发证据，不写作候选 PASS。

候选前没有修改 Plan A–C 的归档文件、历史 migration 或归档哈希；未提交签名 URL、Cookie、Session、验证码、邀请码、真实照片或个人信息。HEIC/HEIF LGPL 能力仍明确限制为封闭测试，公开发布许可审核未完成。
