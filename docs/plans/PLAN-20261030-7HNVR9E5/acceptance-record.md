---
plan_id: PLAN-20261030-7HNVR9E5
type: acceptance_record
status: invalidated
acceptance_status: invalidated
created_at: 2026-10-30T15:27:00+08:00
updated_at: 2026-11-06T17:00:00+08:00
plan_id: PLAN-20261030-7HNVR9E5
confirmed_by: user
confirmed_at: 2026-10-30T17:45:36+08:00
confirmation_record: '验收通过'
accepted_commit: 93238cbed35c545d9ef82a7531a5b9931a86d0f7
accepted_scope_digest: 9DF55045C23C6705A0D36141B503AE7A8A594706365585B9CADB453788C0323C
invalidation_reason: 'CI 发现提醒组件用例依赖绝对日期；owned test path 修复后需绑定新候选重新 Review、Regression 和人工验收'
---

# 候选人工验收记录

用户于 `2026-10-30T17:45:36+08:00` 明确回复“验收通过”。确认语义绑定候选提交 `93238cbed35c545d9ef82a7531a5b9931a86d0f7` 与 v2 作用域摘要 `9DF55045C23C6705A0D36141B503AE7A8A594706365585B9CADB453788C0323C`。确认当时远端新鲜度尚未验证；后续于 2026-11-06 刷新远端成功，具体分支和 PR 状态见 `execution-log.md`。

原确认仅覆盖该候选人工验收，不包含 push、PR、merge 或归档授权；确认时远端集成尚未开始。随后依据用户单独授权已推送功能分支并创建 PR #31。

该确认现标记为 `invalidated`：CI 失败暴露了固定日期测试在日期推进后失效；修复涉及 Plan 的 owned test path，因此旧候选验收不适用于修订后的作用域。新的验收须针对更新后的候选 SHA 和 v2 摘要另行记录。
