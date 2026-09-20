---
id: PLAN-20260918-RC0Y5QH3-REGRESSION
type: regression_report
title: 'Plan E 界面修订 Regression'
status: passed
created_at: 2026-09-18T14:37:52+08:00
updated_at: 2026-09-20T14:30:49+08:00
plan_id: PLAN-20260918-RC0Y5QH3
phase: integrated
reviewed_commit: 8fc539813c28d5f56e973f59eb6ff6eb11c86470
reviewed_scope_digest: 9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7
integrated_commit: 5e9244a19c56e4da76ab467678bb839d98689099
integrated_scope_digest: 9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7
ci_status: passed
related_ids: [PLAN-20260918-RC0Y5QH3, DES-20260918-Y2GFD47V]
supersedes: []
superseded_by: []
---

# Regression Report

## 候选结论与影响范围

前一候选 `26f15120` 的独立 Regression 已因新增图集瀑布流范围而失效；`0a9b1e5`、`67e6e0b` 也未通过最终候选门禁，正文仅保留其历史检查结果。候选 Regression 精确绑定最终产品候选 `8fc539813c28d5f56e973f59eb6ff6eb11c86470` 与 v2 owned-scope 摘要 `9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7`。PR #25 合并后的集成 Regression 精确绑定 `origin/develop@5e9244a19c56e4da76ab467678bb839d98689099`；集成摘要与 accepted 摘要一致，候选和集成结论均为 passed。

| 既有能力／依赖                | 选择依据                                         | 检查和结果                                                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 认证和 Session                | 新建取消及照片路由依赖当前家庭／宝宝上下文       | `auth.spec.ts`：11 passed、4 设计性 skipped；三视口注册、恢复、键盘与授权边界通过。                                                                                                                                           |
| 家庭页面和视觉                | 保留用户原有单行按钮修改影响邀请卡片高度         | `family.spec.ts`：8 passed、10 设计性 skipped。首次三张旧截图失败，审视新图后更新基线并遮罩动态日期；不带更新标志复跑三视口通过。                                                                                             |
| 宝宝档案与权限                | 新建取消、焦点及编辑组高度直接修改               | `baby.spec.ts`：4 passed、2 设计性 skipped。空档案页、无创建请求、编辑等高和真实 API 权限通过。                                                                                                                               |
| Plan D 上传与 Plan E 照片浏览 | 处理卡片和管理列表修改，发布／回收与头像共用数据 | `photo.spec.ts`：4 passed、2 设计性 skipped。私有上传、草稿隔离、发布、回收恢复、头像并发清除、图集／时间轴／详情、瀑布流及分页通过。最终候选新增 `PROCESSING` 与不可用预览的 16px 断言后，Review 后再次复跑该文件 4 passed。 |
| 认证视觉、连通性和状态页      | 全局按钮单行 CSS 与应用入口间接影响              | `auth-visual.spec.ts` 6 passed，`stack-connectivity.spec.ts` 3 passed，`status-page.spec.ts` 9 设计性 skipped。连通性首轮缺 `E2E_API_BASE_URL` 导致三视口失败，配置本地 API 地址后通过。                                      |

上述 Chromium E2E 在同一生产代码树上共 36 passed、27 按现有配置 skipped、0 个剩余失败。最终提交相对全量回归时只增加了照片处理状态的浏览器断言；Review 重新绑定后单独复跑受影响宝宝／照片文件 8 passed、4 skipped。旧候选和失败运行不算作通过证据。

## 独立执行结果

- Review 重新绑定 `8fc5398` 后，从该代码树重新构建 Web，并以新的 `bgg-plan-e-final-regression-20260920` Redis 前缀重建 API；`baby.spec.ts` 与 `photo.spec.ts` 在 Chromium 375／834／1440 合计 8 passed、4 按既有条件设计性 skipped、0 failed。真实 API 权限与并发检查按项目配置仅在 1440 执行，三个视口的响应式宝宝／照片流程均执行。
- 最终候选代码树使用临时 Corepack pnpm 11.21.0 转发再次执行 `corepack pnpm validate`：照片依赖、ESLint、Prettier、API／客户端／Web TypeScript、分支流向 5 项、API 54 项、Web 50 项、构建及项目文档／规则检查全部通过，终值 `PROJECT_VALIDATION=PASSED`。

- 最终候选再次执行 `corepack pnpm validate`（为仓库内嵌套 `pnpm` 使用临时 Corepack 转发，并设 `core.excludesFile` 到仓库 ignore，以绕开沙箱不可读的用户级 Git 配置）：照片依赖检查、ESLint、Prettier、API／客户端／Web TypeScript、分支流向 5 项、API 54 项、Web 49 项、构建及项目文档／规则检查全部通过，终值 `PROJECT_VALIDATION=PASSED`。临时转发文件位于系统 TEMP，未入库。
- `update-indexes.ps1 -Write` 和 `validate-project.ps1 -Check` 在候选 Review 重新绑定后通过。第一次聚合校验末尾因生成索引过期而失败，更新索引后复跑通过；无 Git 环境替代配置的单次校验报告 `UNAVAILABLE`，未作为通过证据。
- 本地 Docker PostgreSQL、Redis、MinIO、API 和 Web 健康。测试组使用独立 Redis 前缀，保留产品验证码限流，不放宽安全策略。浏览器使用 Windows Chromium 375／834／1440，截图基线仅对 Windows Chromium 更新。

## 集成提交复验

- 用户授权剩余证据提交推送后，PR #25 的最终 Head `aaabf126b9ec7ce05791971440176947912a97a4` 重新触发检查；`branch-flow-develop`（run `35493353971`）、`quality` 与 `e2e-auth`（run `35493354935`）全部成功。合并前 PR 为 OPEN、Base=`develop`、Head 精确匹配、mergeable=CLEAN。
- PR #25 以普通 merge commit 合并。`git fetch --prune origin` 后，`origin/develop` 精确为 `5e9244a19c56e4da76ab467678bb839d98689099`；两个父提交依次为原 `develop@c0e2108226886183e35f6a9d1ae6f4075d15acb5` 与最终 PR Head。PR Head 是目标分支祖先，集成 v2 owned-scope 摘要重算为 `9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7`，与 accepted 摘要相同。
- 精确 merge commit 的 develop push `Quality` run `35493573502` 成功：`quality` Job `106032523428` 与 `e2e-auth` Job `106032753992` 均通过；其中数据库迁移、确定性 OpenAPI 客户端、Alpine 图像编解码、项目知识库、MinIO、Playwright 和隔离上传清理检查均成功。
- 本地在精确 merge commit 上运行完整 `corepack pnpm validate`，照片依赖、ESLint、Prettier、API／客户端／Web TypeScript、分支流向 5 项、API 54 项、Web 50 项、构建和项目校验全部通过，终值 `PROJECT_VALIDATION=PASSED`。Windows 系统 `core.autocrlf=true` 曾把同一 blob 检出为 CRLF；核对工作树与 HEAD blob 哈希一致、Git diff 为零后，使用 LF 工作树和一次性临时索引完成格式及项目验证，未产生产品变更。
- 从 merge commit 重建 Docker API/Web；PostgreSQL、Redis、MinIO、storage-proxy、API 与 Web 健康。以独立 Redis 前缀运行 `baby.spec.ts` 与 `photo.spec.ts`，375／834／1440 合计 8 passed、4 按既有条件设计性 skipped、0 failed；真实 API 权限与并发检查仍按项目配置仅在 1440 执行。

## 视口 × 状态矩阵

| 视口 | 正常／响应式                                                                       | 空／加载／错误                                                         | 权限／键盘／其他边界                                                                                |
| ---- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 375  | PASS：44px 宝宝编辑操作组、上传标题和次行纵列、16px 卡片、单列瀑布流、邀请按钮单行 | PASS：宝宝空页、图集与管理空／加载／错误；处理和不可用缩略图卡片内边距 | PASS：取消聚焦标题、详情只读、筛选菜单边界、分页后顺序、无水平溢出                                  |
| 834  | PASS：操作组、上传标题首行／日期地点同排、双列瀑布流、邀请按钮单行                 | PASS：宝宝空页、图集与管理空／加载／错误；处理和不可用缩略图卡片内边距 | PASS：取消聚焦标题、详情只读、筛选菜单边界、分页后顺序、无水平溢出                                  |
| 1440 | PASS：操作组、上传标题首行／日期地点同排、三列瀑布流、邀请按钮单行                 | PASS：宝宝空页、图集与管理空／加载／错误；处理和不可用缩略图卡片内边距 | PASS：取消聚焦标题、详情只读、筛选菜单边界、分页后顺序、无水平溢出；真实 API 角色变化与头像并发回收 |

## 失败、未覆盖与剩余风险

- 首次全量回归的家庭截图因已确认的单行按钮改动与旧基线不一致而失败；更新三张基线后，独立无更新标志的三视口复跑通过。加入日期动态文字已遮罩，避免每日快照漂移。
- 首次连通性测试遗漏 `E2E_API_BASE_URL`，属于运行参数缺失；配置该测试要求的本地 API URL 后 3 passed。
- 本地自动化只证明 Windows Chromium 三视口，远端 CI 使用 GitHub Actions Ubuntu/Chromium；不证明 Safari、Firefox 或真实移动设备。预览不可用由浏览器 API 拦截模拟，未在真实存储故障中拍摄三视口截图；既有签名链接自然到期边界保持原 Plan E 说明。
- `67e6e0b` 的第一次聚合回归被 Prettier 正确拒绝；格式化后形成 `8fc5398` 并重新绑定 Review、重建运行栈及复跑独立 Regression，因此旧候选结果没有被沿用为最终候选证据。
- [PR #25](https://github.com/cullenmarcels/baby_growth_gallery/pull/25) 的首次 Head 与最终 Head 检查均通过；最终 Head 已集成到 `develop`，精确 merge commit 的 push CI 和本地独立集成复验也已通过。未执行 `develop → release → master → main` 晋升，也未创建发布 Tag。
