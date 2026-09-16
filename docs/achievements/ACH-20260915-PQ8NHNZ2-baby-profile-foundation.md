---
id: ACH-20260915-PQ8NHNZ2
type: achievement
title: "多宝宝档案与当前宝宝会话基础：完成归档"
status: archived
created_at: 2026-09-16T10:01:53+08:00
updated_at: 2026-09-16T10:01:53+08:00
related_ids: [PLAN-20260915-PQ8NHNZ2, PLAN-20260915-PQ8NHNZ2-EXEC, PLAN-20260915-PQ8NHNZ2-REVIEW, PLAN-20260915-PQ8NHNZ2-REGRESSION, PLAN-20260915-PQ8NHNZ2-ACCEPTANCE, SPEC-20260915-8RKJ7RGM, DES-20260915-S2PV4FM8, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-GIT-COLLABORATION, RULESET-BRANCH-GOVERNANCE, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-RESPONSIVE-UI, RULESET-SECURITY-PRIVACY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260915-PQ8NHNZ2
confirmed_by: user
confirmed_at: 2026-09-16T09:50:05+08:00
archived_at: 2026-09-16T10:01:53+08:00
confirmation_record: "确认验收候选 e059389，并授权合并 PR #23 到 develop"
repository_mode: git_remote
reviewed_commit: 5fdb3cfd89c4569f509e15788bc398a991836901
reviewed_scope_digest: DCDF8DD68C6FC840A4A1B00CF64CCFF63B5FA2D1001E310A2A51B832C7C6024E
accepted_commit: e0593895b2da73b051fc6f855149c41f97de5bf4
accepted_scope_digest: 2D1050ED642D55E8BB1A3B66866D845975A7718247008217E8F37D4A152CF929
integrated_commit: 29b98f872ae535f6fd3c68472358dc3cb63cf09c
integrated_scope_digest: 2D1050ED642D55E8BB1A3B66866D845975A7718247008217E8F37D4A152CF929
scope_digest_version: 2
ci_status: configured_scope_passed
platform_scope: windows11-docker-github-actions
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/23
---

# `ACH-20260915-PQ8NHNZ2` — 多宝宝档案与当前宝宝会话基础

## 归档摘要

- Plan [`PLAN-20260915-PQ8NHNZ2`](../plans/PLAN-20260915-PQ8NHNZ2/plan.md) 已完成 Review、独立候选 Regression、用户人工验收、PR #23 合并和精确集成提交复验。
- 用户于记录时点 `2026-09-16T09:50:05+08:00` 明确验收最终候选并授权合并到 develop。
- Accepted 与 integrated v2 scope digest 完全相同，普通 merge 未改变用户验收范围。
- 工程基础、认证会话、家庭身份以及多宝宝档案四个基础阶段至此均已有可追踪归档证据。

## 已交付功能

### 宝宝数据、权限与生命周期

- PostgreSQL 新增 `BabyProfile` 前向 migration、性别与生命周期状态、家庭级联、创建者约束、归档一致性检查以及列表和清理索引。
- OWNER/ADMIN 可创建、编辑、归档和恢复宝宝；MEMBER 可查看与切换，但不能管理；所有查询同时校验 ACTIVE Family Membership 与 `familyId`，跨家庭统一隐藏存在性。
- 一个家庭支持多个宝宝。Session 保存 `activeBabyId`，登录恢复、家庭切换、宝宝切换和当前宝宝归档后均重新校验，并按 `(createdAt DESC, id DESC)` 确定性回退。
- 归档后保留 30 天恢复窗口；维护任务使用 PostgreSQL advisory lock、批量锁定、`PURGING` 中间态与条件删除，避免多实例重复清理。

### API、Web 与响应式体验

- 新增宝宝 create/list/get/update/activate/archive/restore API，Zod、Swagger、OpenAPI 与生成客户端保持一致且确定性生成。
- 实现无宝宝引导、MEMBER 等待状态、创建后自动进入首页、查看与切换、编辑、归档二次确认和恢复流程。
- 桌面 Navbar 增加首页与宝宝切换器；375、834 使用紧凑顶部栏和底部导航，1440 使用桌面应用壳。
- 加载、空数据、字段错误、权限不足、网络错误、并发冲突、归档与恢复状态均有中文页面反馈，不直接渲染底层英文异常。

### 安全与测试隔离

- 测试和视觉证据只使用合成账号、家庭与宝宝资料；未记录 Cookie、Session、验证码、邀请口令、密钥或真实儿童信息。
- 完整 E2E 使用独立 Redis key 前缀和显式测试代理 IP 语义，不降低验证码限流阈值，也不改变生产默认安全配置。
- Docker 部署复验只清除逐键确认的 `bgg-compose:rl:*` 自动化限流键，没有触碰 Session、Challenge、账号、家庭、宝宝或 volume。

## Review、Regression 与版本绑定

- Reviewed implementation candidate：`5fdb3cfd89c4569f509e15788bc398a991836901`；v2 digest：`DCDF8DD68C6FC840A4A1B00CF64CCFF63B5FA2D1001E310A2A51B832C7C6024E`。
- 用户验收的最终 PR Head：`e0593895b2da73b051fc6f855149c41f97de5bf4`；v2 digest：`2D1050ED642D55E8BB1A3B66866D845975A7718247008217E8F37D4A152CF929`。
- GitHub merge commit：`29b98f872ae535f6fd3c68472358dc3cb63cf09c`；v2 digest：`2D1050ED642D55E8BB1A3B66866D845975A7718247008217E8F37D4A152CF929`。
- 集成 `pnpm validate` 通过：branch-flow 5、API 27、Web 23、lint、format、typecheck、build 和项目校验全部成功。
- 本地完整 E2E 为 38 passed、19 designed skips、0 failed；Docker 部署矩阵为 32 passed、25 designed skips、0 failed，两者均覆盖完整 57 项设计矩阵。
- 3 个 migration 已应用；OpenAPI/client 连续两次 SHA-256 相同；readiness 200/ok，PostgreSQL、Redis、objectStorage 均 up。
- `develop@29b98f8…` 的 GitHub Actions Quality run `35045625733` 为 success。

## 已处理偏差与保留边界

- 集成首次聚合门禁因 Windows 全局 `core.autocrlf=true` 的检出换行状态报告格式失败；格式化后的 Git 对象与 HEAD 相同，没有内容 diff，刷新索引后复跑全部通过。
- Docker 默认 `TRUST_PROXY=0` 时并行 spec 共享容器网关 IP，会真实触发 20/hour 验证码限流；部署矩阵按 spec 隔离并只清理测试限流键，未放宽安全策略。
- Docker Desktop 恢复时保留的四个 `*-stale-plan-c-20260915*` runtime 备份目录仍未删除；它们不属于仓库、镜像、容器、volume 或业务数据。
- Node/Jest 的 JSON import 未来弃用提示与 Vite 约 502 kB chunk 建议仍是非阻断观察项。
- 真实短信、正式法律文本、宝宝头像/照片、时间轴内容、里程碑、成长数据、家庭删除、所有权转移和非 Chromium 浏览器不在本阶段范围。

## 关联证据

- Spec：[`SPEC-20260915-8RKJ7RGM`](../specs/SPEC-20260915-8RKJ7RGM-baby-growth-mvp/spec.md)。
- Design：[`DES-20260915-S2PV4FM8`](../designs/DES-20260915-S2PV4FM8-baby-growth-mvp-ui/design.md)。
- Plan：[计划正文](../plans/PLAN-20260915-PQ8NHNZ2/plan.md)。
- Execution：[执行记录](../plans/PLAN-20260915-PQ8NHNZ2/execution-log.md)。
- Review：[Review Report](../plans/PLAN-20260915-PQ8NHNZ2/review-report.md)。
- Regression：[Regression Report](../plans/PLAN-20260915-PQ8NHNZ2/regression-report.md)。
- Acceptance：[Acceptance Record](../plans/PLAN-20260915-PQ8NHNZ2/acceptance-record.md)。

## 人工确认与不可变状态

- 确认主体：用户。
- 原始确认语义：“确认验收候选 e059389，并授权合并 PR #23 到 develop”。
- 归档时间：`2026-09-16T10:01:53+08:00`。
- 最终状态：`archived`。

本 Achievement 及对应 Plan 包从归档提交进入 `origin/develop` 起永久只读。后续修复或新业务必须创建新 Plan，不得改写本归档。
