---
id: PLAN-20260915-PQ8NHNZ2-EXEC
type: execution_log
title: "多宝宝档案与当前宝宝会话执行记录"
status: open
created_at: 2026-09-15T10:21:58+08:00
updated_at: 2026-09-15T15:50:30+08:00
plan_id: PLAN-20260915-PQ8NHNZ2
related_ids: [PLAN-20260915-PQ8NHNZ2, SPEC-20260915-8RKJ7RGM, DES-20260915-S2PV4FM8]
supersedes: []
superseded_by: []
---

# 执行记录

## 修改前门禁

- 已读取 AGENTS、Docs/Rules Index、Planning/Development 菜单、现行全部适用 Rules、家庭 Spec/Design 和既有实现。
- 远端 preflight：git_remote、`develop@b3b12b0e588873853b71960c23ded0cc1a62dcc3`、origin verified、clean、无活动 Plan 路径重叠或阻断。
- 用户最新消息确认已讨论的实施方案，没有新的长期 Rule 候选；页面错误中文要求已由 `IMPL-007` 覆盖。
- 已创建 `feature/baby-profile-foundation` 并跟踪 `origin/develop`；正常流向仅为 feature → develop。

## 状态变化

| 时间 | 原状态 | 新状态 | 原因 |
| --- | --- | --- | --- |
| 2026-09-15T10:21:58+08:00 | — | confirmed | 用户明确确认 C–H 方案。 |
| 2026-09-15T10:21:58+08:00 | confirmed | in_progress | 远端、工作树、规则、范围和冲突门禁通过。 |
| 2026-09-15T15:50:30+08:00 | in_progress | in_review | 实现、migration、维护任务、Docker 与完整候选前门禁通过，准备固定已提交候选。 |

## 适用规则

- 固定 `RULESET-SOURCE-EVIDENCE v2`、`RULESET-REPOSITORY-SAFETY v2`、`RULESET-GIT-COLLABORATION v1`、`RULESET-BRANCH-GOVERNANCE v1`、`RULESET-IMPLEMENTATION-QUALITY v2`、`RULESET-TESTING-QUALITY v2`、`RULESET-RESPONSIVE-UI v1`、`RULESET-SECURITY-PRIVACY v1` 的 Plan 全量 Rule ID。

## 实施记录

- 已生成并固定新 Spec、Design 与 Plan ID；已确认不修改历史归档内容。
- 已新增 `BabyProfile` 前向 migration、Prisma 关系与 ACTIVE/ARCHIVED/PURGING 生命周期；昵称、生日和可选性别由 API Zod 边界校验。
- 已实现 Baby Policy、CRUD、activate、archive、restore 与每小时 advisory-lock 清理任务；Session 增加 `activeBabyId`，家庭切换、登录恢复和归档后执行家庭内确定性修正。
- 已更新 OpenAPI 与生成客户端；连续两次生成 SHA-256 均为 `927E5D905FBED44F1D18DACBEBCFF6A2D54271FB60F431029EFD7F5DFDC32A07`。
- 已实现宝宝创建、首页、查看/切换、编辑、归档确认、30 天恢复和 MEMBER 等待状态；桌面增加首页与宝宝切换器，移动顶部宝宝入口沿用 `<1024px` 应用壳。
- 已新增 API/Web/Playwright 的宝宝权限、Session 回退、生命周期、跨家庭隔离和 375/834/1440 业务流程测试。
- 完整 E2E 聚合运行会触达真实的验证码 IP 限流，因此把根级 `playwright.config.ts` 纳入 `owned_paths`，仅为每次运行设置隔离 Redis key 前缀并启用显式 `TRUST_PROXY=1`；家庭/宝宝测试使用文档保留网段的合成转发 IP，未降低产品限流阈值。扩大范围前确认没有其他活动 Plan，冲突仍为空。

## 当前验证证据

- `pnpm lint`：exit 0。
- `pnpm format:check`：exit 0。
- `pnpm typecheck`：exit 0。
- `pnpm test`：exit 0；branch-flow 5、API 27、Web 23 均通过（候选门禁仍将重新执行并计数）。
- `pnpm build`：exit 0；Vite 仅有既有的大 chunk 警告。
- `pnpm validate`：exit 0；`PROJECT_VALIDATION=PASSED`。
- `hooks/validate-project.ps1 -Check`：exit 0；`PROJECT_VALIDATION=PASSED`、`REPOSITORY_MODE=git_remote`。
- 完整本地 `pnpm e2e` 在最后两项 Session/日期边界修正前为 38 passed、19 designed skips、0 failed；修正后的宝宝专项为 4 passed、2 designed skips、0 failed，仍须在精确候选源码上重跑全量。
- `prisma validate`：exit 0。
- 既有 Plan B 数据库前向升级：Plan C migration 成功应用；空数据库成功从零应用全部 3 个 migration。
- 数据库级联实测：合成 Family 删除后关联 Baby/Membership 均为 0；维护任务实测取得 advisory lock，并只清理过期归档宝宝（`purged_count=1`），ACTIVE 宝宝保留。两个任务专用临时数据库均已删除。
- Docker Desktop 在用户确认后完成恢复；未删除 image、container、volume 或业务数据。四个无法原位复用的运行时目录以 `*-stale-plan-c-20260915*` 名称保留在 Docker LocalAppData，可恢复并待用户另行决定是否清理。
- 最新 Docker 镜像完成 frozen-lockfile 构建；宝宝专项与服务连通性为 7 passed、2 designed skips、0 failed，API readiness 为 200，PostgreSQL、Redis、objectStorage 均为 up。

## 候选前最终门禁

- `pnpm lint`：exit 0。
- `pnpm format:check`：exit 0。
- `pnpm typecheck`：exit 0；Prisma Client 正常生成，API/client/Web 类型检查通过。
- `pnpm test`：exit 0；branch-flow 5、API 27、Web 23，合计 55 项通过、0 failed。
- `pnpm build`：exit 0；API/client/Web 构建通过，仅保留 Vite 大 chunk 非阻断建议。
- `pnpm e2e`：exit 0；57 项矩阵为 38 passed、19 designed skips、0 failed，覆盖 375/834/1440。
- `pnpm validate`：exit 0；聚合 lint、format、typecheck、test、build 与项目校验通过。
- `hooks/validate-project.ps1 -Check`：exit 0；`PROJECT_VALIDATION=PASSED`、`REPOSITORY_MODE=git_remote`。
- OpenAPI/client 连续两次重新生成的 SHA-256 均为 `927E5D905FBED44F1D18DACBEBCFF6A2D54271FB60F431029EFD7F5DFDC32A07`，`git diff --check` 为 exit 0。
- 候选前执行 `git fetch --prune origin`；`origin/develop`、HEAD 与 merge-base 均为 `b3b12b0e588873853b71960c23ded0cc1a62dcc3`，ahead/behind 为 `0/0`，远端基线仍新鲜。
- `libphonenumber-js` 在 Node/Jest 下输出 JSON import attribute 弃用预警；这是既有固定依赖的未来兼容提示，当前 27 个 API 测试全部通过，列为非阻断观察项。

## 已遇到并保留的失败证据

- 首次 Docker/数据库核验：`docker compose ps` 无法连接 `dockerDesktopLinuxEngine`，`prisma migrate status` 返回 P1001，真实 migration 未在此时执行。
- 尝试启动 Docker Desktop 后后台仍崩溃；主机日志明确报告 `sailor-ingest.sock` 无法改名且文件正被占用。经用户确认后终止重复 Docker 后台、关闭 WSL，并把损坏的运行时目录移动到可恢复备份，单实例重启后 Engine 恢复。未 factory reset，未删除 Docker 数据。
- 一次宝宝专项本地运行误复用了端口 3000 上按 `http://localhost:8080` 配置的 Docker API，而浏览器来源是 `http://localhost:5173`，Origin/CSRF 按设计拒绝并失败；停止 Docker API/Web 后由 Playwright 启动同源本地服务，专项 4 passed、2 designed skips。该失败是调用环境混用证据，不作为产品 PASS。
