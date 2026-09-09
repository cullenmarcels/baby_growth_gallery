---
id: ACH-20260908-KP1B7472
type: achievement
title: "可启动的前后端分离 Monorepo 工程基础：完成归档"
status: archived
created_at: 2026-09-09T15:39:42+08:00
updated_at: 2026-09-09T15:39:42+08:00
related_ids: [PLAN-20260908-KP1B7472, PLAN-20260908-KP1B7472-EXEC, PLAN-20260908-KP1B7472-REVIEW, PLAN-20260908-KP1B7472-REGRESSION, PLAN-20260908-KP1B7472-ACCEPTANCE, DES-20260908-ZVZKM07B, SPEC-20260908-5BD26QCA, RULESET-GIT-COLLABORATION, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY, RULESET-SECURITY-PRIVACY, RULESET-RESPONSIVE-UI]
supersedes: []
superseded_by: []
plan_id: PLAN-20260908-KP1B7472
confirmed_by: user
confirmed_at: 2026-09-09T15:39:42+08:00
archived_at: 2026-09-09T15:39:42+08:00
confirmation_record: "记录验收并 PR #1 ，合并动作我已经在github上操作完成。确认完成第一阶段的开发，请归档。"
repository_mode: git_remote
reviewed_commit: 493e318ad6ed2809e08809c98b359ed9a1a9a346
reviewed_scope_digest: 3F07C9C53DB5BDC5999FF445F462DD429072CF6E011A35E94C37D66E667F8EB4
accepted_commit: c33eb66844fd7525ddb751c42d9edc54bd7a5ca9
accepted_scope_digest: DAFFB741770B8D240573194FEB8A0D640D6CDF0D55544AE7BA9BDA24A46E22A0
integrated_commit: 39d25fa93a585dac9c998175a96838d3ab8d26f0
integrated_scope_digest: DAFFB741770B8D240573194FEB8A0D640D6CDF0D55544AE7BA9BDA24A46E22A0
ci_status: not_configured
platform_scope: windows11-docker-desktop-linux-containers-playwright-chromium
pr_url: https://github.com/cullenmarcels/baby_growth_gallery/pull/1
---

# `ACH-20260908-KP1B7472` — 前后端工程基础

## 归档摘要

- 对应 Plan：[`PLAN-20260908-KP1B7472`](../plans/PLAN-20260908-KP1B7472/plan.md)。
- 最终状态：`archived`。
- Pull Request：[#1](https://github.com/cullenmarcels/baby_growth_gallery/pull/1)，由用户在 GitHub 合并。
- Review：[`passed`](../plans/PLAN-20260908-KP1B7472/review-report.md)。
- 候选 Regression 与集成 Regression：[`passed`](../plans/PLAN-20260908-KP1B7472/regression-report.md)。
- 人工确认：用户于 `2026-09-09T15:39:42+08:00` 明确确认试玩正常、第一阶段完成并授权归档。
- Accepted 与 integrated scope digest 相同，合并没有改变已验收内容。

## 已确认 Plan 快照

### 目标

以远端 `main` 的真实历史为基线，把现有知识库、正式导入的设计资料和可启动的前后端工程骨架交付到功能分支，通过 PR 交给用户验收；Web 与 API 共享仓库和锁文件，但独立构建、镜像和部署。

### 范围

- React、TypeScript、Vite 前端工程与响应式三态状态页。
- NestJS、REST/OpenAPI、Problem Details 和依赖健康探针。
- PostgreSQL、Redis、MinIO 本地基础设施及独立 Web/API 镜像。
- 生成式 TypeScript API 客户端、质量脚本、Playwright 和项目治理验证。
- 将 `D:\codex-handoff` 的设计交付包原样导入正式 Design，并登记来源哈希与尺寸。

### 非目标

未实现真实账号、短信、微信、照片上传、家庭权限、成长数据、WHO 曲线、异步 worker 或 CI 工作流；未引入 Turborepo、Tailwind 或重型视觉组件库；未修改 MIT License。

## 实际交付

### Monorepo 与前端

- 根工作区固定 Node.js 24.20.0、pnpm 11.21.0、TypeScript 7.0.2，并提供 dev、infra、stack、generate、lint、typecheck、test、build、e2e、validate 命令。
- `apps/web` 使用 React 19、Vite 8、React Router、TanStack Query、CSS Modules 和 Design Tokens；API 地址只来自 `VITE_API_BASE_URL`。
- 工程状态页覆盖“正在连接服务”“前后端连接正常”“服务暂不可用”，并在 375、834、1440 三档视口无横向溢出。
- Web 生产镜像最终层只含 Nginx 与静态产物，支持 SPA fallback、HTML no-store 与哈希资源长期缓存。

### API 与数据设施

- `apps/api` 使用 NestJS 12 + Express Adapter，全局前缀 `/api/v1`，提供 live、ready、OpenAPI JSON 和 Swagger UI。
- 实现严格配置、结构化日志、请求 trace ID、Helmet、CORS allowlist/credentials 和统一 `application/problem+json`。
- readiness 分别探测 PostgreSQL、Redis、S3 兼容对象存储；live 不依赖外部服务。
- Compose 提供 PostgreSQL 18.6、Redis 8.4、固定 digest 的 MinIO、私有 bucket 初始化，以及可选 Web/API 完整栈。
- API 生产容器以非 root 用户运行且不包含源码、测试或开发工具；Web/API 可独立构建和部署。

### 契约与设计证据

- OpenAPI JSON 是 `packages/api-client` 的唯一契约来源；确定性生成的类型和 fetch 客户端已提交。
- `D:\codex-handoff` 的 30 个来源文件保持外部原件不变，项目内快照、26 张截图、SHA-256、物理尺寸和 2 倍导出关系已登记。
- 正式视觉基线为奶油暖阳风格、1440 桌面参考、375 移动参考与 CSS Variables；未定义业务行为没有被臆造成确认事实。

## 验收、集成与版本证据

- Review 候选：`493e318ad6ed2809e08809c98b359ed9a1a9a346`；reviewed digest：`3F07C9C53DB5BDC5999FF445F462DD429072CF6E011A35E94C37D66E667F8EB4`。
- 用户试玩的最终 PR Head：`c33eb66844fd7525ddb751c42d9edc54bd7a5ca9`；accepted digest：`DAFFB741770B8D240573194FEB8A0D640D6CDF0D55544AE7BA9BDA24A46E22A0`。
- GitHub merge commit：`39d25fa93a585dac9c998175a96838d3ab8d26f0`；integrated digest：`DAFFB741770B8D240573194FEB8A0D640D6CDF0D55544AE7BA9BDA24A46E22A0`。
- 最终 PR Head 是 merge commit 的祖先，二者 tree 均为 `f6949f473384bde0020c83028d0d48b2da9646a6`；验收摘要未失效。

## Review 与 Regression 结论

- Review 覆盖 Plan 固定的 53 条适用 Rule，高、中、低严重级别未解决发现均为 0。
- 集成 `pnpm validate` 通过：ESLint、Prettier、TypeScript、API Jest 8/8、Web Vitest 3/3、三个 workspace build、项目治理校验。
- 已部署栈 Playwright 在 375、834、1440 三档视口共 12/12 通过，覆盖加载、成功、错误和真实 Nginx → 独立 API 联通。
- OpenAPI/client 连续两次生成无漂移；OpenAPI SHA-256 为 `EE25AE627C0363AD5DFF7804B0C1CF97CD6B1430BDEF770E083E3FFA7E96BF71`，schema SHA-256 为 `ADE9551AA00480C50CD1C9B58DD494FCF0CFA13BEDBA4EB3E8C5938EB361D60F`。
- PostgreSQL、Redis、MinIO 逐项故障回归通过：live 200；ready 503、依赖名称与 traceId 正确；恢复后全部 up。

## 计划偏差与保留风险

- TypeScript 7 暂不提供所需程序化 compiler API；ESLint 按兼容路径使用 `@typescript/typescript6` API，应用 `tsc` 保持 7.0.2。OpenAPI 类型生成改用项目内最小确定性生成器，契约来源未改变。
- 验证环境直连 Docker Hub/Quay 不稳定，项目默认配置仍使用官方地址；本机验证通过可选 registry 覆盖完成，MinIO digest 未改变。
- Windows/Hyper-V 与 Steam 占用默认宿主端口，本机验证使用 PostgreSQL `15432`、Web `18080`；容器内部标准端口与生产边界未改变。
- Windows 全局 `core.autocrlf=true` 在切换分支后把部分源码展开为 CRLF，导致集成 Prettier 首次停止；规范化后的 Git staged/worktree diff 为零，完整验证重跑通过。仓库 canonical blob 均为 LF。
- API 生产镜像因 Prisma 7 / TypeScript 7 的 peer 闭包约 739 MB，功能与安全边界通过，但后续可独立优化体积。
- CI 为 `not_configured`，符合本阶段明确非目标；没有将其写成通过。
- 平台只验证 Windows 11、Docker Desktop Linux containers 和 Playwright Chromium，未声称覆盖 macOS、Linux 主机、Firefox 或 WebKit。

## 关联证据

- Design：[`DES-20260908-ZVZKM07B`](../designs/DES-20260908-ZVZKM07B-baby-growth-ui/design.md)。
- Spec：[`SPEC-20260908-5BD26QCA`](../specs/SPEC-20260908-5BD26QCA-project-foundation/spec.md)。
- Plan：[计划正文](../plans/PLAN-20260908-KP1B7472/plan.md)。
- Execution：[执行记录](../plans/PLAN-20260908-KP1B7472/execution-log.md)。
- Review：[Review Report](../plans/PLAN-20260908-KP1B7472/review-report.md)。
- Regression：[Regression Report](../plans/PLAN-20260908-KP1B7472/regression-report.md)。
- Acceptance：[Acceptance Record](../plans/PLAN-20260908-KP1B7472/acceptance-record.md)。

## 人工确认与不可变状态

- 确认主体：用户。
- 原始确认语义：“记录验收并 PR #1 ，合并动作我已经在github上操作完成。确认完成第一阶段的开发，请归档。”
- 确认时间：`2026-09-09T15:39:42+08:00`。
- 归档时间：`2026-09-09T15:39:42+08:00`。
- 最终状态：`archived`。

本 Achievement 及对应 Plan 包从归档提交进入 `origin/main` 起永久只读。后续业务开发、修复、CI 接入或平台扩展必须创建新的 Plan，不得改写本归档。
