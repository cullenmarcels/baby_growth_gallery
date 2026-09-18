---
id: SPEC-20260917-KSVSF8BN
type: spec
title: "已发布照片图集、时间轴、详情与宝宝头像规格"
status: active
created_at: 2026-09-17T21:42:57+08:00
updated_at: 2026-09-17T21:42:57+08:00
related_ids: [SPEC-20260915-8RKJ7RGM, SPEC-20260917-NHHC01TR, DES-20260917-YQWSZG09, PLAN-20260917-K0AH0D6T]
supersedes: []
superseded_by: []
---

# 已发布照片图集、时间轴、详情与宝宝头像规格

## 适用范围

本规格细化首个业务里程碑的 Plan E。照片上传、草稿隔离、处理、发布、回收与恢复沿用现行照片规格；本阶段只增加已发布内容的家庭浏览和宝宝头像。不实现里程碑记录、评论、反应、视频、公开分享或发布分支晋升。

## 列表与详情

- 所有入口使用当前 ACTIVE 家庭 Membership 与 ACTIVE 宝宝。图集和时间轴只读取同一家庭、同一宝宝的 `PUBLISHED` 照片；OWNER/ADMIN 也不能通过这些入口看到其他人的草稿或已回收照片。
- 排序固定为 `(capturedOn DESC, publishedAt DESC, id DESC)`。`capturedOn` 是日历日期，不作 UTC 换日；同日用发布时间和 ID 决定稳定次序。元数据编辑导致排序变化时重新读取第一页；游标使用版本化、严格验证的 opaque 值，默认 20、最大 50。
- `GET /api/v1/families/:familyId/babies/:babyId/photos/published` 返回 `items: PhotoSummary[]`、`nextCursor`。`GET /api/v1/families/:familyId/babies/:babyId/timeline` 使用相同排序和分页，每项为 `{ kind: 'PHOTO', eventOn: capturedOn, photo: PhotoSummary }`；Plan F 才扩展真实里程碑类型，不创建假事件。
- `GET /api/v1/families/:familyId/babies/:babyId/photos/:photoId` 返回 `{ photo, canManage, previousPhotoId, nextPhotoId }`。上一张是排序中的前一项，下一张是后一项；两端为 `null`。当前作者及 OWNER/ADMIN 的 `canManage=true`，其他 MEMBER 为 `false`。详情只显示已发布照片；不可见、跨家庭、跨宝宝和其他状态返回 `404 PHOTO_NOT_FOUND`。
- 详情元数据编辑与回收复用既有 API，服务端按当前权限、照片状态与并发条件重新校验；只读成员没有管理入口。旧页面遇到 403/404/409 时刷新内容和权限并给出中文说明，不自动跳转或重放变更。
- 图集与时间轴用私有 `THUMBNAIL`，详情用私有 `DISPLAY`。签名预览继续由已有接口签发，短时 URL 不写入数据库、公开列表契约、日志或长期缓存；签名到期重新获取。已有签名无法提前撤销，最多保持到其原有效期。

## 宝宝头像

- `BabyProfile.avatarPhotoId` 可空，关联同一个宝宝的 `PUBLISHED` 照片；前向迁移不回填。`BabySummary` 返回可空 `avatarPhotoId`，不返回对象 Key 或签名 URL。
- `PATCH /api/v1/families/:familyId/babies/:babyId/avatar` 接受 `{ photoId: UUID | null }`，`null` 表示清除。只有当前 ACTIVE OWNER/ADMIN 可调用；成员直接调用返回 `403 BABY_PERMISSION_DENIED`。跨家庭或不属于此宝宝的照片返回 `404 PHOTO_NOT_FOUND`，同宝宝但非已发布照片返回 `409 PHOTO_STATE_CONFLICT`。
- 设置时在事务内锁定目标照片并核验状态、familyId、babyId，再更新 ACTIVE 宝宝。回收照片时在同一事务清除所有对它的头像关联；永久删除时外键 `ON DELETE SET NULL` 兜底。恢复照片不自动重新设为头像。并发设置与回收不得留下指向非已发布照片的有效头像。
- 全部有效家庭成员可查看宝宝头像；客户端按 `avatarPhotoId` 请求私有缩略图并居中裁剪，无独立裁剪参数。关联为空或预览失效时显示昵称首字占位，不显示私有草稿、回收照片或旧照片。家庭/宝宝切换和回收后清理相关查询缓存。

## 验收与保护

- API 覆盖稳定排序、游标边界、空页、相邻项、拍摄日编辑、角色变化、跨家庭/宝宝、草稿/回收隔离、签名到期、头像权限与并发回收。
- 空库及已有 Plan D 数据执行前向迁移，旧照片不被更改；OpenAPI 与生成客户端保持确定性一致。
- Web 覆盖 375、834、1440 的正常、空、加载、错误、权限和旧状态，支持键盘、可见焦点、中文错误及移动底栏安全间距；测试仅用合成家庭与媒体。
