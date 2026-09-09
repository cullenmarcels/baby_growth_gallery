---
id: PLAN-20260908-KP1B7472-EXEC
type: execution_log
title: "前后端工程基础执行记录"
status: open
created_at: 2026-09-08T17:41:41+08:00
updated_at: 2026-09-09T10:54:24+08:00
plan_id: PLAN-20260908-KP1B7472
related_ids: [PLAN-20260908-KP1B7472, DES-20260908-ZVZKM07B, SPEC-20260908-5BD26QCA]
supersedes: []
superseded_by: []
---

# 执行记录

## 已完成门禁

- 按项目入口读取 AGENTS、Rules Index、Development/Review/Regression/Acceptance 阶段菜单及相关 Ruleset。
- 使用 `winget` 安装 GitHub CLI 2.100.0；通过浏览器设备授权登录账号 `cullenmarcels`，未把 token 写入项目或普通输出。
- 远端读取确认 `main` 的精确基线为 `8814674ce2b2c7add4572430159e34aa2d92d399`，文件树只有原始 `README.md` 与 MIT `LICENSE`。
- 在当前目录建立 Git 元数据，跟踪 `origin/main` 并创建 `feature/project-foundation`；未创建无关根提交、未合并无关历史、未强推。
- 功能分支已建立远端 upstream。远端 preflight 结果为 `git_remote`、`fresh`、`dirty_nonoverlap`，无路径重叠和阻断项。
- 生成 Design `DES-20260908-ZVZKM07B`、Spec `SPEC-20260908-5BD26QCA`、Plan `PLAN-20260908-KP1B7472`。
- 递归复制 `D:\codex-handoff` 的 30 个文件，来源未变更；记录所有 SHA-256、截图尺寸及 2 倍导出关系。

## 已知执行事件

- Git 对 GitHub 443 曾出现一次瞬时超时；后续 `ls-remote`、fetch、push 和权限验证均成功，因此不再构成阻断。
- 第一次快照命令使用 `Copy-Item -LiteralPath` 配合通配符，PowerShell 将其视为字面路径并安全失败；目标目录当时为空。随后先验证源目录，再按枚举结果复制。
- 初始探查时 Docker 未安装，WSL 命令存在但功能/发行版尚未就绪；后续处理结果见“主机暂停点”。

## 工程实现与预重启验证（2026-09-08）

- 建立 pnpm 11.21.0 Workspace；Node.js 24.20.0、TypeScript 7.0.2 与计划内主要依赖均按精确版本锁定。
- TypeScript 7 暂不提供程序化 compiler API：按 TypeScript 官方兼容路径，让 ESLint 使用 `@typescript/typescript6` 6.0.2 API，同时应用的 `tsc` 保持 7.0.2；API 构建使用原生 `tsc`，不依赖尚未适配的 Nest CLI 编译器接口。
- `openapi-typescript` 7.13.0 同样依赖旧 compiler API，替换为项目内最小确定性生成器；来源仍只有 OpenAPI JSON。连续两次生成的 OpenAPI SHA-256 均为 `EE25AE627C0363AD5DFF7804B0C1CF97CD6B1430BDEF770E083E3FFA7E96BF71`。
- 实现 NestJS live/ready、Problem Details、追踪 ID、结构化日志、Helmet、CORS allowlist，以及 Prisma/Redis/S3 readiness 探测；API 自动测试 8/8 通过。
- 实现 React Router + TanStack Query 状态页和生成客户端调用；Vitest/MSW 覆盖加载、成功、错误 3/3 通过。
- Playwright 固定 Windows/Chromium 基线，375/834/1440 × 加载/成功/错误共 9/9 通过，且成功态断言无横向溢出；人工查看三档成功截图未发现布局截断或溢出。
- `pnpm install --frozen-lockfile`、lint、Prettier、typecheck、test、build 全部通过；Compose 静态配置通过；Design 外部原件与项目快照 30/30 哈希一致。
- MinIO 与 `mc` 使用日期 tag 加多架构 manifest digest 固定，分别为 `sha256:a1ea29fa...b015e` 与 `sha256:aead63c7...28e3`。

## 主机暂停点

- GitHub CLI 2.100.0 与 Docker Desktop 4.90.0 已安装；Docker CLI 29.7.2、Compose 5.5.1 可执行。
- Docker 首次启动日志确认失败原因仅为 `Virtual Machine Platform not enabled`。
- 通过用户确认的 UAC 管理员流程启用 `VirtualMachinePlatform` 与 `Microsoft-Windows-Subsystem-Linux`；两个 DISM 操作均返回成功码 `3010`，表示必须重启后生效。
- 重启前不能验证 Docker daemon、基础设施 healthy、依赖故障矩阵、两个生产镜像或完整 `stack:up`；这些项目保持 `unavailable_pending_restart`，不得写为通过。

## 重启恢复与容器验证（2026-09-09）

- 重跑远端 preflight：HEAD `bb42c1e240a4138f5644c99479a45278d0e2c6ca`，分支 `feature/project-foundation`，`origin/main` 新鲜，工作树初始 clean，无阻断或 Plan 路径重叠。
- WSL 2.7.13、Linux kernel 6.18.33.2、Docker Desktop 4.90.0、Engine 29.7.2、Compose 5.5.1 均可用；GitHub CLI 仍以 `cullenmarcels` 登录并具备目标仓库权限。
- 当前网络会主动重置 `auth.docker.io` TLS，并使 Quay layer 下载停滞。没有把第三方 registry 写死到项目：Compose/Dockerfile 默认仍为官方镜像，并增加可选 image/npm registry 覆盖。验证机通过透明镜像拉取，MinIO 与 `mc` 最终 digest 与 Plan 固定值完全一致。
- 将 PostgreSQL 18 数据卷改挂 `/var/lib/postgresql`，符合 18+ 官方镜像布局；宿主 `5432` 位于 Hyper-V 排除范围，因此本机验证使用可配置的 `15432`。Steam Web Helper 占用 `8080`，本机 Web 映射使用 `18080`；容器内部仍分别使用 `5432` 和 `8080`。
- 修正 Compose 5 对一次性 `minio-init` 与 `--wait` 的退出码冲突：先等待 PostgreSQL/Redis/MinIO healthy，再运行 bucket 初始化。`pnpm infra:up` 返回 0，开发 bucket 可重复创建且保持 private。
- 真实开发 API 暴露出 `tsx/esbuild` 不生成隐式 decorator metadata：为 Nest 类依赖加入显式 `@Inject`。同时用 `Promise.allSettled` 和安全 Redis close 保证探针只归一化为 up/down，未知服务端异常写结构化日志但不向客户端泄漏。
- CORS allowlist 允许配置来源和 credentials；非 allowlist Origin 返回 `403 application/problem+json`，不再误报为 500。
- 依赖故障矩阵通过：分别停止 PostgreSQL、Redis、MinIO 时，live 始终 200；ready 分别返回 503 并指出 `postgres`、`redis`、`objectStorage`，恢复后全部重新为 up。
- Dockerfile 支持可选基础镜像/npm registry，使用 BuildKit pnpm cache；修正 pnpm symlink 被后续 COPY 覆盖、pnpm 11 deploy 门槛、生产 package 文件白名单和宿主 tsbuildinfo 污染。API 以非 root 用户运行且不含源码/测试或可解析的 Jest、TypeScript、ESLint、tsx、Playwright；Web 最终层只有 Nginx 与静态产物，不含 Node/API 源码。
- `pnpm stack:down` 后 `pnpm stack:up` 完整返回 0；API、Web、PostgreSQL、Redis、MinIO 运行，API healthcheck healthy，MinIO 初始化退出 0；stack down 保留具名卷。

## 最终自动验证（2026-09-09）

- `pnpm install --frozen-lockfile` 通过；`pnpm validate` 通过，包含 lint、Prettier、typecheck、API 8/8、Web 3/3、三个 workspace build 与 `PROJECT_VALIDATION=PASSED`。
- OpenAPI 与客户端连续两次生成无漂移：`openapi.json` SHA-256 `EE25AE627C0363AD5DFF7804B0C1CF97CD6B1430BDEF770E083E3FFA7E96BF71`，`schema.d.ts` SHA-256 `ADE9551AA00480C50CD1C9B58DD494FCF0CFA13BEDBA4EB3E8C5938EB361D60F`。
- 普通开发 E2E：375/834/1440 × 加载/成功/错误共 9 passed，部署栈专用检查 3 skipped（未提供 `STACK_BASE_URL`，符合条件门禁）。
- 已部署栈 E2E：以 `STACK_BASE_URL=http://localhost:18080` 直接访问 Nginx，三档视口均真实调用独立 API readiness；连同三态基线共 12/12 passed。
- Nginx `/` 与 history fallback 返回 200，入口 HTML `Cache-Control: no-cache, no-store, must-revalidate`；API ready 返回三项 up 和追踪 ID，API 根路径不托管前端。
- 平台结论仅覆盖本机 Windows 11、Docker Desktop Linux containers 和 Playwright Chromium；未声称覆盖其他操作系统或浏览器。

## 后续记录

工程实现、依赖锁定、主机安装和自动/容器验证均已完成。下一步固定候选提交和 owned scope digest，完成 Review、Regression、远端新鲜度复检并创建 PR；合并与 Achievement 仍需用户后续验收授权。
