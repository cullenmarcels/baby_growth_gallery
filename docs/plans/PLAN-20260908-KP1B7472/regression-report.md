---
id: PLAN-20260908-KP1B7472-REGRESSION
type: regression_report
title: "前后端工程基础 Regression"
status: passed
created_at: 2026-09-08T17:41:41+08:00
updated_at: 2026-09-09T15:39:42+08:00
plan_id: PLAN-20260908-KP1B7472
repository_mode: git_remote
candidate_commit: 493e318ad6ed2809e08809c98b359ed9a1a9a346
integrated_commit: 39d25fa93a585dac9c998175a96838d3ab8d26f0
ci_status: not_configured
related_ids: [PLAN-20260908-KP1B7472]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论

`PASS`。候选回归与 `origin/main@39d25fa93a585dac9c998175a96838d3ab8d26f0` 的独立集成回归均已完成；没有遗留 FAIL 或 UNVERIFIED。最终 PR Head 与 merge commit 的 Git tree 相同，accepted/integrated owned scope digest 均为 `DAFFB741770B8D240573194FEB8A0D640D6CDF0D55544AE7BA9BDA24A46E22A0`。

CI 状态为 `not_configured`，与本阶段明确非目标一致；本报告只声明本地 Windows/Docker Desktop/Chromium 证据。

## 候选回归矩阵

| 范围 | 命令/探针 | 结果 | 关键证据 |
| --- | --- | --- | --- |
| 冻结依赖 | `pnpm install --frozen-lockfile` | PASS | 4 个 workspace project 已是最新，锁文件无改写。 |
| 聚合质量 | `pnpm validate` | PASS | ESLint、Prettier、TypeScript、API 8/8、Web 3/3、三个 workspace build、`PROJECT_VALIDATION=PASSED`。 |
| 开发 E2E | `pnpm e2e` | PASS | 375/834/1440 × 加载/成功/错误 9 passed；部署栈专用检查因无 `STACK_BASE_URL` 3 skipped。 |
| 契约生成 | 连续两次 `pnpm api:generate` | PASS | OpenAPI SHA-256 `EE25AE627C0363AD5DFF7804B0C1CF97CD6B1430BDEF770E083E3FFA7E96BF71`；客户端 SHA-256 `ADE9551AA00480C50CD1C9B58DD494FCF0CFA13BEDBA4EB3E8C5938EB361D60F`；两次一致。 |
| Compose 静态配置 | `docker compose config --quiet` | PASS | 官方默认镜像、健康检查、profiles、端口/registry 覆盖均可解析。 |
| 基础设施启动 | `pnpm infra:up` | PASS | PostgreSQL、Redis、MinIO healthy；`minio-init` 退出 0；bucket private。 |
| 完整栈 | `pnpm stack:up` | PASS | API/Web 独立镜像从候选源码重建；API healthcheck healthy，Web/Nginx 运行。 |
| 已部署栈 E2E | `STACK_BASE_URL=http://localhost:18080 pnpm e2e` | PASS | 12/12；三档视口真实从 Nginx 调用独立 API readiness。 |
| 依赖故障矩阵 | 逐一 stop/start `postgres`、`redis`、`minio` | PASS | 每次 live 200；ready 503 Problem Details 并准确标记 postgres/redis/objectStorage；恢复后 ready 200 且三项 up。 |
| CORS/安全头 | production curl with Origin | PASS | allowlist 来源 200、credentials true；非 allowlist 403 Problem Details；均有 traceId/Helmet headers。 |
| Nginx 缓存/路由 | `/`、history fallback、哈希 JS | PASS | HTML/fallback 200 且 no-store；哈希资源 `max-age=31536000`、`public, immutable`。 |
| 镜像边界 | 容器内 filesystem/module probes | PASS | API 用户为 `app`，无源码/测试且开发工具不可解析；Web 无 Node、API 源码或 `/app`。 |
| 停栈持久性 | `pnpm stack:down` + volume listing | PASS | 容器/网络停止；PostgreSQL、Redis、MinIO 三个具名卷全部保留。 |

## 视口与状态矩阵

| 视口 | 加载 | 成功 | 错误 | 真实栈联通 | 横向溢出 |
| --- | --- | --- | --- | --- | --- |
| 375 × 812 | PASS | PASS | PASS | PASS | 无 |
| 834 × 1112 | PASS | PASS | PASS | PASS | 无 |
| 1440 × 1000 | PASS | PASS | PASS | PASS | 无 |

## 平台与后续边界

- 已验证：Windows 11、WSL 2、Docker Desktop Linux containers、Node 24.20.0、pnpm 11.21.0、Playwright Chromium。
- 未配置而非失败：GitHub Actions CI；按 Plan 留给后续 CI 专项。

## 集成回归

| 范围 | 结果 | 集成证据 |
| --- | --- | --- |
| 远端与提交关系 | PASS | PR #1 为 `MERGED`；`c33eb668…` 位于 `origin/main@39d25fa…`，两者 tree 均为 `f6949f4…`。 |
| 作用范围摘要 | PASS | accepted/integrated digest 同为 `DAFFB741…`，用户确认继续有效。 |
| 聚合工程质量 | PASS | lint、Prettier、typecheck、API 8/8、Web 3/3、三个 build 与 `PROJECT_VALIDATION=PASSED`。 |
| 工作区行尾诊断 | PASS | 首次 Prettier 失败由 Windows `core.autocrlf=true` 的 CRLF 展开导致；规范化后 Git staged/worktree diff 均为零，完整重跑通过。 |
| 部署栈 E2E | PASS | 375/834/1440 × 三态及真实栈联通共 12/12。 |
| OpenAPI 稳定性 | PASS | 连续两次生成哈希一致且无 Git diff。 |
| 依赖故障矩阵 | PASS | PostgreSQL、Redis、MinIO 分别停服：live 200、ready 503 且依赖名称/traceId 正确；恢复后全部 up。 |
| 最终服务状态 | PASS | Web、API、PostgreSQL、Redis、MinIO 均运行；API/PostgreSQL/Redis/MinIO healthy。 |
| CI | NOT_APPLICABLE | GitHub Actions 为 `not_configured`，是本 Plan 明确非目标，不记录为 PASS。 |

集成复验仅声明本机 Windows 11、Docker Desktop Linux containers 和 Playwright Chromium；没有扩大到未实际运行的平台或浏览器。
