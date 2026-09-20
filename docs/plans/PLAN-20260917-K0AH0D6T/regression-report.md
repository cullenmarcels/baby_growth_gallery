---
id: PLAN-20260917-K0AH0D6T-REGRESSION
type: regression_report
title: "Plan E Regression"
status: passed
created_at: 2026-09-17T21:42:57+08:00
updated_at: 2026-09-18T09:51:39+08:00
plan_id: PLAN-20260917-K0AH0D6T
phase: candidate
reviewed_commit: 8b780574efddd11ec05d87781c57a4e7d4c3d242
reviewed_scope_digest: 6A11408184E316639CE5A495E7D0755EA705EEFBE6E8D002C75A2400F68DDB5D
ci_status: pending
related_ids: [PLAN-20260917-K0AH0D6T, SPEC-20260917-KSVSF8BN, DES-20260917-YQWSZG09]
supersedes: []
superseded_by: []
---

# Regression Report

## 候选结论

更新候选 8b780574efddd11ec05d87781c57a4e7d4c3d242 的**独立本地 Regression 为 passed**。重新 Review 后完整运行 `pnpm validate` 和照片 E2E；相对原候选，仅两份测试文件变化，认证、家庭、宝宝和视觉 E2E 在同一生产代码树上已独立执行，结果见下表。远端 CI 与集成提交的二次 Regression 仍为 pending，本报告不宣称 Plan 已归档。

## 影响范围与选择依据

| 依赖或既有能力 | 回归原因 | 检查 | 结果 |
| --- | --- | --- | --- |
| 认证与 Session | 新浏览页面复用会话和当前家庭上下文 | auth.spec.ts：注册、恢复、CSRF、验证码、登出、键盘错误 | 11 passed / 4 设计性 skipped |
| 家庭成员与角色 | 新 API 依赖 ACTIVE Membership 和 OWNER/ADMIN | family.spec.ts：邀请、角色、权限、活动和家庭切换 | 8 passed / 10 设计性 skipped |
| 宝宝档案与当前宝宝 | 头像外键及当前宝宝切换影响原列表 | baby.spec.ts：档案权限、宝宝切换、归档恢复 | 4 passed / 2 设计性 skipped |
| Plan D 照片流 | 回收方法改为事务，发布后进入新浏览入口 | photo.spec.ts：私有上传、草稿、发布、回收恢复、列表排序/隔离及三视口 UI | 4 passed / 2 设计性 skipped |
| 页面视觉与 API 连通 | 新路由和头像出现在应用壳内 | auth-visual、stack-connectivity、status-page | 9 passed / 9 设计性 skipped |

以上 63 个 E2E case 在未变的生产代码树上合计 36 passed、27 设计性 skipped、0 failed；新候选重新 Review 后又单独复跑照片文件 4 passed、2 设计性 skipped、0 failed。API 合同不依赖视口的用例只在 1440 项目执行；已有状态页截图用例按既定配置跳过，不把 skip 写为通过。

## 独立执行结果

- 新候选 Review 后重新运行 pnpm validate：照片依赖检查、ESLint、Prettier、API/client/Web 类型检查、branch-flow 5、API 54、Web 43、API/client/Web 构建及项目文档/规则/归档校验均通过，终值 PROJECT_VALIDATION=PASSED。
- Docker PostgreSQL、Redis、MinIO、存储网关、API 与 Web 健康；每组 E2E 前只重建 API 并换独立 Redis 前缀，保留真实验证码限流，避免多组测试共用一小时计数器。
- 迁移检查在实施与 Review 阶段分别覆盖既有 Plan D 库的前向升级和本次临时空库的完整 6 迁移链，prisma migrate status 返回 up to date；临时库已删除。
- 浏览器 375、834、1440 的图集正常、空、加载、错误、详情只读、头像选择与键盘 Enter 均在 photo.spec.ts 验证；同文件的真实 API 用例并发设置头像/回收后检查关联为空。Web 组件测试另覆盖旧详情、回收后的状态、清除头像和失效签名缩略图重取。CSS 明确提供 focus-visible 和移动底栏安全间距。

## 失败记录、未覆盖项与剩余风险

- Review 前一次整体 pnpm e2e 使用同一 Redis 限流前缀，验证码请求达真实上限并出现 429 级联；本次 Regression 使用分组隔离前缀，全部适用用例通过。未调低或关闭产品限流。
- Review 前一次 Docker Desktop 停机使照片 E2E 在 API/Web 端口拒绝阶段失败；服务恢复并通过健康检查后重复通过。
- 当前自动化使用 Windows Chromium 的三个视口，未做真实移动设备或其他浏览器人工视觉验收；该项留给人工验收。
- 已签发的私有存储 URL 会按原短有效期自然到期，回收操作无法提前取消该链接；这是已确认的存储边界。
- 远端 feature PR 尚未建立，因此远端 CI 状态 pending；人工验收后仍需单独授权集成到 develop，并对精确集成提交重新验证、记录 CI 与摘要一致性。若后续 CI 失败或摘要漂移，不能归档。
