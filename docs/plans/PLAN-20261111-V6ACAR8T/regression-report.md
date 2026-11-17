---
id: PLAN-20261111-V6ACAR8T-REGRESSION
type: regression_report
title: regression-report
status: pending
created_at: 2026-11-11T15:30:14+08:00
updated_at: 2026-11-17T11:24:55+08:00
plan_id: PLAN-20261111-V6ACAR8T
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
