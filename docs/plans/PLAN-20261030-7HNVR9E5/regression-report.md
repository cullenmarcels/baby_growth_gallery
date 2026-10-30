---
id: PLAN-20261030-7HNVR9E5-REGRESSION
type: regression_report
title: 'Plan H 候选 Regression'
status: passed
created_at: 2026-10-30T16:58:00+08:00
updated_at: 2026-10-30T16:58:00+08:00
plan_id: PLAN-20261030-7HNVR9E5
repository_mode: git_remote
phase: candidate
reviewed_commit: 93238cbed35c545d9ef82a7531a5b9931a86d0f7
reviewed_scope_digest: 9DF55045C23C6705A0D36141B503AE7A8A594706365585B9CADB453788C0323C
ci_status: not_run
related_ids: [PLAN-20261030-7HNVR9E5-REVIEW]
supersedes: []
superseded_by: []
---

# 候选 Regression

## 结果

候选 `93238cbed35c545d9ef82a7531a5b9931a86d0f7` 的 v2 owned-scope 摘要 `9DF55045C23C6705A0D36141B503AE7A8A594706365585B9CADB453788C0323C` 通过本地候选回归；Plan 状态进入 `acceptance_pending`。候选未推送，远端 CI 未运行。功能分支包含此前两项 Plan G 归档证据提交；H 产品候选 SHA 是上述提交。

## 命令与结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| `pnpm validate` | PASS | 照片依赖检查、全仓 ESLint、Prettier、类型检查、分支治理单测 5/5、API 293/293、Web 81/81、API/Web build、`PROJECT_VALIDATION=PASSED`。 |
| `pnpm --filter @baby-growth-gallery/web test -- BabyHomeDashboard.test.tsx` | PASS | 4/4：首页摘要展示/导航、区块错误隔离重试、撤权缓存清除、提醒窗口及排序。 |
| `pnpm e2e tests/e2e/home.spec.ts` | PASS | 3/3，chromium 375/834/1440；双合成家庭/宝宝切换、数据隔离与窄屏溢出。运行时 `STACK_BASE_URL=http://localhost:8080`、`E2E_API_BASE_URL=http://localhost:3000`。 |
| `pnpm stack:up` | PASS | API readiness healthy、Web healthy；生产镜像构建成功。 |
| `pnpm exec prettier --check`（H 文件与事务文档） | PASS | owned paths 的格式检查通过。 |
| `pwsh -NoProfile -File hooks/update-indexes.ps1 -Check` | PASS | 生成索引与资料一致。 |
| `pwsh -NoProfile -File hooks/validate-project.ps1 -Check` | PASS | `PROJECT_VALIDATION=PASSED`；这是知识库/仓库检查，不替代应用测试。 |

## 覆盖与剩余项

- 提醒窗口覆盖当天与第 30 天（含）、排除过期/第 31 天、仅待办、有提醒日期、日期升序和最多三条。
- 首页各区块独立加载/空/失败/重试由组件级用例覆盖；新建的合成家庭有不同真实成长摘要，浏览器切换后旧宝宝数据消失。
- 既有 API、照片、宝宝、里程碑、成长能力由相关 API/Web 全量测试覆盖；没有新增持久化或公共契约。
- E2E 使用开发容器中的合成账号和家庭数据，已留在本地开发数据库；不含用户真实数据。远端 CI 和人工浏览器验收尚未运行。
- 启动的本地 stack 仍在运行：Web `http://localhost:8080`，API readiness `http://localhost:3000/api/v1/health/ready`，可用于人工验收。未推送、未创建 PR。
