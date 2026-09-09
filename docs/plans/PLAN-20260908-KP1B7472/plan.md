---
id: PLAN-20260908-KP1B7472
type: plan
title: "基于 GitHub 远端建立可启动的前后端分离 Monorepo"
status: confirmed
created_at: 2026-09-08T17:41:41+08:00
updated_at: 2026-09-08T17:41:41+08:00
related_ids: [DES-20260908-ZVZKM07B, SPEC-20260908-5BD26QCA]
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "PLEASE IMPLEMENT THIS PLAN: 第一阶段：基于 GitHub 远端建立可启动的前后端分离 Monorepo"
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 2
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008, SRC-009, SRC-010]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 2
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005, REPO-006, REPO-007]
  - ruleset_id: RULESET-GIT-COLLABORATION
    version: 1
    rule_ids: [GIT-001, GIT-002, GIT-003, GIT-004, GIT-005, GIT-006, GIT-007, GIT-008, GIT-009, GIT-010]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 1
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 2
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007, TEST-008, TEST-009, TEST-010]
  - ruleset_id: RULESET-SECURITY-PRIVACY
    version: 1
    rule_ids: [SAFE-001, SAFE-002, SAFE-003, SAFE-004]
  - ruleset_id: RULESET-RESPONSIVE-UI
    version: 1
    rule_ids: [RESP-001, RESP-002, RESP-003, RESP-004, RESP-005, RESP-006]
---

# 基于 GitHub 远端建立可启动的前后端分离 Monorepo

## 目标

以 `origin/main` 的真实提交为唯一历史基线，把现有知识库、正式导入的设计资料和完整可启动的工程骨架交付到 `feature/project-foundation`，通过 Pull Request 候选交给用户验收，不直接修改或合并 `main`。

## 已确认决策

- 远端：`https://github.com/cullenmarcels/baby_growth_gallery.git`，集成目标 `main`。
- 单仓库 pnpm Workspace；Web 与 API 独立构建、镜像、服务器进程和发布生命周期。
- 技术栈、契约、安全边界和非目标以 `SPEC-20260908-5BD26QCA` 为准。
- `D:\codex-handoff` 原样导入 `DES-20260908-ZVZKM07B`，外部原件不做变更。
- 首阶段必须可启动，使用模拟外部集成与合成数据，不实现真实业务。

## 实施步骤

1. 安装并认证 GitHub CLI，读取远端 `main`、文件树、权限和新鲜度。
2. 从远端基线建立本地 `main` 与 `feature/project-foundation`，不创建平行历史，不强推。
3. 生成 Design、Spec、Plan ID，导入设计来源并登记哈希和尺寸。
4. 建立根 Workspace、Web、API、生成客户端、Docker/Compose 与 Nginx 配置。
5. 实现 live/ready/OpenAPI/Problem Details、基础依赖探测和三态响应式状态页。
6. 安装/启用 WSL2 与 Docker Desktop；若系统要求重启则作为明确暂停点，恢复后重跑环境检查。
7. 执行 lint、typecheck、unit、build、OpenAPI 稳定性、Compose、容器、接口、响应式和端到端验证。
8. Review 与 Regression 绑定候选提交和 owned scope digest；fetch 最新 main 后推送分支并创建 PR。

## 验收条件

- 全新检出可执行 `pnpm install --frozen-lockfile`，根固定命令完整可用。
- Web/API 能在宿主机独立开发，也能由 Compose 独立镜像组成完整栈。
- live 不依赖基础设施；ready 准确报告 PostgreSQL、Redis、对象存储状态。
- OpenAPI 是生成客户端的唯一类型来源，重复生成无漂移。
- CORS allowlist、credentials、Problem Details、追踪 ID 有自动测试。
- 状态页覆盖加载/成功/错误，并在 375/834/1440 无横向溢出。
- Web/API 镜像分别构建；Compose 配置与健康检查通过。
- `hooks/validate-project.ps1 -Check` 通过；不可用项如实记为 unavailable/unverified。
- 功能分支推送并创建目标为 `main` 的 PR；不 merge、不 force push。

## 非目标

不实现真实账号、短信、微信、照片上传、家庭权限、成长数据、WHO 曲线、异步 worker 或 CI 工作流；不引入 Turborepo、Tailwind 或重型视觉组件库；不修改 LICENSE 内容。

## 风险与暂停点

- WSL2 或 Docker Desktop 可能要求管理员授权或重启；重启前保留可恢复证据，恢复后不得沿用旧环境结论。
- 依赖精确版本若未在公共 registry 发布，必须报告并使用不改变架构意图的最小兼容处理，禁止静默改成预发布版本。
- 若 `origin/main` 在候选创建前变化，必须重新 fetch、检查冲突并更新基线证据。
