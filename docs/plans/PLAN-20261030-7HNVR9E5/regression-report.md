---
id: PLAN-20261030-7HNVR9E5-REGRESSION
type: regression_report
title: 'Plan H 候选 Regression'
status: passed
created_at: 2026-10-30T16:58:00+08:00
updated_at: 2026-11-06T17:05:00+08:00
plan_id: PLAN-20261030-7HNVR9E5
repository_mode: git_remote
phase: candidate
reviewed_commit: e9294217fa1b1740b1c706fbc89398225471f99f
reviewed_scope_digest: BE8669467FF3B190686243C3F44EE6BC2A44B7C6992AA5754D4E43AA81D06F7E
ci_status: passed
related_ids: [PLAN-20261030-7HNVR9E5-REVIEW]
supersedes: []
superseded_by: []
---

# 候选 Regression

## 结果

候选 `e9294217fa1b1740b1c706fbc89398225471f99f` 的 v2 owned-scope 摘要 `BE8669467FF3B190686243C3F44EE6BC2A44B7C6992AA5754D4E43AA81D06F7E` 通过本地 `pnpm validate`。此前 PR #31 Head `35c81d2283d7fa429ed688f52a9501f239a5f86c` 的 Quality 失败，仅因组件测试固定提醒日已早于当前上海日期；修复候选固定测试时钟，首页组件 4/4、全量 Web 81/81、API 293/293 及构建均通过。修订候选随后进入 PR #31 Head `b233a9443dedac76c59c7e6b8e53ab32e310903c`；远端 Quality Run `42193831976`（含全量单测、OpenAPI、构建、Alpine 镜像与知识库校验）、`e2e-auth` 和 `branch-flow-develop` 均 SUCCESS。Plan 状态进入 `acceptance_pending`，旧候选接受无效，需用户对本候选重新验收。

## 命令与结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| `pnpm validate` | PASS | 照片依赖检查、全仓 ESLint、Prettier、类型检查、分支治理单测 5/5、API 293/293、Web 81/81、API/Web build、`PROJECT_VALIDATION=PASSED`。 |
| `pnpm --filter @baby-growth-gallery/web test -- BabyHomeDashboard.test.tsx` | PASS | 修复后 4/4：首页摘要展示/导航、区块错误隔离重试、撤权缓存清除、提醒窗口及排序；展示测试固定上海系统日期。 |
| `pnpm e2e tests/e2e/home.spec.ts` | PASS | 3/3，chromium 375/834/1440；双合成家庭/宝宝切换、数据隔离与窄屏溢出。运行时 `STACK_BASE_URL=http://localhost:8080`、`E2E_API_BASE_URL=http://localhost:3000`。 |
| `pnpm stack:up` | PASS | API readiness healthy、Web healthy；生产镜像构建成功。 |
| `pnpm exec prettier --check`（H 文件与事务文档） | PASS | owned paths 的格式检查通过。 |
| `pwsh -NoProfile -File hooks/update-indexes.ps1 -Check` | PASS | 生成索引与资料一致。 |
| `pwsh -NoProfile -File hooks/validate-project.ps1 -Check` | PASS | `PROJECT_VALIDATION=PASSED`；这是知识库/仓库检查，不替代应用测试。 |

## 覆盖与剩余项

- 提醒窗口覆盖当天与第 30 天（含）、排除过期/第 31 天、仅待办、有提醒日期、日期升序和最多三条。
- 首页各区块独立加载/空/失败/重试由组件级用例覆盖；新建的合成家庭有不同真实成长摘要，浏览器切换后旧宝宝数据消失。
- 既有 API、照片、宝宝、里程碑、成长能力由相关 API/Web 全量测试覆盖；没有新增持久化或公共契约。
- E2E 使用开发容器中的合成账号和家庭数据，已留在本地开发数据库；不含用户真实数据。此前该 E2E 对应的应用代码未变化；当前修订候选的远端 CI 尚待运行。
- PR #31 指向 `develop`；此前失败只属于旧 Head，当前 PR Head 所有检查均通过。旧候选人工验收现标记 invalidated，修订候选需重新人工验收。
