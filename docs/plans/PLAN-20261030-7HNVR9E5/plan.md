---
id: PLAN-20261030-7HNVR9E5
type: plan
title: '宝宝首页数据聚合'
status: confirmed
created_at: 2026-10-30T15:27:00+08:00
updated_at: 2026-10-30T15:27:00+08:00
related_ids:
  [
    SPEC-20261030-VJ05H0TV,
    DES-20261030-TSASQH7P,
    SPEC-20260915-8RKJ7RGM,
    SPEC-20260920-QQ9SQ9VT,
    SPEC-20261022-17HX5RTZ,
    PLAN-20261022-707KSVG3,
  ]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: '用户明确回复 PLEASE IMPLEMENT THIS PLAN，确认 Plan H 首页行为、接口边界、任务拆分和验收标准。'
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids:
      [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids:
      [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-BRANCH-GOVERNANCE
    version: 1
    rule_ids:
      [
        BRANCH-001,
        BRANCH-002,
        BRANCH-003,
        BRANCH-004,
        BRANCH-005,
        BRANCH-006,
        BRANCH-007,
        BRANCH-008,
        BRANCH-009,
        BRANCH-010,
      ]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 2
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006, IMPL-007]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids:
      [
        TEST-001,
        TEST-002,
        TEST-003,
        TEST-004,
        TEST-005,
        TEST-006,
        TEST-007,
        TEST-008,
        TEST-009,
        TEST-010,
      ]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 2
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006, RESP-007]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 2
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004, SAFE-005]
---

# Plan H：宝宝首页数据聚合

## 目标、确认与范围

用户明确确认实施本计划。将 `/app/home` 扩展为当前宝宝成长首页，复用现有照片发布列表、里程碑概览、成长概览接口，展示真实数据和独立区块状态；保持既有宝宝档案头部和导航。

当前 Plan G 已通过 PR #30 集成到 `origin/develop@2d28593497494d442609f5f931edff85fc40b1b3`，其接受与集成 v2 作用域摘要一致，并在本分支先行完成本地归档记录。本计划基线为该 `origin/develop` 提交；本地集成目标为 `origin/develop`。Plan G 已归档，活动 Plan 路径无重叠。

### 包含

- 首页四个摘要区块，依次为最新照片、里程碑进度、近期提醒、最新成长数据。
- 照片最多 3 张，按当前发布照片接口顺序；缩略图进入各自详情，另有完整图集入口。
- 里程碑进度复用概览总数。提醒为上海当前日到第 30 个日历日（含两端），只显示未完成、设置日期的最早 3 条，排除逾期和窗口外项目。
- 成长摘要分别显示身高/身长、体重、头围、BMI 的最新值和日期；只在 WHO 参考有效时显示百分位。
- 每区块独立加载、成功、空、失败和重试；按当前家庭/宝宝上下文隔离缓存。生日/性别变化使成长摘要重新读取；拒绝访问时清除受限内容并重校验上下文。
- 375、834、1440 三视口、键盘/焦点/辅助技术状态及移动底栏遮挡验证。

### 不包含

- 新增首页聚合 API、数据库迁移、OpenAPI/client schema 变化、家庭动态、首页图表、趋势变化率、通知推送、医疗判断或对其他页面的大范围重构。
- 修改移动底部导航项或宝宝切换流程。

## 事务上下文与作用域

- 仓库模式：`git_remote`；分支：`feature/homepage-data-aggregation`；起始基线：`origin/develop@2d28593497494d442609f5f931edff85fc40b1b3`。
- 远端 `origin/develop` 刷新成功；目标依分支规则为 `origin/develop`。Branch Flow、Quality、认证 E2E 在 Plan G PR #30 均成功。
- Plan G 先决收尾：根据用户已确认的合并/验收、PR #30 成功状态检查及匹配的集成摘要，本分支先完成 G 的归档证据。此依赖提交不属于 H 作用域，也未推送。
- 开始 H 实施时工作区 clean；当前分支相对 `origin/develop` 含两项 Plan G 归档文档提交。原工作区的既有改动不在本 worktree，不做覆盖或清理。
- 只读共享的 `docs/INDEX.md` 由索引生成器更新，不纳入 v2 owned-scope 摘要；本计划及其 Design/Spec 正文、产品代码和测试纳入摘要。mutable Plan State、Execution、Review、Regression、Acceptance 文件不纳入摘要。
- 无活动 Plan 路径重叠；Plan G 已归档。产品路径由本计划唯一拥有：
  - `apps/web/src/app/BabyApp.tsx`
  - `apps/web/src/app/BabyApp.test.tsx`
  - `apps/web/src/app/BabyHomeDashboard.tsx`
  - `apps/web/src/app/BabyHomeDashboard.module.css`
  - `apps/web/src/app/BabyHomeDashboard.test.tsx`
  - `apps/web/src/app/baby-home-utils.ts`
  - `tests/e2e/home.spec.ts`
  - `docs/specs/SPEC-20261030-VJ05H0TV-homepage-aggregation`
  - `docs/designs/DES-20261030-TSASQH7P-homepage-aggregation`
  - `docs/plans/PLAN-20261030-7HNVR9E5/plan.md`

## 接口与数据流

- 使用 `GET /families/:familyId/babies/:babyId/photos/published?limit=3`、`GET .../milestones/overview?fromOn=<Shanghai today>&limit=3`、`GET .../growth-records/overview` 现有 API；宝宝详情沿用既有读取。
- 三个摘要查询并行发起并复用 API client。照片和里程碑使用在现有资源前缀内的独立首页子键，避免与对应分页查询共用键导致缓存形状/页长冲突，同时沿用现有前缀失效；成长概览复用现有按宝宝生日/性别区分的 query key。里程碑概览按提醒日期升序；前端仅展示 `today <= reminderOn <= today + 30 calendar days` 的前三项。
- 依赖现有 API 的成员校验、宝宝归属和资源状态验证。前端错误消息使用项目中文映射；401 由现有会话路由处理，当前宝宝的 403/404 清除当前上下文摘要并重新校验，普通短暂故障只呈现在相应区块。
- 不修改公共接口、API DTO、OpenAPI 或生成类型。

## Task 与依赖

| Task                               | 责任域和完成条件                                                                                         | 依赖       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| **H-01 规格与事务建档**            | 固定本 Spec/Design/Plan、规则版本、基线、owned_paths 和无重叠证据；索引与知识库检查通过。                | 无         |
| **H-02 首页数据接入**              | 并行使用现有摘要 API 和缓存键；提醒日期筛选正确；上下文/性别/生日变化不串数据；无新公共契约。            | H-01       |
| **H-03 首页区块与导航**            | 实现四区块、照片详情和模块入口；空/加载/失败/重试各自独立；不显示虚构数据。                              | H-01, H-02 |
| **H-04 响应式与自动化验收**        | 完成三视口与键盘/焦点/底栏检查；组件测试覆盖边界；E2E 用合成家庭验证闭环和上下文隔离。                   | H-02, H-03 |
| **H-05 Review、Regression 与交付** | 候选提交绑定 v2 摘要；逐条覆盖适用 Rules；独立 Regression；人工验收；按明确授权推进 PR、集成复验和归档。 | H-04       |

## 验收标准

1. `/app/home` 保留宝宝头部和档案管理入口，并按约定顺序呈现真实照片、进度、提醒和成长摘要。
2. 照片最多 3 张且保持 API 排序，能分别进入正确详情及完整图集；空态无虚构内容。
3. 进度与里程碑 API 一致。提醒窗口含当天和第 30 天、排除昨天及第 31 天、按最近到期排序、最多 3 项且详情链接正确。
4. 成长摘要显示四个指标各自最新的原始值和日期；有效 WHO 百分位展示一位小数，不可用参考不暴露错误/推断百分位。
5. 每个区块单独加载/空/失败/重试，某区块故障不会隐藏其他成功数据；会话/宝宝权限变化不会继续显示受限数据。
6. 家庭/宝宝切换不串缓存，宝宝生日/性别更新后成长摘要刷新。
7. 在 375/834/1440 无横向溢出、底栏遮挡或键盘陷阱；交互有可见焦点和可访问名称。
8. `pnpm validate` 通过；首页组件测试通过；相关 E2E 在 3 视口通过；受影响的宝宝、照片、里程碑、成长回归通过。容器 E2E/readiness 记录实际运行状态。

## Review、Regression 与风险

- Review 绑定候选 SHA 和 v2 作用域摘要，逐条检查 Source Evidence、Repository Safety、Git Collaboration、Branch Governance、Implementation Quality、Testing Quality、Responsive UI、Security & Privacy 适用 Rule ID；无阻断问题才通过。
- 独立 Regression 覆盖首页全区块、空/加载/错误、提醒边界、缓存上下文、权限撤销和三视口，并回归宝宝档案、照片详情/图集、里程碑和成长摘要失效。
- 主要风险是首页并发读取三个 API 时的部分失败、提示日期本地化以及上下文撤权时 stale cache 暂留。用区块隔离、上海日期运算、上下文 query key 和权限失败清缓存控制。
- 自动化未配置、未运行或失败均如实记为 `UNVERIFIED` / `UNAVAILABLE` / `FAIL`，不可进入人工验收。人工验收只对固定候选和作用域有效；PR/推送/合并/归档分别遵循对应授权。
