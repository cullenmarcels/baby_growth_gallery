---
ruleset_id: RULESET-REPOSITORY-SAFETY
title: "仓库修改与文件安全规则"
version: 2
status: active
health: healthy
scope: repository
stages: [exploration, development, review]
effective_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T11:34:45+08:00
source_refs: [AGENTS.md]
related_plan_ids: [PLAN-20260907-001, PLAN-20260908-001]
related_achievement_ids: [ACH-20260907-001, ACH-20260908-001]
supersedes_version: 1
---

# 仓库修改与文件安全规则

## REPO-001 — 保留无关用户修改

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `development`, `review`
- Applies to: 所有文件修改任务。
- Trigger: 工作区已有文件或改动不属于当前任务。
- Requirement: 保留并绕开无关内容，不得撤销、覆盖或擅自整理。
- Verification modes: `review`
- Verification: 受影响文件清单与 Plan 范围一致，无无关回退。
- Exceptions: 用户明确授权处理具体目标。
- Source: `AGENTS.md` AI 执行规则。

## REPO-002 — 修改必须处于授权范围

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 代码、配置、文档、测试和自动化文件。
- Trigger: 创建、编辑、移动或删除文件。
- Requirement: 修改必须属于确认 Plan 或用户明确的一次性任务，不得推断对 materially different 工作的授权。
- Verification modes: `review`
- Verification: 每项修改能回链到 Plan 范围或用户明确请求。
- Exceptions: 为完成当前任务所需的安全、可逆、常规实现步骤。
- Source: 项目范围控制要求。

## REPO-003 — 破坏性目标必须精确

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 删除、覆盖、移动、清理和回退操作。
- Trigger: 操作可能导致材料难以以恢复的数据变化。
- Requirement: 先解析并核对精确目标与范围；目标不清时停止并请求授权。
- Verification modes: `review`
- Verification: 执行记录包含目标核对和结果，且没有宽泛根目录目标。
- Exceptions: 无。
- Source: 项目安全执行要求。

## REPO-004 — 不混入无关产物

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 项目正式文件集合。
- Trigger: 测试、构建、调试或工具运行产生文件。
- Requirement: 不提交或交付无关缓存、构建产物、日志、临时文件和调试残留。
- Verification modes: `review`
- Verification: 修改清单不含未授权产物；必要产物有明确用途和范围。
- Exceptions: 用户明确要求交付的构建产物或正式资产。
- Source: `AGENTS.md` AI 执行规则。

## REPO-005 — 修改前后核对影响范围

- Level: `SHOULD`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 所有项目修改。
- Trigger: 开始修改和完成修改。
- Requirement: 修改前确认目标路径和依赖，修改后核对实际文件及间接影响。
- Verification modes: `review`
- Verification: Execution Log 包含计划目标与实际受影响文件对照。
- Exceptions: 单一、明显且无依赖的低风险文本修正可简化记录。
- Source: 项目核对和证据链要求。

## REPO-006 — Git 同步操作必须保护已有工作

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `development`, `review`
- Applies to: Git 工作区和分支。
- Trigger: 准备 pull、merge、rebase、reset、切换分支或清理文件。
- Requirement: 先核对工作区、上游、分叉和目标路径，不得以同步为由覆盖、隐藏或丢弃成员已有修改。
- Verification modes: `automatic`, `review`
- Verification: 仓库预检与 Execution Log 证明操作前状态和授权。
- Exceptions: 用户明确指定并核对的可恢复目标。
- Source: 用户确认的多成员仓库安全要求。

## REPO-007 — 归档不可变性不依赖文件属性

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`
- Applies to: 已归档 Plan 包、Achievement 和 Ruleset 快照。
- Trigger: 新增归档或校验历史。
- Requirement: 使用规范化内容哈希与基线清单保护历史；不得通过改写清单接受未授权篡改。
- Verification modes: `automatic`, `review`
- Verification: 聚合校验器验证 `docs/ARCHIVE.sha256` 和 `rules/archive/MANIFEST.sha256`。
- Exceptions: 无。
- Source: 用户确认的跨设备不可变证据设计。
