---
id: SPEC-20260923-SN5XW196
type: spec
title: 照片浏览信息与来源路由修订规格
status: superseded
created_at: 2026-09-23T14:59:18+08:00
updated_at: 2026-09-23T14:59:18+08:00
related_ids:
  [
    SPEC-20260917-KSVSF8BN,
    DES-20260917-YQWSZG09,
    SPEC-20260920-QQ9SQ9VT,
    DES-20260920-SAX3DM0H,
    PLAN-20260920-BR79695D,
  ]
supersedes: []
superseded_by: [SPEC-20260923-Y0XZXEM0]
---

# 照片浏览信息与来源路由修订

## 范围与兼容边界

本补充规格适用于已发布照片图集、照片时间轴以及里程碑详情中关联照片进入照片详情的行为。它补充而不替代 `SPEC-20260917-KSVSF8BN` 与 `SPEC-20260920-QQ9SQ9VT`。既有家庭/宝宝隔离、ACTIVE Membership 校验、已发布可见性、私有签名预览、分页与稳定排序、照片详情相邻项和照片/里程碑混合时间轴行为保持不变。不新增数据库表、字段或迁移，不改变照片可见性、管理权限或里程碑权限。

## 已发布照片上传者数据

- 新增公开 DTO `PhotoUploaderDto`，仅含 `displayName: string`。
- 新增 `PublishedPhotoSummaryDto`，继承现有 `PhotoSummaryDto` 并添加 `uploadedBy: PhotoUploaderDto`。
- `PublishedPhotoPageDto.items` 与 `TimelinePhotoEntryDto.photo` 使用 `PublishedPhotoSummaryDto`。草稿、上传批次、管理列表、详情相邻项及非公开管理契约保持 `PhotoSummaryDto`，不扩散上传者资料。
- 图集与时间轴查询读取照片创建者对应 Membership 的当前存储显示名；即使成员退出，也使用保留在该 Membership 上的显示名。不得返回账户 ID、Membership ID、手机号、角色或其他资料。

## 卡片呈现

- 共用照片卡片信息顺序为标题、拍摄日期、上传者。
- 上传者显示为“上传者：{名称}”，位于日期下方并右对齐，单行、不导致卡片横向溢出。
- 名称按 Unicode 字符计数：最多 15 字完整显示；超过 15 字显示前 15 字加单字符省略号 `…`。`title` 与可访问名称保留“上传者：完整名称”。

## 来源路由和返回行为

- 图集照片详情使用 `/app/photos/:photoId?from=gallery`；时间轴使用 `/app/photos/:photoId?from=timeline`；里程碑详情中关联照片使用 `/app/photos/:photoId?from=milestone&milestoneId=:milestoneId`。每个入口都明确标记来源。
- 详情只认可白名单 `gallery`、`timeline`、`milestone`。`gallery` 返回 `/app/gallery`，按钮“返回图集”；`timeline` 返回 `/app/timeline`，按钮“返回时间轴”；`milestone` 仅在 `milestoneId` 为有效 UUID 时返回 `/app/milestones/:milestoneId`，按钮“返回里程碑”。
- 缺失、未知、格式错误或来源与必要参数不匹配时安全回退到图集 `/app/gallery`，不读取浏览器历史，不从任意 URL 参数生成返回地址。
- 上一张/下一张继续沿服务端既有相邻顺序；在 `timeline` 来源下保留 `from=timeline`。在 `milestone` 来源下保留 `from=milestone&milestoneId=...`。图集来源维持明确的 `from=gallery`。
- 此返回仅保证目标界面正确，不保证恢复滚动位置或原始列表分页位置。

## 安全与验收

回归必须证明上传者输出无多余个人数据、跨家庭/宝宝及未发布照片仍不可见、管理接口契约不变、分页/混合时间轴排序不变。Web 验收覆盖 Unicode 截断、完整辅助名称、三种来源、直接深链、非法参数、上一张/下一张参数传播、错误/过期详情回退和三个响应式视口。
