---
id: PLAN-20260920-BR79695D-ACCEPTANCE
type: acceptance_record
title: "Plan F 人工验收记录"
status: invalidated
acceptance_status: invalidated
created_at: 2026-09-20T15:37:48+08:00
updated_at: 2026-09-22T10:12:00+08:00
plan_id: PLAN-20260920-BR79695D
confirmed_by: user
confirmed_at: 2026-09-21T18:05:31+08:00
confirmation_record: "验收通过，开始推分支"
accepted_commit: aacf33644f5b487f7c5971618c478ba1da3d2bab
accepted_scope_digest: 94EFC4E2AB98BD53E53719F9A72380D9FB019DEA4D76C9A109849E974872FE13
integration_commit: null
integration_scope_digest: null
pr_url: null
related_ids: [PLAN-20260920-BR79695D]
supersedes: []
superseded_by: []
---

# Acceptance Record

用户于 `2026-09-21T18:05:31+08:00` 明确回复“验收通过，开始推分支”。该确认绑定精确产品候选 `aacf33644f5b487f7c5971618c478ba1da3d2bab` 与 v2 owned-scope 摘要 `94EFC4E2AB98BD53E53719F9A72380D9FB019DEA4D76C9A109849E974872FE13`；Review、独立 Regression 和项目验证均已通过。

本次授权仅覆盖推送 `feature/baby-milestones` 功能分支；未授权创建 PR、合并 `develop`、推送归档证据、受保护分支晋升或生成 Achievement。`integration_commit`、`integration_scope_digest` 和 `pr_url` 保持 `null`，后续动作继续遵守独立授权边界。

用户随后反馈首页“成长里程碑”卡片仍显示“里程碑记录将在后续阶段开放”。该修复会改变原候选的 owned scope，故以上确认不再适用于修订后的候选；本记录保留原始确认语义和绑定，`status` 与 `acceptance_status` 已更新为 `invalidated`。修订候选完成 Review、Regression 后需要新的明确人工验收。
