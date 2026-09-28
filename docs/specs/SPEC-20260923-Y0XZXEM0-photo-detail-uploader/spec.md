---
id: SPEC-20260923-Y0XZXEM0
type: spec
title: 照片浏览上传者与来源导航修订规格
status: active
created_at: 2026-09-23T17:44:54+08:00
updated_at: 2026-09-23T17:44:54+08:00
related_ids:
  [
    SPEC-20260917-KSVSF8BN,
    DES-20260917-YQWSZG09,
    SPEC-20260920-QQ9SQ9VT,
    DES-20260920-SAX3DM0H,
    PLAN-20260920-BR79695D,
    SPEC-20260923-SN5XW196,
    PLAN-20260923-NF3S35VD,
  ]
supersedes: [SPEC-20260923-SN5XW196]
superseded_by: []
---

# 照片浏览上传者与来源导航修订

## 范围与兼容边界

本补充规格统一定义已发布照片图集、时间轴及照片详情的上传者信息，以及从图集、时间轴和里程碑详情进入照片详情后的返回行为。它替代 `SPEC-20260923-SN5XW196`，并补充 `SPEC-20260917-KSVSF8BN` 和 `SPEC-20260920-QQ9SQ9VT`。家庭/宝宝隔离、ACTIVE Membership 校验、照片可见性、私有预览、稳定分页与排序、相邻照片顺序以及照片/里程碑混合时间轴行为保持不变。无需数据库变更，不改变照片或里程碑管理权限。

## 上传者数据契约

- `PhotoUploaderDto` 仅包含 `displayName: string`；`PublishedPhotoSummaryDto` 在原照片摘要上增加 `uploadedBy`。
- 图集列表、时间轴照片项和已发布照片详情中的 `photo` 使用 `PublishedPhotoSummaryDto`。草稿、上传批次、管理列表及非发布契约继续使用原 DTO。
- 查询联接照片创建者 Membership，读取其当前存储显示名；成员退出后仍沿用该 Membership 保留的名称。
- 响应不得额外披露账户 ID、Membership ID、手机号、角色或其他个人资料。

## 页面呈现

- 图集与时间轴卡片顺序为标题、拍摄日期、上传者。上传者文案为“上传者：{名称}”，位于日期下方右对齐，单行显示；名称按 Unicode code point 计数，超过 15 个时显示前 15 个字符加 `…`。完整名称保留在 title 和可访问名称中。
- 照片详情在查看和编辑状态均显示完整的“上传者：{名称}”，该信息只读，不加入编辑表单。
- 里程碑详情内关联照片不新增上传者子信息；其照片卡片仍遵循既有设计。

## 来源路由

- 图集：`/app/photos/:photoId?from=gallery`，返回图集 `/app/gallery`。
- 时间轴：`/app/photos/:photoId?from=timeline`，返回时间轴 `/app/timeline`。
- 里程碑：`/app/photos/:photoId?from=milestone&milestoneId=:milestoneId`，只有 `milestoneId` 为 UUID 时返回 `/app/milestones/:milestoneId`。
- 只接受唯一的白名单 `from` 值及匹配来源的参数。缺失、重复、未知或不匹配时安全返回图集。目标由前端固定构造，不依赖浏览器历史或任意 URL。
- 上一张/下一张继续遵循服务端既有顺序并传播已验证来源；不保证恢复滚动、筛选或分页。

## 安全与验收

API 测试覆盖三种照片查询的显示名披露范围及隔离/发布状态边界；Web 和 E2E 验证卡片截断、详情完整显示、详情来源返回、相邻来源传播、错误状态返回与响应式可访问性。详情新增上传者字段不得改变管理权限或预览签名逻辑。
