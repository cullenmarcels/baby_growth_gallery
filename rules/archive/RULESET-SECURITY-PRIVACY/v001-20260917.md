---
ruleset_id: RULESET-SECURITY-PRIVACY
title: "安全与隐私规则"
version: 1
status: active
health: healthy
scope: security-privacy
stages: [exploration, development, review, regression]
effective_at: 2026-09-07T16:49:15+08:00
updated_at: 2026-09-07T17:18:08+08:00
source_refs: [AGENTS.md]
related_plan_ids: [PLAN-20260907-001]
related_achievement_ids: [ACH-20260907-001]
supersedes_version: null
---

# 安全与隐私规则

## SAFE-001 — 不写入密钥与凭据

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `development`, `review`, `regression`
- Applies to: 代码、配置、文档、日志、测试和回复。
- Trigger: 处理密钥、令牌、密码、会话或其他凭据。
- Requirement: 不得写入、提交或在普通输出中暴露真实凭据。
- Verification modes: `review`
- Verification: 检查修改内容和输出，不包含真实秘密值。
- Exceptions: 无；合法测试使用明确的非秘密占位值。
- Source: `AGENTS.md` AI 执行规则。

## SAFE-002 — 不把个人隐私数据写入证据

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `development`, `review`, `regression`
- Applies to: 日志、Docs、测试夹具、示例和工具输出。
- Trigger: 任务接触可识别个人或儿童的数据。
- Requirement: 不复制真实隐私数据到项目证据或普通输出；使用最小化、脱敏或合成数据。
- Verification modes: `review`
- Verification: 证据文件和测试数据不包含不必要的真实个人信息。
- Exceptions: 用户明确授权且任务确需保存时，仍必须限制范围并说明保护方式。
- Source: `AGENTS.md` 禁止提交个人隐私数据。

## SAFE-003 — 敏感数据使用必须最小化

- Level: `MUST`
- Status: `active`
- Stages: `planning`, `development`, `review`
- Applies to: 必须处理敏感信息的任务。
- Trigger: 已确认需求不能完全避免敏感数据。
- Requirement: 在 Plan 中明确最小必要范围、授权依据、存储位置、保留时间和验证方式后才处理。
- Verification modes: `review`, `human`
- Verification: Plan 和 Review 能证明范围、授权及保护措施。
- Exceptions: 无；信息不足时标记 blocked 并请求用户决定。
- Source: 用户确认本计划中的操作化安全规则。

## SAFE-004 — 发现疑似秘密时限制输出

- Level: `MUST`
- Status: `active`
- Stages: `exploration`, `development`, `review`
- Applies to: 项目中疑似密钥、凭据或隐私数据。
- Trigger: 搜索或工具输出发现疑似敏感内容。
- Requirement: 不在普通回复或日志中展开真实值；只报告位置、类型、风险和安全处理建议。
- Verification modes: `review`
- Verification: 输出无敏感值复述，报告仍足以定位和处理风险。
- Exceptions: 用户通过安全渠道明确要求核对特定值时仍应最小化显示。
- Source: 用户确认本计划中的操作化安全规则。
