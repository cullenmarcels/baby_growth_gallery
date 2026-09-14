---
id: PLAN-20260911-JBANR2J8-REGRESSION
type: regression_report
title: "家庭邀请中文错误与撤销确认候选回归"
status: passed
created_at: 2026-09-14T10:49:33+08:00
updated_at: 2026-09-14T10:49:33+08:00
plan_id: PLAN-20260911-JBANR2J8
phase: candidate
reviewed_commit: 66344d706a7b572d7c7af2b796af0bdd819d67c2
reviewed_scope_digest: AA322064285FD1EEE1C3C650DA7602DB1E4E33FCB43D3C714890EFD940DFF7D3
ci_status: pending
related_ids: [PLAN-20260911-JBANR2J8, PLAN-20260911-X27F6QNT, ACH-20260910-JBD9BWHZ]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论与影响范围

候选 Regression `passed`。本轮在正式 Review 之后独立复跑，不复用 Review 结论。影响链为：API Problem Details → api-client `ApiClientError` → Web 中文映射；邀请列表按钮 → ConfirmDialog → revoke mutation → Prisma `revokedAt` → 列表/接受过滤；同时覆盖 Plan A 认证、Session、CSRF、状态页和 Plan B 其他家庭能力。

## 候选检查

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 项目总门禁 | PASS | `pnpm validate` exit 0：lint、format、typecheck、API 20、Web 18、branch-flow 5、build、项目校验全部通过。 |
| 中文错误 | PASS | `user-facing-error` 单元测试覆盖已知 code 与未知/英文原始错误兜底；Family 组件验证 `ALREADY_FAMILY_MEMBER` 只显示中文。 |
| 撤销确认 | PASS | 组件验证取消零 API 调用、确认一次调用；375/834/1440 浏览器验证 dialog、取消、确认与中文成功状态。 |
| 撤销失效 | PASS | 真实 API 验证 revoked 邀请退出有效列表、重复撤销 204、旧口令 400 `INVITATION_INVALID`。 |
| 自用不消费 | PASS | 创建者 409 后其他账号使用同一口令 200；额外 5 路并行重复 5/5 通过。 |
| 全量 E2E | PASS | 51 项设计矩阵中 28 passed、23 designed skips、0 failed；认证、家庭、视觉、连接性均通过。 |
| Docker/依赖 | PASS | 最新 API/Web frozen-lockfile 镜像运行；PostgreSQL、Redis、MinIO、API、Web 均正常，readiness 三依赖为 up。 |
| migration/OpenAPI | PASS | 两个 migration 已应用、schema up to date；OpenAPI/client 连续生成无差异。 |
| 仓库与证据 | PASS | 候选 commit/digest 可重算，规则 64 条与归档哈希校验通过，无构建/测试临时产物进入 Git。 |

## 终端 × 状态回归

| 状态 | 375 | 834 | 1440 |
| --- | --- | --- | --- |
| 家庭创建与页面正常态 | PASS | PASS | PASS |
| 撤销确认打开/取消/确认 | PASS | PASS | PASS |
| 撤销成功通知与列表空态 | PASS | PASS | PASS |
| 登录/注册/受保护路由 | PASS | PASS | PASS |
| Navbar/MobileTabBar 与无横向溢出 | PASS | PASS | PASS |
| 视觉基线 | PASS（动态日期 15/20 像素） | PASS（动态日期 15/20 像素） | PASS（动态日期 15/20 像素） |

错误、加载、权限和空状态还由 Web 18 项测试覆盖；后端权限、并发、Session 回退、限流和活动分页由 API/E2E 覆盖。

## 失败复查、未覆盖项与风险

- 候选前首次 Docker 并行运行曾出现一次接受邀请 500；其后单项、两轮完整并行家庭专项、全量 Regression 及 5 路并行重复均通过，日志没有新的 unhandled failure。当前判定为不可复现瞬时环境/事务失败，不阻断候选，但集成 Regression 仍须观察。
- 自动化每轮只清除 `bgg-compose:rl:*` 临时限流计数，未清理 Session、账号、家庭或持久业务数据。
- CI 尚未运行新提交，状态为 pending；CI 失败会使本报告失效并返回 Development。
- 未覆盖真实短信、正式法律文本和非 Chromium 浏览器；这些均为既有明确非目标/上线边界，不被本修订宣称已完成。
- 本报告仅是 candidate regression；合并到 `origin/develop` 后仍必须在 integrated commit 上独立复验。
