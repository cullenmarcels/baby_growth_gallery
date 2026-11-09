---
plan_id: PLAN-20261022-707KSVG3
type: regression
status: passed
created_at: 2026-10-29T10:00:00+08:00
updated_at: 2026-10-29T10:00:00+08:00
repository_mode: git_remote
phase: candidate_and_integration
reviewed_commit: f3fae9c259827b4533c4b1264e77cffd8a8fe925
reviewed_scope_digest: E8A7CDDD2A70AF903214F670F36E630B1E849C6E5FBA5884420A15EF705CDA53
integrated_commit: 2d28593497494d442609f5f931edff85fc40b1b3
integrated_scope_digest: E8A7CDDD2A70AF903214F670F36E630B1E849C6E5FBA5884420A15EF705CDA53
ci_status: passed
---

# 候选 Regression

候选 `f3fae9c259827b4533c4b1264e77cffd8a8fe925`；v2 摘要 `E8A7CDDD2A70AF903214F670F36E630B1E849C6E5FBA5884420A15EF705CDA53`。该回归在 Review 完成后独立执行；人工验收已由用户确认。远端 CI 当前 pending。

`pnpm validate` 通过：301 API tests、77 Web tests，lint、format、typecheck、build 和 project validation 全通过。`pnpm api:generate` 前后 OpenAPI/client SHA 保持不变。

`pnpm stack:up` 使用现有构建参数指定 npm 镜像成功；候选容器成长及 readiness 共 18 项通过（375/834/1440），含加载、空列表、失败重试、同日多记录、BMI、WHO 参考、回收/恢复/管理员清理、角色隔离、版本冲突、过期状态、生日修订、确认框焦点和 readiness。容器所需 PostgreSQL、Redis、对象存储均健康。

全量当前候选串行 Playwright：84 total，53 passed、31 skipped、0 failed（跳过项按 viewport/environment 条件设计）；包括认证、宝宝、家庭、照片、里程碑与成长。并发运行曾出现一次照片批量编辑失败；对应 2 项串行复跑通过，全量串行也通过，保留为非复现不稳定信号。首次容器 E2E 因共享注册速率限制有 1 个 429；使用隔离 Redis 前缀和测试代理后通过，测试后恢复默认容器配置。

集成验证：PR #30 已合并至 `develop`，集成提交 `2d28593497494d442609f5f931edff85fc40b1b3`。刷新后的 `origin/develop` 指向该提交；集成 tree 与候选工作 tree 完全一致，v2 owned-scope 摘要仍为 `E8A7CDDD2A70AF903214F670F36E630B1E849C6E5FBA5884420A15EF705CDA53`。集成后重新运行 `pnpm validate` 通过，301 API、77 Web 测试通过；GitHub `quality`、`e2e-auth`、`branch-flow-develop` 均通过。回归状态为 `passed`，集成复验完成。
