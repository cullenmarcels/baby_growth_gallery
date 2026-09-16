---
id: PLAN-20260915-PQ8NHNZ2-REGRESSION
type: regression_report
title: "多宝宝档案基础 Regression"
status: passed
created_at: 2026-09-15T10:21:58+08:00
updated_at: 2026-09-16T10:01:53+08:00
plan_id: PLAN-20260915-PQ8NHNZ2
phase: candidate_and_integration
reviewed_commit: 5fdb3cfd89c4569f509e15788bc398a991836901
reviewed_scope_digest: DCDF8DD68C6FC840A4A1B00CF64CCFF63B5FA2D1001E310A2A51B832C7C6024E
accepted_commit: e0593895b2da73b051fc6f855149c41f97de5bf4
accepted_scope_digest: 2D1050ED642D55E8BB1A3B66866D845975A7718247008217E8F37D4A152CF929
integrated_commit: 29b98f872ae535f6fd3c68472358dc3cb63cf09c
integrated_scope_digest: 2D1050ED642D55E8BB1A3B66866D845975A7718247008217E8F37D4A152CF929
ci_status: passed
related_ids: [PLAN-20260915-PQ8NHNZ2, SPEC-20260915-8RKJ7RGM, DES-20260915-S2PV4FM8, ACH-20260911-JBANR2J8]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论与影响范围

候选与集成 Regression 均为 `passed`。候选轮在正式 Review 之后独立执行；用户验收后又在精确集成提交重新执行门禁、迁移、OpenAPI、本地与容器 E2E、readiness 和远端 CI，不复用候选结论。影响链为：Prisma migration/约束 → Baby Policy/Service/维护任务 → Redis Session 当前家庭与当前宝宝修正 → OpenAPI/generated client → React Query family-scoped cache → 响应式宝宝页面；同时覆盖 Plan A 认证、CSRF、Session 和 Plan B 家庭、邀请、角色、活动与应用壳。

用户验收的最终 PR Head 为 `e0593895b2da73b051fc6f855149c41f97de5bf4`，PR #23 已合并到 `develop@29b98f872ae535f6fd3c68472358dc3cb63cf09c`。Accepted 与 integrated digest 同为 `2D1050ED…2CF929`，验收有效；merge-triggered Quality run `35045625733` 在精确集成提交成功。

## 集成复验

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 版本绑定 | PASS | PR #23 为 MERGED；accepted commit 是 merge commit 的第二父提交且为其祖先；accepted/integrated v2 digest 完全相同。 |
| 集成聚合门禁 | PASS | `develop@29b98f8…` 执行 `pnpm validate` exit 0；branch-flow 5、API 27、Web 23、lint、format、typecheck、build 与项目校验通过。 |
| 本地完整 E2E | PASS | 57 项矩阵为 38 passed、19 designed skips、0 failed，覆盖 375/834/1440。 |
| Docker 部署 E2E | PASS | 按 spec 隔离执行同一 57 项矩阵：32 passed、25 designed skips、0 failed；仅清除逐键确认的 `bgg-compose:rl:*` 自动化限流键。 |
| Migration 与 OpenAPI | PASS | 同一 PostgreSQL 的 3 个 migration 均已应用；连续两次 OpenAPI/client SHA-256 均为 `927E5D90…DC32A07`。 |
| Readiness | PASS | API 200/ok，PostgreSQL、Redis、objectStorage 均 up；API/PostgreSQL/Redis/MinIO healthy，Web 正常运行。 |
| 远端 CI | PASS | GitHub Actions run `35045625733`，event=push，head=`29b98f8…`，Quality completed/success。 |

集成首次 `pnpm validate` 因 Windows 全局 `core.autocrlf=true` 使新检出的文件呈现 CRLF 而触发 28 个 Prettier 失败；格式化后 Git 对象与 HEAD 完全一致，`git add -u` 只刷新索引且没有 staged diff。随后在无内容变化的精确集成树上复跑通过。该环境失败保留为证据，不计为产品缺陷。

## 候选检查

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 固定身份 | PASS | Review 候选为 `5fdb3cfd…`，v2 digest 为 `DCDF8DD6…C6024E`；Review 后仅修改本 Plan 报告/状态/索引，没有改变被 Review 的提交。 |
| 独立项目门禁 | PASS | Review 后重新执行 `pnpm validate`，exit 0；lint、format、typecheck、branch-flow 5、API 27、Web 23、build、知识库与 digest 校验通过。 |
| 本地完整 E2E | PASS | 候选前固定源码按正式门禁顺序运行 `pnpm e2e`：38 passed、19 designed skips、0 failed；375/834/1440 全覆盖。 |
| 既有数据库升级 | PASS | `prisma migrate status` 显示 3 个 migration，schema up to date；Plan B 库升级成功。 |
| 空数据库与级联 | PASS | 任务临时库从零部署全部 3 个 migration；删除合成 Family 后 Baby/Membership 均为 0，随后只删除该临时库。 |
| 真实维护 SQL | PASS | 独立任务库执行真实 `BabyMaintenanceService`：advisory lock 生效，`purged_count=1`，ACTIVE 宝宝保留；任务库随后删除。 |
| Docker 部署矩阵 | PASS（组合证据） | 单次完整部署运行先得 30 passed、25 designed skips、2 个 429；只清除 65 个精确 `bgg-compose:rl:*` 自动化限流键后，两项失败独立复跑为 2/2 passed。合并覆盖同一候选的全部设计用例；未降低阈值或信任代理。 |
| Docker readiness | PASS | API 200/ok，PostgreSQL、Redis、objectStorage 均为 up；API/PostgreSQL/Redis/MinIO healthy，Web 正常运行。 |
| OpenAPI | PASS | 连续两次 export/client generation 的 SHA-256 均为 `927E5D90…DC32A07`，生成结果确定。 |
| 仓库与安全 | PASS | 候选提交后 preflight clean/verified/no-overlap；无 secrets、真实资料或构建产物入库。 |

## 终端 × 状态回归

| 状态 | 375 | 834 | 1440 |
| --- | --- | --- | --- |
| 登录/注册/会话恢复 | PASS | PASS | PASS |
| 无家庭 onboarding 与家庭创建 | PASS | PASS | PASS |
| 家庭页面、邀请与角色权限 | PASS | PASS | PASS |
| 无宝宝创建引导/等待管理员 | PASS | PASS | PASS |
| 创建宝宝并自动进入首页 | PASS | PASS | PASS |
| 当前宝宝恢复、跨家庭隔离与确定性回退 | PASS | PASS | PASS |
| 编辑、切换、归档确认与恢复 | PASS | PASS | PASS |
| 中文错误、加载与无数据状态 | PASS | PASS | PASS |
| Navbar/MobileTabBar、视觉基线与无横向溢出 | PASS | PASS | PASS |

API 语义只在 1440 project 执行一次，避免对 viewport 无关契约做三次重复副作用；375/834 对应项标记 designed skip。Docker 生产式状态页默认关闭，所以状态页用例在部署矩阵 designed skip；本地测试环境已验证其正常、加载和错误状态。

## 失败复查、清理边界与剩余风险

- 第一次独立 Docker 全量运行发生 3 个 429 连锁失败；定位到持久 Redis 已有 87 个 `bgg-compose:rl:*` 自动化限流键。逐键验证前缀后使用 UNLINK 清除，剩余为 0；没有触碰 `sess:*`、验证码 challenge、账号、家庭、宝宝或数据卷。
- 第二次单次 Docker 全量运行仍有 2 个 429，因为容器安全默认 `TRUST_PROXY=0`，整个并行套件统一计入容器网关 IP，新增流程后单次请求量超过“20 次验证码申请/小时”。保留默认安全值和产品阈值，不为测试降低保护；只清除本轮 65 个精确自动化限流键，并独立复跑失败的认证/家庭用例，两项全部通过。
- 尝试在瘦身后的 API runtime container 内运行 `pnpm prisma migrate status` 返回 executable not found；该镜像按设计不包含 pnpm。使用主机固定 pnpm/Prisma 对同一 PostgreSQL 核对，3 个 migration 全部已应用。该工具不可用不写作 Docker 内 PASS。
- Docker Desktop 修复产生的四个 `*-stale-plan-c-20260915*` runtime 目录仍保留于 LocalAppData，未删除；它们不属于仓库、镜像、容器、volume 或业务数据，等待用户以后决定是否清理。
- Node/Jest 上游 JSON import 与 Vite 502 kB chunk 建议仍为非阻断观察项；真实短信、正式法律文本、非 Chromium 浏览器及后续照片/里程碑/成长数据均是明确非目标。

Regression 结论为 `passed`。最终候选三项 PR 检查、人工验收、普通 merge、集成范围等价性和精确集成提交复验均已完成，可归档。
