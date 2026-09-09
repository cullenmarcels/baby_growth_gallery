---
id: PLAN-20260908-KP1B7472-REGRESSION
type: regression_report
title: "前后端工程基础 Regression"
status: passed
created_at: 2026-09-08T17:41:41+08:00
updated_at: 2026-09-09T11:04:03+08:00
plan_id: PLAN-20260908-KP1B7472
repository_mode: git_remote
candidate_commit: 493e318ad6ed2809e08809c98b359ed9a1a9a346
integrated_commit: null
ci_status: not_configured
related_ids: [PLAN-20260908-KP1B7472]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论

`PASS`。在 Review 报告提交后，针对 reviewed candidate `493e318ad6ed2809e08809c98b359ed9a1a9a346` 独立重跑本地、浏览器与容器回归；没有 FAIL 或 UNVERIFIED。`integrated_commit` 保持 null，因为功能分支尚未由用户验收和合并。

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
- 未执行：`origin/main` 集成回归。只有用户验收并授权合并后，才能记录 accepted/integrated commit、重算 integrated scope digest、创建 Achievement。
