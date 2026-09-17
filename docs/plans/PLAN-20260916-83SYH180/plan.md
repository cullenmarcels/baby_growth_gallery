---
id: PLAN-20260916-83SYH180
type: plan
title: "建立照片隔离上传、安全处理、私有草稿与回收站基础"
status: confirmed
created_at: 2026-09-16T13:30:00+08:00
updated_at: 2026-09-16T13:30:00+08:00
related_ids: [SPEC-20260915-8RKJ7RGM, SPEC-20260916-5Z69DCQE, DES-20260915-S2PV4FM8, DES-20260916-4XCFYD80]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "用户于 2026-09-16 明确提交完整 Plan D 并指示 ‘PLEASE IMPLEMENT THIS PLAN’。"
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
    version: 1
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004]
---

# 建立照片隔离上传、安全处理、私有草稿与回收站基础

## 目标与基线

在 `origin/develop@fb6fa7a94528255aca77ab04b0009f1cd3064b29` 上，从 `feature/photo-upload-foundation` 向 `origin/develop` 交付浏览器私有直传、真实内容验证、HEIC/HEIF 解码、去元数据三变体、创建者私有草稿、原子家庭发布、管理中心和 30 天回收站。Plan C 及更早归档永久只读；不创建产品 Tag 或执行分支晋升。

## 实施步骤

1. 新建 Photo Spec/Design/Plan 和第三方许可记录，固定依赖、格式、安全、权限和响应式契约。
2. 前向新增 Batch/Photo/Variant migration；建立受保护关系、状态机、lease、期限和清理索引。
3. 分离内部/公开 S3 端点，配置私有 Bucket、精确 Origin CORS、Presigned POST/GET 与 Redis 限流。
4. 实现 magic-byte/大小/像素/动画校验、EXIF 日期/方向最小读取、HEIC WASM 解码、sharp 三种 WebP 和数据库持久 Worker。
5. 实现上传批次、编辑、发布、管理分页、预览、回收、恢复、丢弃 API，集中权限与稳定中文错误。
6. 实现上传流程页、管理中心和宝宝首页入口；覆盖中断、重签、处理中、草稿、失败、回收与三视口。
7. 更新 OpenAPI 客户端、Docker/CI、合成 fixture 与 API/Web/E2E 测试，执行迁移、对象残留、Alpine HEIC 和完整门禁。

## 验收、Review 与 Regression

验收以 `SPEC-20260916-5Z69DCQE` 和用户确认 Plan D 的全部边界为准。Review 必须绑定候选提交与 v2 owned-scope digest，逐条检查 64 条固定规则、对象/数据库一致性、隐私、许可、OpenAPI、三视口和中文错误，无 FAIL/UNVERIFIED 才进入独立 Regression。Regression 覆盖 Plan A–C、真实 Postgres/Redis/MinIO、空库与 Plan C 升级、Windows/Alpine、JPG/PNG/WebP/HEIC/HEIF、权限/并发/期限/清理及 CI。

用户必须针对固定候选明确验收，并另行授权对应 PR 合并。集成到 develop 后重算 digest 和独立复验；摘要不同则原验收失效。当前 Plan 不生成 Achievement，只有集成复验满足门禁后才归档。

## 非目标和风险

不实现图集/时间轴/详情、视频、Live Photo 视频、GIF/RAW、评论/反应、标签/里程碑关联、私密发布、云端导入、原图下载、去重、病毒扫描、套餐计费、家庭删除或产品发布。HEIC 的 LGPL 组件仅供封闭测试，公开生产发布前必须独立许可审核。对象存储、图像解码和高像素照片是主要风险，以私有隔离、并发 1–2、稳定错误、对象优先清理和真实容器测试约束。
