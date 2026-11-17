---
id: PLAN-20261111-V6ACAR8T-REGRESSION
type: regression_report
title: regression-report
status: passed
created_at: 2026-11-11T15:30:14+08:00
updated_at: 2026-11-17T13:57:11+08:00
plan_id: PLAN-20261111-V6ACAR8T
ci_status: passed
integrated_commit: a63e50a497d1d325944b6ae5eb802df5453b2e25
integrated_scope_digest: 59B59C83942308C93F9493395DED02D1B2674DD1CBE613B5288D4B9285BE13A0
phase: integration
repository_mode: git_remote
reviewed_commit: 6c227008e86963dd3c66335440c51c26be3063af
reviewed_scope_digest: 59B59C83942308C93F9493395DED02D1B2674DD1CBE613B5288D4B9285BE13A0
---

## 重新核对

- 此计划已记录的隔离容器 E2E：375、834、1440 三个视口，59 项通过、25 项按项目既定条件跳过；后台专项镜像测试 6 项通过。
- 已记录的导航、列表分页、状态、详情返回与滚动位置回归保持为工作区证据。
- 本次复跑 pnpm validate 通过。
- 最新 palette 的三个视口交互和对比度检查基于合成数据及隔离 Web 容器执行。
- 候选版本 E2E 和集成后回归均未执行。按 STAGE-REGRESSION 与 GIT-008，候选 Review 通过之前不能将本记录设为 passed。
- 状态保持 pending，Plan 不进入 acceptance_pending 或 archived。

## 2026-11-17 候选回归

- 候选 SHA：6c227008e86963dd3c66335440c51c26be3063af
- v2 作用域摘要：59B59C83942308C93F9493395DED02D1B2674DD1CBE613B5288D4B9285BE13A0
- 范围：超管后台列表和详情、共享管理契约与生成客户端

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| 固定依赖与项目验证 | PASS | 冻结离线安装。pnpm validate 通过照片依赖、Lint、Prettier、类型、API 292/292、Web 77/77、工具 5/5、应用构建及项目聚合校验。Windows 初次格式失败来自 CRLF 检出，恢复提交的 LF 字节后通过。 |
| OpenAPI 生成 | PASS | pnpm api:generate 通过。生成的 OpenAPI 与 TypeScript schema 相对候选无内容差异。 |
| Prisma 迁移 | PASS | 独立 PostgreSQL 空测试库成功应用 9 条迁移，使用独立 Redis、MinIO 与合成账号。 |
| Windows Chromium E2E | PASS | pnpm e2e --workers=1 --retries=0 最终 65 项通过、19 项条件跳过，覆盖 375、834、1440。认证、家管开户和首次换密、超管后台、宝宝、照片、成长、里程碑与首页均执行。 |
| 标准镜像及部署连接性 | UNAVAILABLE | 隔离 Compose 的 PostgreSQL、Redis、MinIO 与代理健康。API 镜像编译完成，生产依赖打包因 npm registry 超时结束。最终 E2E 使用本机 API/Web 与独立容器依赖，部署连接性按条件跳过。 |
| 远端 CI 与集成复验 | UNVERIFIED | 候选尚处本地，尚无该候选在 develop 上的集成提交。 |

初次浏览器回归将对象存储内部写入指向公开代理，照片处理未完成。拆分内部 MinIO 连接和浏览器签名上传地址后，照片用例通过。并行生成 OpenAPI 期间本机 API 开发监听曾重启，生成结束后串行全量重跑通过。两个恢复动作均未修改候选代码。

候选本机回归通过。总体报告保持 pending，保留标准镜像和后续集成验证的证据缺口。

## 候选与集成独立回归结论

| 阶段 | 提交 | 结果 |
| --- | --- | --- |
| 本地候选 | 6c227008e86963dd3c66335440c51c26be3063af | Windows Chromium 三视口 65 项通过，19 项按条件跳过。应用聚合验证及 OpenAPI 一致性通过。 |
| PR 检查 | 903c1900f4a67c3fa575812cb13c4d5b9fc15bc0 | [候选 CI](https://github.com/cullenmarcels/baby_growth_gallery/actions/runs/44024955001) 通过，包括 Alpine API 镜像与 Chromium 58 项通过、25 项按条件跳过。branch-flow-develop 成功。 |
| 合并后 | a63e50a497d1d325944b6ae5eb802df5453b2e25 | [集成 CI](https://github.com/cullenmarcels/baby_growth_gallery/actions/runs/44026083701) 通过。API 292/292、Web 77/77，确定性 OpenAPI、API 镜像与知识库校验成功。隔离库迁移通过，Chromium 58 项通过、25 项按条件跳过。 |

- v2 候选和集成作用域摘要：59B59C83942308C93F9493395DED02D1B2674DD1CBE613B5288D4B9285BE13A0
- [PR #32](https://github.com/cullenmarcels/baby_growth_gallery/pull/32) 于 2026-11-17T13:43:24+08:00 合入 develop。已核实远端包含该提交。候选、PR Head 与合并提交的 Plan 摘要一致，PR Head 与合并提交的 Git tree 相同。
- 回归覆盖认证及首次换密、家庭账号和角色、超管后台、宝宝档案、照片上传与私有草稿、成长、里程碑与首页。Chromium 视口为 375、834、1440。Windows 截图基线由本机覆盖，Linux 的平台限定和其他条件跳过项不计为通过。
- 本轮复核 CI 对合并提交的运行和原始日志。未重新运行本机应用或接触既有数据。
