---
id: PLAN-20261111-V6ACAR8T-REGRESSION
type: regression_report
title: regression-report
status: pending
created_at: 2026-11-11T15:30:14+08:00
updated_at: 2026-11-11T15:30:14+08:00
plan_id: PLAN-20261111-V6ACAR8T
---

## 重新核对

- 此计划已记录的隔离容器 E2E：375、834、1440 三个视口，59 项通过、25 项按项目既定条件跳过；后台专项镜像测试 6 项通过。
- 已记录的导航、列表分页、状态、详情返回与滚动位置回归保持为工作区证据。
- 本次复跑 pnpm validate 通过。
- 最新 palette 的三个视口交互和对比度检查基于合成数据及隔离 Web 容器执行。
- 候选版本 E2E 和集成后回归均未执行。按 STAGE-REGRESSION 与 GIT-008，候选 Review 通过之前不能将本记录设为 passed。
- 状态保持 pending，Plan 不进入 acceptance_pending 或 archived。
