---
id: ACH-20260908-001
type: achievement
title: "Git 多成员、多设备协作与可移植证据链：完成归档"
status: archived
created_at: 2026-09-08T14:57:26+08:00
updated_at: 2026-09-08T14:57:26+08:00
related_ids: [PLAN-20260908-001, PLAN-20260908-001-EXEC, PLAN-20260908-001-REVIEW, PLAN-20260908-001-REGRESSION, RULESET-GIT-COLLABORATION, RULESET-SOURCE-EVIDENCE, RULESET-REPOSITORY-SAFETY, RULESET-IMPLEMENTATION-QUALITY, RULESET-TESTING-QUALITY]
supersedes: []
superseded_by: []
plan_id: PLAN-20260908-001
confirmed_by: user
confirmed_at: 2026-09-08T14:57:26+08:00
archived_at: 2026-09-08T14:57:26+08:00
confirmation_record: "PLAN-20260908-001 可以归档"
repository_mode: non_git
reviewed_commit: null
integrated_commit: null
ci_status: not_configured
platform_scope: platform_unbound
---

# `ACH-20260908-001` — Git 协作与可移植证据链

## 归档摘要

- 对应 Plan：[`PLAN-20260908-001`](../plans/PLAN-20260908-001/plan.md)。
- 最终状态：`archived`。
- AI Review：[`passed`](../plans/PLAN-20260908-001/review-report.md)。
- Regression：[`passed`](../plans/PLAN-20260908-001/regression-report.md)。
- 人工确认：用户于 `2026-09-08T14:57:26+08:00` 明确表示“PLAN-20260908-001 可以归档”。
- 仓库模式：`non_git`；本次没有 Git 分支、远端、候选提交或集成提交。
- Design / Spec：无；本 Plan 只建设项目治理、协作和证据基础设施。

## 已确认 Plan 快照

### 目标

1. 建立可发现、可验证、可降级的 Git 多成员、多设备协作规则与仓库预检。
2. 让未来 Plan 固定仓库模式、基线、工作分支、远端状态、集成目标和 `owned_paths`。
3. 让 Review、Regression、人工验收和 Achievement 分别绑定候选版本与最终集成版本。
4. 使用抗并发 ID、确定性索引、UTF-8/LF 和规范化哈希降低跨分支与跨设备冲突。
5. 不初始化当前项目 Git，通过临时仓库验证协作流程。

### 范围

- 新建 Git Collaboration Ruleset；升级 Source Evidence、Repository Safety、Testing Quality 和六阶段菜单。
- 扩展 Docs 协议，加入新式 ID、Plan State、Acceptance Record、集成生命周期和归档清单。
- 新增 `.gitattributes`、`.gitignore`、ID 生成、仓库预检、索引生成和聚合校验。
- 新增可选 Codex SessionStart/Stop Hook。
- 使用 PowerShell 7、Windows PowerShell 5.1 和临时 Git 仓库执行正负测试。

### 非目标

- 不在当前目录执行 `git init`，不创建或修改真实分支、提交、远端及 CI。
- 不绑定 GitHub、GitLab 或其他托管平台。
- 不定义网站产品功能、视觉内容或技术栈。
- 不迁移、重命名或改写两个既有 archived Plan 与 Achievement 正文。

### 验收条件快照

- 正确识别 non_git、git_local、git_remote，以及 clean、dirty、stale、diverged、detached。
- 新档案使用日期与 8 位 Crockford Base32 随机后缀，legacy 永久兼容但不得继续新建。
- 新式 Plan 的冻结意图与可变生命周期分离；Git 远端模式必须集成复验后归档。
- 活动 Plan 路径重叠可以阻止；候选与集成摘要只比较 `owned_paths`。
- Docs/Rules 索引确定性生成，归档使用规范化 UTF-8/LF 哈希。
- Hook 不静默形成通过证据；所有自动测试通过且 `AGENTS.md` 不超过 100 行。

## 实际完成的修改

### 规则与菜单

- 新增 [`RULESET-GIT-COLLABORATION`](../../rules/modules/git-collaboration.md) v1，共 GIT-001 至 GIT-010。
- `RULESET-SOURCE-EVIDENCE`、`RULESET-REPOSITORY-SAFETY`、`RULESET-TESTING-QUALITY` 升级为 v2。
- Exploration、Planning、Development、Review、Regression、Acceptance 六个阶段菜单升级为 v2。
- 9 份升级前 v1 原文快照保存到 `rules/archive/`，并由规范化 SHA-256 清单保护。

### Docs 与不可变证据

- [`docs/README.md`](../README.md) 定义随机 ID、legacy 边界、Plan/State 分离、Acceptance Record、集成复验和归档门禁。
- [`docs/INDEX.md`](../INDEX.md) 与 [`rules/INDEX.md`](../../rules/INDEX.md) 使用只覆盖生成边界的确定性索引。
- [`docs/ARCHIVE.sha256`](../ARCHIVE.sha256) 首次保护两个既有 Achievement 及其全部 archived Plan 旁证，并在本次归档登记本 Plan 包和本 Achievement。
- `.gitattributes` 统一知识库文本为 LF，`.gitignore` 只忽略通用本地文件而不猜测技术栈。

### 稳定自动化接口

- `hooks/new-document-id.ps1`：Asia/Shanghai 日期、加密随机 Crockford 后缀、全 Docs 碰撞扫描和 Achievement 派生。
- `hooks/repository-preflight.ps1`：仓库模式、真实根目录、HEAD、分支、远端新鲜度、工作树、活动 Plan 重叠和稳定 JSON。
- `hooks/update-indexes.ps1`：确定性 `-Write` 与只读 `-Check`。
- `hooks/validate-project.ps1`：聚合 Rules、Docs、索引、清单、Git 上下文和 Hook 配置检查。
- `hooks/validate-rules.ps1`：保留兼容入口并支持历史 Ruleset、新旧 ID、新式 State 和规范化哈希。
- `.codex/hooks.json` 与 `hooks/codex-hook.ps1`：可选 SessionStart/Stop 增强，带 Git 根解析和 Stop 防循环。

## 计划偏差

- 目标、范围、接口和验收条件均无实质偏差。
- 当前环境仍是 `non_git`，因此没有生成候选提交、集成提交或 Acceptance Record；这是 Plan 锁定的 legacy 过渡路径。
- 平台范围保持 `platform_unbound`，没有把未运行的 macOS/Linux 写成通过。
- CI 保持 `not_configured`；项目 Hook 的设备级信任/自动触发保持 `unverified`，但显式验证入口已通过。

## Rules 证据

本 Plan 固定并通过 Review 的规则为：

- `RULESET-SOURCE-EVIDENCE` v1：SRC-001 至 SRC-008。
- `RULESET-REPOSITORY-SAFETY` v1：REPO-001 至 REPO-005。
- `RULESET-IMPLEMENTATION-QUALITY` v1：IMPL-001 至 IMPL-006。
- `RULESET-TESTING-QUALITY` v1：TEST-001 至 TEST-007。

Review 对上述 26 条 Rule 逐项给出 PASS；同时复核新建 GIT-001 至 GIT-010、三个升级模块和六个 v2 阶段菜单。历史 v1 规则由归档快照解析，没有改写 Plan 的固定依据。

## Review 与 Regression 结论

- Review 高、中、低严重级别未解决发现：0。
- PowerShell 7.6.5：聚合校验通过；Rules 套件 2 个正向、15 个负向场景通过；协作套件 25/25。
- Windows PowerShell 5.1：相同检查全部通过。
- 临时 Git 演练覆盖 git_local、git_remote、fresh、dirty_nonoverlap、dirty_overlap、stale、diverged、detached 和活动 Plan 路径冲突。
- `owned_paths` 未变化时摘要保持一致，相关内容变化时摘要失效。
- 随机 ID 格式、唯一性和模拟碰撞重试通过。
- 索引两次 `-Write` 幂等，`-Check` 拒绝生成区块损坏。
- LF/CRLF 规范化哈希一致；归档文件与 Manifest 同时被改写时仍会被 Git 集成基线拒绝。
- SessionStart、Stop、`stop_hook_active` 和 Git 根解析契约通过。
- 当前正式文本 CRLF 数为 0，`AGENTS.md` 为 87 行，项目根目录没有 `.git`。

## 关联证据与文件

- Plan：[计划正文](../plans/PLAN-20260908-001/plan.md)。
- Execution：[执行记录](../plans/PLAN-20260908-001/execution-log.md)。
- Review：[Review Report](../plans/PLAN-20260908-001/review-report.md)。
- Regression：[Regression Report](../plans/PLAN-20260908-001/regression-report.md)。
- Rules 当前入口：[`rules/INDEX.md`](../../rules/INDEX.md)。
- Docs 当前入口：[`docs/INDEX.md`](../INDEX.md)。
- Git 提交引用：无；归档时为 `non_git`。

## 人工确认与不可变状态

- 确认主体：用户。
- 针对 Plan：`PLAN-20260908-001`。
- 原始确认语义：“PLAN-20260908-001 可以归档”。
- 确认时间：`2026-09-08T14:57:26+08:00`。
- 归档时间：`2026-09-08T14:57:26+08:00`。
- 最终状态：`archived`。

本文件及对应 Plan 包从本次归档起永久只读。任何后续修复、扩展、平台验证、真实仓库接入或 CI 接入都必须使用新的随机 ID Plan，不得修改本归档。
