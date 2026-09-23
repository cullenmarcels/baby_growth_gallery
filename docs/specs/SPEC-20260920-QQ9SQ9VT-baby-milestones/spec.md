---
id: SPEC-20260920-QQ9SQ9VT
type: spec
title: "成长里程碑、清单提醒与时间轴整合规格"
status: active
created_at: 2026-09-20T15:37:48+08:00
updated_at: 2026-09-21T09:53:45+08:00
related_ids: [SPEC-20260915-8RKJ7RGM, SPEC-20260917-KSVSF8BN, DES-20260920-SAX3DM0H, PLAN-20260920-BR79695D]
supersedes: []
superseded_by: []
---

# 成长里程碑、清单提醒与时间轴整合规格

## 范围与权限

Plan F 为当前家庭、当前 ACTIVE 宝宝增加共享里程碑清单、完成进度、应用内日期提醒、照片关联和真实时间轴事件。所有 ACTIVE 成员可查看并创建清单项；作者可管理自己的里程碑，当前 OWNER/ADMIN 可管理家庭全部里程碑，其他 MEMBER 只读。每次请求重新校验 Membership、家庭、宝宝、资源状态和当前角色，不信任前端传入的权限信息。

本阶段不实现医学月龄、统一期限、逾期判断、系统推送、短信、邮件、评论、反应、视频、公开分享、成长数据或首页聚合。Redis 不保存里程碑事实。

## 模板、清单与提醒

- 服务端固定 12 个稳定模板 Key：第一次翻身、第一次独坐、第一次爬行、第一次站立、迈出第一步、第一次笑出声、第一次叫家人、第一次挥手、第一次抓握、第一次吃辅食、长出第一颗牙、第一次自己吃饭。
- 同一宝宝只能同时加入一个相同模板；删除后可重新加入。模板标题保存快照且不可编辑。自定义标题去除首尾空格后为 1–40 字符，同名自定义项允许并存。
- 只有已加入项目进入进度分母；状态为 COMPLETED 的项目进入分子。完成记录可编辑、撤销或删除；撤销后清除完成日期、说明和照片关联，保留标题和提醒日期。
- 提醒为可空日历日期。新建或修改时只能选择今天或未来；日期经过后仍保留在清单项，不显示逾期，也不自动清除。提醒概览只读取客户端日历日期 `fromOn` 当天及未来的未完成项目。
- 完成日期必须位于宝宝出生日期至当前日之间。完成说明可空，最多 1000 字符。

## 照片、生命周期与动态

- 一个完成里程碑可按选择顺序关联 0–10 张同家庭、同宝宝的 PUBLISHED 照片；ID 去重。草稿、处理中、失败、回收、跨宝宝和跨家庭照片统一不可关联。
- 照片回收时在同一事务删除里程碑照片关联；恢复不自动重建。照片永久删除和里程碑删除由外键级联兜底。
- 里程碑删除没有回收站；完成项目删除前由界面确认，模板随后可重新加入。
- 完成里程碑创建 `MILESTONE_RECORDED` 家庭动态，摘要只保存 `babyId`。撤销、删除和宝宝永久清理把相关动态最小化为通用墓碑。
- 宝宝归档期间普通接口不可见；恢复宝宝后数据重新可见。宝宝永久清理级联删除里程碑与关联数据。

## API 与并发

在 `/api/v1/families/:familyId/babies/:babyId` 下提供模板、分页清单、概览、详情、创建、编辑、完成、编辑完成信息、撤销和删除接口。列表默认 20、最大 50；未完成按 `(createdAt DESC,id DESC)`，已完成按 `(completedOn DESC,completedAt DESC,id DESC)`，提醒按 `(reminderOn ASC,createdAt ASC,id ASC)`。`GET /milestones/overview?fromOn=YYYY-MM-DD&limit=&cursor=` 返回真实 `completed/total` 进度和 `reminderOn >= fromOn` 的未完成提醒，提醒列表同样使用版本化 opaque `cursor` 分页，默认 20、最大 50；客户端以本地日历日期传入 `fromOn`。详情返回创建者、关联照片摘要、服务端计算的 `canManage` 和递增 `version`；所有写入携带 `expectedVersion` 并在事务中锁定 Membership 与目标行。

稳定错误码至少包括 `MILESTONE_NOT_FOUND`、`MILESTONE_PERMISSION_DENIED`、`MILESTONE_STATE_CONFLICT`、`MILESTONE_TEMPLATE_ALREADY_ADDED`、`MILESTONE_PHOTO_NOT_FOUND`、`MILESTONE_PHOTO_DUPLICATED`、`MILESTONE_PHOTO_LIMIT_EXCEEDED`、`MILESTONE_DATE_INVALID`、`CURSOR_INVALID`。不可见资源统一返回不泄露存在性的 404。

## 混合时间轴

现有时间轴响应扩展为 `PHOTO | MILESTONE` 判别联合。排序固定为 `(eventOn DESC,recordedAt DESC,kindRank DESC,id DESC)`：照片使用拍摄日/发布时间，里程碑使用完成日/完成记录时间；完全相同位置时 MILESTONE 在 PHOTO 前。版本 2 游标保存四个排序字段，同时兼容既有照片版本 1 游标。修改事件日期后客户端失效并重新读取第一页；撤销或删除后里程碑立即退出时间轴。

## 验收边界

必须覆盖 375、834、1440 的正常、空、加载、错误、只读、权限变化、冲突、分页和签名预览失效状态；所有操作按钮文案保持单行，同场景同级按钮等高，新增或改动超过五个中文字符的操作文案须先由用户确定。OpenAPI 是客户端类型唯一来源，Prisma migration 只前向新增。
