---
id: SPEC-20260916-5Z69DCQE
type: spec
title: "照片隔离上传、安全处理、私有草稿与回收站规格"
status: superseded
created_at: 2026-09-16T13:30:00+08:00
updated_at: 2026-09-17T10:43:49+08:00
related_ids: [SPEC-20260915-8RKJ7RGM, DES-20260916-4XCFYD80, PLAN-20260916-83SYH180]
supersedes: []
superseded_by: [SPEC-20260917-NHHC01TR]
---

# 照片隔离上传、安全处理、私有草稿与回收站规格

## 范围与安全边界

本规格补充 `SPEC-20260915-8RKJ7RGM` 的照片阶段，在现有 Account、Family、Membership 与 BabyProfile 上建立真实上传闭环。浏览器只向私有 S3/MinIO 隔离区执行 10 分钟 SigV4 Presigned POST；Session、CSRF 与认证数据不发送给对象存储。对象 Key 只含随机 UUID，Bucket 禁止匿名访问。服务端不信任文件名、扩展名、浏览器 MIME 或尺寸声明，重新检查实际对象大小、魔数、解码像素和静态主图。

允许 JPEG、PNG、静态 WebP、HEIC、HEIF；拒绝 GIF、RAW、视频、动画 APNG/WebP、HEIF 序列、损坏或伪装内容。单张 `1–20 MiB`、单批 `1–20` 张、解码像素不超过 50MP、任一边不超过 16383。HEIC/HEIF 用固定 WASM 解码器转 RGBA，再与普通格式统一交给 sharp。公开生产发布 HEIC 前必须完成 LGPL 许可复核；当前只授权封闭测试。

## 数据与对象生命周期

- `PhotoUploadBatch` 固定家庭、宝宝、创建 Membership 和批次时间。
- `Photo` 状态为 `AWAITING_UPLOAD → QUEUED → PROCESSING → DRAFT → PUBLISHED ↔ TRASHED → PURGING`，失败为 `FAILED`；保存声明大小/MIME、安全识别结果、源哈希/宽高、业务元数据、lease、尝试次数和期限，不保存原始文件名。
- `PhotoVariant` 为 `THUMBNAIL | DISPLAY | ARCHIVE`，统一 `image/webp`，记录尺寸、大小和 SHA-256；对象路径分别为 640、2048 和原尺寸的随机照片目录。
- 草稿进入 DRAFT 起 30 天，编辑不延期；TRASHED 30 天，恢复后重新回收会重算；等待上传 1 小时到期。永久清理必须先 `PURGING`、删除隔离与变体对象，再删除数据库记录并墓碑化活动。Baby 永久清理必须等待其 Photo 全部清理。

所有输出自动应用方向、转 sRGB、保留透明通道并重新编码 WebP；不调用保留元数据能力，输出不得包含 EXIF/GPS/XMP/ICC/源缩略图。日期只按 `DateTimeOriginal → CreateDate → 客户端本地当天` 取日历日，不做 UTC 换日；只解析日期与方向，不请求或保存 GPS、设备型号、作者和序列号。

## 权限与事务

ACTIVE 家庭成员可给 ACTIVE 宝宝上传。未发布状态只对创建者可见，OWNER/ADMIN 不可接管；发布后家庭成员可读，作者及 OWNER/ADMIN 可管理，非作者 MEMBER 只读。跨家庭、跨宝宝或不可见私有项目返回 `404 PHOTO_NOT_FOUND`；已加入但操作权限不足返回 `403 PHOTO_PERMISSION_DENIED`。

发布请求选择 1–20 张同一批次 DRAFT，在 PostgreSQL 事务中全部发布或全部不变；每张同时写 `PHOTO_UPLOADED`，summary 仅 `{ babyId }`。回收不新增或墓碑 Activity；永久清理时清空 subject/summary 并公开为通用删除项。成员权限和宝宝状态在发布事务中重新校验。

处理 Worker 使用 PostgreSQL `FOR UPDATE SKIP LOCKED`、5 分钟 lease、最多 3 次尝试和 1/5/15 分钟退避；默认每进程并发 1，配置只允许 1–2。三种对象和数据库写入幂等。日志只记录计数、状态和稳定错误码。

## API 与限流

API 位于 `/api/v1/families/:familyId/babies/:babyId`，包含创建/读取上传批次、重签、complete、单张/批量编辑、原子发布、管理分页、5 分钟签名预览、回收、恢复和丢弃。管理分页按 `(updatedAt DESC,id DESC)`、默认 20 最大 50、严格版本化 opaque cursor。公共类型不得返回 Bucket、对象 Key、文件名、账号 ID 或签名存储字段。

签发按账号 10 批/15 分钟、账号 200 张/24 小时、IP 500 张/24 小时限流；Redis 故障 fail closed 为 `PHOTO_DEPENDENCY_UNAVAILABLE`。稳定错误码为 Plan D 列出的 `PHOTO_*` 与 `CURSOR_INVALID`；Web 必须 code→中文映射，未知错误使用中文兜底。

## 验收

测试覆盖格式/大小/像素边界、动画与伪装、HEIC、方向、透明、元数据反查、签名约束、限流、lease/重试、隔离清理、发布原子性、权限矩阵、30 天期限、对象优先清理、Activity 墓碑、OpenAPI、迁移、Docker Alpine 和 375/834/1440。全部 fixture 仅为仓库自有合成色块/图形。
