---
id: PLAN-20260916-83SYH180-EXEC
type: execution_log
title: '照片上传基础执行记录'
status: in_progress
created_at: 2026-09-16T13:30:00+08:00
updated_at: 2026-09-16T15:42:44+08:00
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

| 时间                      | 原状态    | 新状态      | 原因                                     |
| ------------------------- | --------- | ----------- | ---------------------------------------- |
| 2026-09-16T13:30:00+08:00 | —         | confirmed   | 用户明确提交并要求实施 Plan D。          |
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

| 检查              | 结果 | 证据                                                                                                                                |
| ----------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm validate`   | PASS | exit 0；photo dependency、lint、format、typecheck、branch-flow、API 34、Web 27、build、Rules/Docs/索引/Plan 校验全部通过。          |
| `pnpm e2e`        | PASS | 独立 Redis 前缀和显式测试代理配置下为 36 passed、27 designed skips、0 failed；覆盖 375/834/1440，API/MinIO 语义只在 1440 执行一次。 |
| 上传 UI 定向复跑  | PASS | 修复批量字段状态后，375/834/1440 三个项目 3/3 通过。                                                                                |
| Migration         | PASS | 空临时数据库从零应用 4 个 migration；现有 Plan C 数据库前向升级到第四个 migration。任务临时数据库验证后删除。                       |
| OpenAPI 确定性    | PASS | 连续两次生成的 OpenAPI/client SHA-256 一致，无非确定性差异。                                                                        |
| Docker 与格式矩阵 | PASS | PostgreSQL、Redis、MinIO、storage proxy、API、Web 完整栈运行；API Alpine 镜像内五种格式全部真实处理成功。                           |
| S3 安全边界       | PASS | Bucket 匿名访问为 Access Denied；POST/GET/HEAD 的允许 Origin 预检通过，PUT 为 405，非允许 Origin 不获授权。                         |
| 对象残留          | PASS | E2E 后枚举测试前缀，`QUARANTINE_OBJECTS=0`，无隔离原图或半成品残留。                                                                |
| 当前运行状态      | PASS | API healthy，PostgreSQL/Redis/MinIO/storage proxy up，Web 在 `http://localhost:8080` 运行。                                         |

第一次聚合 E2E 使用既有 Redis 前缀时受到历史限流状态干扰；未降低产品阈值，而是为候选验证使用独立测试前缀并复跑通过。第一次上传 UI 定向运行暴露批量地点套用后选中卡片仍保留旧 local state，修复为按 `updatedAt` 重建编辑状态并复跑三视口通过。两次失败均保留为开发证据，不写作候选 PASS。

候选前没有修改 Plan A–C 的归档文件、历史 migration 或归档哈希；未提交签名 URL、Cookie、Session、验证码、邀请码、真实照片或个人信息。HEIC/HEIF LGPL 能力仍明确限制为封闭测试，公开发布许可审核未完成。

## Review 返回开发

- 首次固定实现提交 `6fa39976483642e110881e34e289f50e4d26af52` 的状态机审查发现：第三次处理 lease 后若进程崩溃，`processingAttempts=3` 的记录不会再被 Worker 领取，也尚未由维护任务转为 `FAILED`；这会造成永久 `PROCESSING`。
- 同一轮契约核对发现公共丢弃接口定义包含“未完成项”，实现却未允许创建者丢弃 `PROCESSING`。
- 修复为维护任务在 5 分钟 lease 过期后把耗尽三次的记录转为保留 30 天的安全失败，并继续使用对象优先清理；丢弃状态集合加入 `PROCESSING`。两项均增加 API 单元回归。首次提交不作为最终 reviewed candidate。
- 进一步核对回收站页面时发现已授权管理者的 `TRASHED` 缩略图预览被后续 `status !== PUBLISHED` 分支误拒绝。按权限允许作者或 OWNER/ADMIN 获取回收项的短期私有缩略图，非作者 MEMBER 仍拒绝；新增正负测试。
- CI 原始 Playwright trace/HTML 可能包含 Cookie、签名 POST 字段和合成手机号，与 Plan D 的“不得上传敏感值”约束冲突；因此失败时仅上传不含请求载荷的 `.last-run.json` 状态，详细错误留在 Actions 日志，不上传原始 trace/截图/HTML。此项属于安全优先的显式偏差；若以后需要远端可下载 trace，须另建可信脱敏与验证流程。
- Docker 全量回归的前两次尝试分别遗漏 `E2E_API_BASE_URL`、复用了已经积累限流的测试前缀；均不是产品失败，已改为两个显式测试地址和独立前缀。第三次 35 passed、27 designed skips、1 个 834 视口测试超时，定位为家庭创建后未等待路由完成就跳宝宝创建页的测试竞态；测试中增加 URL 完成断言，继续复验。

## 修复后复验

- `pnpm validate` exit 0：37 API、27 Web、5 分支流向测试均通过；lint、format、typecheck、build 和项目知识库校验通过。
- `pnpm api:generate` 连续两次 OpenAPI SHA-256 均为 `22DB3D0939590037C2160E62B2A8315130AE57B436DE43602AB8AE72AF86457C`；生成客户端没有工作树差异。
- 834 照片上传 UI 定向复跑 1/1 通过。
- 最终 Docker 全量 `pnpm e2e` 在两个显式测试地址与全新 Redis 前缀下 exit 0：36 passed、27 designed skips、0 failed，覆盖 375/834/1440。
- 真实 Docker API 使用修复版镜像；测试后重建为默认 `TRUST_PROXY=0`、`REDIS_KEY_PREFIX=bgg-compose`，6 个服务运行，readiness 为 `ok` 且 PostgreSQL/Redis/objectStorage 均 `up`。测试过程没有删除业务数据库或对象卷。

## 第二轮 Review 返回开发

- 补充签名 POST 条件、原子发布/失败不写动态、对象删除失败保留数据库的自动测试；新增后 API 41 项通过。
- 发现重签距 1 小时窗口结束不足 10 分钟时，固定 10 分钟凭证可能在占位记录清理后仍有效，造成迟到对象。签名有效期改为 `min(600 秒, 上传窗口剩余整秒)`，最后不足一秒明确返回 `PHOTO_UPLOAD_EXPIRED`；新增 45 秒签名边界测试。`2a7131e` 仍不是最终 reviewed candidate。
- 曾尝试给 Docker API 的 `pnpm deploy --legacy` 增加 `--offline` 以避免 registry 抖动，但真实 Alpine 重建返回 `ERR_PNPM_NO_OFFLINE_META`（固定 HEIC 依赖的元数据不在镜像 metadata mirror）；已撤销该尝试，保留已实测成功的在线部署层，不能将失败写成通过。
- 最终在线 Alpine 镜像重建 exit 0，镜像内 `PHOTO_CODECS=VALID (JPEG, PNG, WebP, HEIC, HEIF)`；最新 API 镜像在独立 Redis 前缀下再次执行 Docker 全量 `pnpm e2e`，36 passed、27 designed skips、0 failed。随后恢复默认 API 容器配置，全部依赖 readiness 为 up；`quarantine/` 对象枚举结果为 0。
- 新增签名 POST 10 分钟/短窗口约束、原子发布和对应 Activity、混合无效草稿不写入、对象删除故障保留数据库、授权回收站预览以及 3 次 lease 后安全失败回归。修复后 `pnpm validate` exit 0，API 42、Web 27、分支流向 5，构建与文档校验全部通过。
