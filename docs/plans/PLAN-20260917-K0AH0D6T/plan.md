---
id: PLAN-20260917-K0AH0D6T
type: plan
title: "实现图集、时间轴、照片详情与宝宝头像"
status: confirmed
created_at: 2026-09-17T21:42:57+08:00
updated_at: 2026-09-17T21:42:57+08:00
related_ids: [SPEC-20260915-8RKJ7RGM, DES-20260915-S2PV4FM8, SPEC-20260917-KSVSF8BN, DES-20260917-YQWSZG09]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户明确要求 PLEASE IMPLEMENT THIS PLAN，并逐项确认时间轴先展示照片、头像居中裁剪、按拍摄日排序、详情按权限可管理、回收后退回默认头像。"
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids: [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-BRANCH-GOVERNANCE
    version: 1
    rule_ids: [BRANCH-001, BRANCH-002, BRANCH-003, BRANCH-004, BRANCH-005, BRANCH-006, BRANCH-007, BRANCH-008, BRANCH-009, BRANCH-010]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 2
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006, IMPL-007]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007, TEST-008, TEST-009, TEST-010]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 1
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 2
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004, SAFE-005]
---

# Plan E：图集、时间轴、照片详情与宝宝头像

## 目标与基线

Plan D 已在 `develop` 合并、复验和归档；其后 4 个归档证据提交经远端预检确认只有本地 ahead 4/behind 0，并于本 Plan 开始前快进同步。基线是 `origin/develop@c0e2108226886183e35f6a9d1ae6f4075d15acb5`，工作分支 `feature/photo-gallery-timeline` 从该提交建立，目标为 `origin/develop`。Git 模式、远端、工作树与活动 Plan 冲突见 `state.md`。

交付当前宝宝的已发布照片图集、照片时间轴、可按权限管理的照片详情，以及 OWNER/ADMIN 设置宝宝头像。冻结依据为 `SPEC-20260917-KSVSF8BN`、`DES-20260917-YQWSZG09`、现行里程碑 Spec/Design 与上述八组 Ruleset 精确版本。

## 范围与非目标

1. 增加已发布照片游标分页、PHOTO 时间轴和详情含邻项/管理权限的只读 API；按 `(capturedOn DESC,publishedAt DESC,id DESC)` 排序，全部请求重新核验 ACTIVE Membership 与宝宝，绝不返回私有草稿或回收内容。
2. 前向增加宝宝头像照片关联与设置/清除 API；只有当前 OWNER/ADMIN 可选择同宝宝已发布照片。回收在同一事务清除关联，删除有外键兜底；恢复不自动设回。
3. Web 接通图集、按年月分组的时间轴、详情编辑/回收与相邻导航、宝宝管理头像选择，复用短时私有预览；三视口和中文状态同期实现。
4. OpenAPI 是生成客户端唯一来源；API、迁移、Web、测试与文档保持一致。仅使用合成资料。

不提前实现 Plan F 的里程碑记录，不增加评论、反应、视频、公开分享、手动头像裁剪、产品 Tag 或 `develop` 之后的晋升。已归档 Plan D 文件、旧 migration 与历史规则快照保持不可变。

## 数据流、边界和错误

- 列表和详情只读 `PUBLISHED`；图集与时间轴使用 `THUMBNAIL`、详情使用 `DISPLAY`，通过现有授权签名接口按需刷新，不把 URL 持久化。时间轴现在仅返回 `kind=PHOTO`，为 Plan F 的真实里程碑留接口扩展位。
- 详情的上一张/下一张以相同排序计算，首尾为 null；作者及当前 OWNER/ADMIN 才显示编辑/回收，最终权限始终由服务端复核。照片变更、旧链接、签名失效、分页失败都用中文状态与重试/返回入口处理，不重放 mutation。
- `avatarPhotoId` 只存已发布照片 ID；设置与回收事务内使用同一照片锁顺序，避免竞态悬挂。清除或回收后显示昵称占位；已签发对象链接的 5 分钟自然有效期作为已知限制记录，不宣称即时吊销。
- 跨家庭/宝宝和非已发布详情返回 404；同宝宝已非发布头像候选返回 409；当前 MEMBER 设置头像返回 403。旧页面遇 403/404/409 重新拉取照片、宝宝与权限，不展示底层英文详情。

## 实施与验证步骤

1. 创建并登记专项 Spec/Design 与本 Plan 包，固定 `owned_paths` 和规则；修正索引中已有替代关系的静态误述，生成索引并校验。
2. 实施前向数据库迁移、照片列表/详情/时间轴和头像 API、OpenAPI/client；同步修改回收事务与维护删除边界。
3. 实施 Web 路由、图集/时间轴/详情、可访问头像选择与共享头像显示，接通查询失效、私有预览刷新和中文错误。
4. 用 API/数据库/Web/E2E 检查排序与游标、权限隔离、照片回收和头像竞态、旧数据迁移及 375/834/1440 的正常、空、加载、错误、权限状态。
5. 执行 `pnpm validate`、相关 Docker E2E、前向 migration 与运行栈检查。Review 绑定已提交候选及 v2 `owned_paths` digest、逐条规则证据；独立 Regression 复核 Plan A–D 相关路径与 CI。失败和 unavailable 如实记录，不提前标记通过。

候选通过后由用户对精确提交人工验收；向 `develop` 集成仍需相应明确授权。集成提交另算作用范围摘要并独立复验；摘要变更时重新验收。只有目标分支远端已验证、CI 和集成复验通过后才能归档。
