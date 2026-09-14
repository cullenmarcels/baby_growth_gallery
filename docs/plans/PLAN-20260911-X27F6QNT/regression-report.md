---
id: PLAN-20260911-X27F6QNT-REGRESSION
type: regression_report
title: "家庭身份基础 Regression"
status: passed
created_at: 2026-09-11T10:21:26+08:00
updated_at: 2026-09-11T15:01:00+08:00
plan_id: PLAN-20260911-X27F6QNT
repository_mode: git_remote
candidate_commit: 3b8b92fdcf3ed6eaa575c35c3ab2466152d0b673
integrated_commit: null
ci_status: passed
related_ids: [PLAN-20260911-X27F6QNT, ACH-20260910-JBD9BWHZ]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论

`PASS`。在 Review 之后，针对候选 `3b8b92fdcf3ed6eaa575c35c3ab2466152d0b673` 独立验证了 Prisma 数据链、Redis Session/限流、Auth 回归、Family API、OpenAPI client、Web 状态、375/834/1440 与 Docker 部署。所有已执行项均为 PASS，没有 FAIL/UNVERIFIED；PR #22 的 `branch-flow-develop`、`quality`、`e2e-auth` 也已成功。

本报告是候选 Regression，`integrated_commit` 仍为空；合并到 `origin/develop` 后必须在精确集成提交上重新运行 integrated regression，不能复用本结论归档。

## 影响范围与选择依据

| 影响链 | 风险 | 回归选择 |
| --- | --- | --- |
| Prisma migration → Family transaction | OWNER 唯一性、级联、历史 Account 兼容 | 现有 Plan A DB deploy、空库 deploy、级联回滚事务、API 事务 E2E。 |
| Session → Auth/Family navigation | 登录恢复、退出或成员失效后路由错误 | 认证 Session E2E、多家庭激活与确定性回退、Web redirect 组件测试。 |
| Redis → 邀请和认证限流 | 计数串扰、故障降级或攻击面扩大 | 独立 Redis 前缀全量 E2E、账号第 11 次 429、实现检查 IP 30/15m 与 503 fail-closed。 |
| Family API → OpenAPI/client/Web | DTO 漂移、CSRF 丢失、跨家庭缓存泄漏 | 两轮确定性生成、类型/构建、13 端点 E2E、familyId query keys 和 mutation 行为 Review。 |
| Family UI → 三类终端 | 断点、底栏遮挡、错误/空状态缺失 | 5 项 Family 组件测试、三视口真实创建与视觉基线、scrollWidth 检查。 |
| Plan A 既有认证/状态页 | 新路由或 Auth Context 破坏原功能 | 完整 auth.spec、auth visual、stack connectivity、状态页组件测试。 |

## 命令与结果

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| `pnpm validate` | PASS | exit 0；lint、format、typecheck、test、build、project validation 全部成功。 |
| Branch-flow tests | PASS | 5 passed，0 failed。 |
| API Jest | PASS | 3 suites、20 tests passed，0 failed。 |
| Web Vitest | PASS | 3 files、14 tests passed，0 failed。 |
| Windows Chromium E2E | PASS | 使用 `bgg-planb-regression-3b8b92f` 独立 Redis 前缀：28 passed、23 designed skips、0 failed。 |
| Prisma deploy | PASS | PostgreSQL 18.6 检出 2 个 migration，无 pending migration；候选前空库和 Plan A 升级已分别成功。 |
| OpenAPI/client | PASS | 连续两次生成组合 SHA 相同，`OPENAPI_DETERMINISTIC=True`，生成文件无 diff。 |
| Docker stack | PASS | postgres、redis、minio、api、web 全部 running/healthy；readiness 返回 postgres/redis/objectStorage 均 `up`。 |
| Project knowledge | PASS | `hooks/validate-project.ps1 -Check` exit 0，索引、Rules、Plan state 与归档哈希通过。 |
| PR #22 CI | PASS | run `34572223616` 的 `branch-flow-develop` 4s；run `34572224205` 的 `quality` 58s、`e2e-auth` 1m23s，全部 SUCCESS。 |

## 家庭业务矩阵

| 场景 | 结果 | 证据 |
| --- | --- | --- |
| 创建家庭/OWNER/Activity 原子性 | PASS | 实 API 创建返回 OWNER，成员和首条 `FAMILY_CREATED` 一致。 |
| 多家庭与 Session 修正 | PASS | 激活第一家庭后被移除，`GET /auth/session` 自动回退第二家庭。 |
| OWNER/ADMIN/MEMBER | PASS | Policy 单元矩阵、OWNER 冲突 409、MEMBER 邀请 403、未加入资源 404。 |
| 邀请一次性/并发 | PASS | 正常消费后重放无效；两个账号并发同口令严格一 `200` 一 `400`，仅一条新 Membership。 |
| 失权撤销与重新加入 | PASS | ADMIN 降级后其口令无效；LEFT 记录恢复为原 Membership、角色 MEMBER、Activity 为 REJOINED。 |
| 邀请限流 | PASS | 同账号前 10 次计数，第 11 次 `429 RATE_LIMITED`；IP 限流实现固定 30/15m。 |
| Activity 游标/no-op/墓碑 | PASS | 两页无重复并稳定结束；角色 no-op 数量不变；无效 cursor 400；墓碑不返回原 type/actor/subject/summary。 |
| 家庭级联 | PASS | 回滚事务内删除 Family 后 Membership/Invitation/Activity 均为 0，未留下测试记录。 |

## UI 终端 × 状态回归

| 状态 | 375 | 834 | 1440 | 结果说明 |
| --- | --- | --- | --- | --- |
| 注册后 onboarding/创建家庭 | PASS | PASS | PASS | 真实页面、真实 API、合成数据。 |
| 家庭页正常/OWNER/Activity | PASS | PASS | PASS | 家庭标题、创建者标签、创建动态均可见。 |
| 桌面/移动导航 | PASS | PASS | PASS | 375/834 为底部导航，1440 为顶部 Navbar。 |
| 字段/服务/访问错误 | PASS | PASS | PASS | 共享组件由 Vitest 覆盖，布局使用同一响应式 CSS。 |
| 无家庭/空动态/MEMBER 权限 | PASS | PASS | PASS | redirect、empty state、权限隐藏与不发起邀请请求通过组件测试。 |
| 一次性邀请 | PASS | PASS | PASS | 口令创建后可见、关闭后不可再从 DOM 读取。 |
| 横向溢出/视觉 | PASS | PASS | PASS | scrollWidth 断言通过，三份 Windows 基线匹配。 |

## 未运行项与剩余边界

- `NOT_APPLICABLE`：真实短信发送、微信登录、家庭删除 API、所有权转移、宝宝/照片/里程碑/成长模块均为 Plan 明确非目标。
- `NOT_APPLICABLE`：Safari、Firefox、macOS 和移动真机不在本 Plan 固定矩阵；只声明实际运行的 Windows Chromium 与 GitHub Actions Linux Chromium。
- `PENDING`：集成提交 Regression、accepted/integrated digest 比对和归档，只有用户明确验收并授权合并后才能执行。
- Node 24 下固定 `libphonenumber-js` 仍输出 JSON import deprecation warning；测试 exit 0，未改变 Plan A 行为，后续依赖维护单独处理。
