---
id: PLAN-20260908-001
type: plan
title: "Git 多成员、多设备协作与可移植证据链"
status: archived
created_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T14:57:26+08:00
related_ids: []
supersedes: []
superseded_by: []
confirmed_by: user
confirmation_basis: "PLEASE IMPLEMENT THIS PLAN: Git 多成员、多设备协作与可移植证据链建设方案"
applicable_rules:
  - ruleset_id: RULESET-SOURCE-EVIDENCE
    version: 1
    rule_ids: [SRC-001, SRC-002, SRC-003, SRC-004, SRC-005, SRC-006, SRC-007, SRC-008]
  - ruleset_id: RULESET-REPOSITORY-SAFETY
    version: 1
    rule_ids: [REPO-001, REPO-002, REPO-003, REPO-004, REPO-005]
  - ruleset_id: RULESET-IMPLEMENTATION-QUALITY
    version: 1
    rule_ids: [IMPL-001, IMPL-002, IMPL-003, IMPL-004, IMPL-005, IMPL-006]
  - ruleset_id: RULESET-TESTING-QUALITY
    version: 1
    rule_ids: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007]
---

# Git 多成员、多设备协作与可移植证据链

## 现状与确认依据

- 当前目录不是 Git 仓库，但用户明确要求知识库能够随 Git clone/pull 在跨成员、跨设备环境中保持有效。
- 已有 `AGENTS.md → Rules → Docs → Plan → Review → Regression → Acceptance` 证据链只证明单工作区一致性，尚未记录分支基线、远端新鲜度、并行 Plan 路径所有权或最终集成提交。
- 当前档案使用同日三位序号，中央索引由 AI 直接维护，归档哈希按工作区原始字节计算，存在并发编号、索引冲突和 CRLF/LF 差异风险。
- 用户已经确认抗并发随机 ID、合并并复验后归档、平台暂未锁定、不初始化当前目录 Git，以及 Codex hook 仅作可选增强。

## 目标

- 建立可发现、可验证、可降级的 Git 协作规则与仓库预检。
- 让新 Plan 固定仓库模式、基线提交、分支、远端状态、集成目标和修改路径。
- 让 Review、Regression、人工验收和 Achievement 分别绑定候选版本与最终集成版本。
- 使用抗并发 ID、确定性索引和规范化哈希降低跨分支、跨设备冲突。
- 在不初始化 Git、不配置远端的前提下，通过临时仓库完整验证 Git 协作行为。

## 范围

- 新增 Git Collaboration Ruleset，升级受影响的三类规则模块和六个阶段菜单并归档旧版本。
- 扩展 Docs 协议，增加新 ID、Plan State、Acceptance Record、集成生命周期和归档清单。
- 增加 `.gitattributes`、最小 `.gitignore`、仓库预检、ID 生成、索引生成和聚合校验接口。
- 增加可选 `.codex/hooks.json` 与 hook 适配器。
- 扩展正负测试，使用系统临时目录模拟本地仓库、bare remote、分支分叉、作用范围变化和归档篡改。
- 更新 `AGENTS.md`、Rules Index 和 Docs Index，保留菜单优先入口。

## 非目标

- 不执行 `git init`，不创建 Git 提交、远端、分支、push、merge 或 rebase。
- 不绑定 GitHub、GitLab 或其他 CI 平台。
- 不确定网站技术栈、产品功能或非 Windows 开发平台。
- 不修改、重命名或迁移两个既有 Plan 与 Achievement 的正文。
- 不把项目 hook 当作完整安全边界或唯一验证入口。

## 关联 Design / Spec

无。当前尚未登记产品 Design 或 Spec，本计划只建设项目协作治理基础设施。

## 适用 Rules

本计划固定使用确认时有效的四个 Ruleset v1，具体 Rule ID 见 YAML。Rules 升级是本计划交付物；校验器必须能够从 archive 解析 Plan 固定的历史版本，而不是强迫旧 Plan 引用当前版本。

## 实施步骤

1. 保存即将升级的 Ruleset v1 快照并登记规范化 SHA-256。
2. 新增 Git Collaboration Ruleset，升级三个规则模块和六个阶段菜单。
3. 更新 Docs 协议和新 Plan 包接口，加入状态、验收、集成与不可变证据。
4. 建立抗并发 ID、仓库预检、确定性索引、规范化归档哈希和聚合校验。
5. 配置可选 Codex SessionStart/Stop hook，显式处理信任或运行时缺失。
6. 扩展自动化正负测试，修复全部失败。
7. 生成完整 Review 规则矩阵并执行独立 Regression。
8. 将本 Plan 更新为 `acceptance_pending`，等待用户实际确认。

## 验收条件

- 非 Git、仅本地 Git和带远端 Git 三种模式可被准确区分。
- 仓库预检能识别 clean、dirty non-overlap、dirty overlap、stale、diverged 和 detached。
- 新档案使用日期加八位 Crockford Base32，旧档案保持兼容。
- 新 Plan 的冻结意图与可变状态分离，Git 远端模式不能在集成复验前归档。
- 并行活动 Plan 的路径重叠可被发现并阻止静默继续。
- Docs/Rules 索引动态区块可确定性生成并检测过期内容。
- Rules 与 Docs 归档使用 UTF-8/LF 规范化哈希，既有归档正文哈希保持不变。
- 可选 hook 输出符合 Codex SessionStart/Stop 接口，缺失时不形成静默通过。
- 所有既有测试和新增正负测试通过，`AGENTS.md` 不超过 100 行。

## Review 与 Regression 要求

- Review 覆盖本计划固定的全部 v1 Rule，并逐项核对新建 GIT Rule 的结构与验证方式。
- 核对 OpenAI Docs 所述 hook 信任、事件输出和 Git 根路径边界。
- Regression 必须使用临时 Git 仓库覆盖本地、远端、分叉、路径重叠和候选/集成摘要。
- Regression 必须证明当前目录仍无 `.git`、无远端配置副作用，两个既有归档正文未变化。

## 风险与限制

- 当前平台范围是 `platform_unbound`；PowerShell 是参考实现，不能据此宣称 macOS/Linux 已验证。
- 当前没有真实远端，远端与 CI 行为只能通过临时仓库和显式未配置状态验证。
- Git hook 是实用防护机制而非完整强制边界，最终仍以显式校验和证据链为准。

## 人工归档门槛

本过渡 Plan 在 `non_git` 模式下实施。只有 Review 与 Regression 通过、状态为 `acceptance_pending`，且用户明确表示 `PLAN-20260908-001` 可以归档时，才能创建 `ACH-20260908-001-*`。
