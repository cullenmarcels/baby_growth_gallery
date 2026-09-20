---
id: PLAN-20260918-RC0Y5QH3-EXEC
type: execution_log
title: 'Plan E 界面修订执行记录'
status: in_progress
created_at: 2026-09-18T14:37:52+08:00
updated_at: 2026-09-18T14:37:52+08:00
plan_id: PLAN-20260918-RC0Y5QH3
related_ids: [PLAN-20260918-RC0Y5QH3, DES-20260918-Y2GFD47V]
supersedes: []
superseded_by: []
---

# 执行记录

## 修改前门禁

- 本地 `feature/photo-gallery-timeline@d401a2d0d29fd9e3b0f71ffae815c3a307a72242`；原 Plan E 的集成目标固定为 `origin/develop@c0e2108226886183e35f6a9d1ae6f4075d15acb5`。普通沙箱的 `ls-remote` 因 GitHub 凭据不可用及连接重置失败；提升权限后 `ls-remote` 与 `repository-preflight.ps1 -Remote` 均确认远端该提交未变，且它是工作分支祖先。remote_freshness 更新为 `verified`。
- `repository-preflight.ps1 -AsJson` 为 git_remote、无阻断；工作区原有五处按钮单行改动，均为本任务此前明确要求并被本修订 Plan 纳入，不撤销。原 Plan E 状态转 `superseded`，活动 owned paths 不并行重叠。
- 已读取 AGENTS、Rules/Docs Index、Development/Review/Regression 菜单、原 Plan E、现行 Spec/Design 及相关实现和测试；适用八组 Ruleset，含新增 `RESP-007`。
- 用户原话明确要求按钮文案一行，超过五个字符由用户决定；本次计划再次固定规则更新和同级按钮等高，故不增加新长文案。

## 已实施

- 新建宝宝档案加入“取消”并返回管理页，空档案页可达，聚焦标题；编辑操作组去除主按钮的非对称上边距。
- 处理卡片标题独行、日期地点次行、四边 16px 内边距；顶部“我的上传”采用主操作视觉。管理列表改为按实测高度排布、保留 DOM 顺序的三／二／一列瀑布流，按照片宽高显示缩略图比例。
- Web 单测加入新建取消无提交与焦点断言；浏览器测试加入按钮高度、卡片字段/间距和瀑布流断言。此前五处未提交的单行按钮修改继续保留。
- 期间系统 `pnpm` 11.19.0/Node 24.19.0 不匹配仓库要求；使用 `corepack pnpm` 11.21.0 和本地已安装工具。Web 17 项定向单测、扩展后 Web 49 项测试、API 54 项、分支流向 5 项、Lint、Prettier、TypeScript 与构建通过。
- 本地 Docker Web 重新构建并健康运行；Chromium 375／834／1440 的宝宝档案取消、同级按钮边界、照片处理字段与内边距、管理瀑布流和加载更多全部通过。首次照片 E2E 发现两处测试定位错误（移动端单列宽度断言、路由正则误匹配 SPA 文档），修正后各三视口照片流程均通过。
- 本地候选 `5b0c0db0f798b42472e75bf13487372f2ae0e256` 已提交，含 25 个精确文件；随后单独的 1440 宝宝和照片 API／浏览器 E2E 4 项通过。进入 Review 前收紧 `owned_paths` 为产品与冻结设计/规则文件：`AGENTS.md`、`README.md`、`docs/INDEX.md` 及 Plan 状态/报告随生命周期变化，按计划维护并由校验器检查，不参与验收作用范围摘要；从此固定该摘要范围。
- 补充管理列表空、加载、错误的浏览器断言。首次复跑受共享 Redis 验证码限流影响，按原有测试办法以独立前缀重建本地 API，未调低产品限流；Chromium 375 单项通过，随后宝宝与照片 E2E 在 375／834／1440 合计 8 passed、4 设计性 skipped、0 failed。格式化新增测试后形成新候选；旧候选仅保留历史记录。
- Review 后第一次聚合 `pnpm validate` 的依赖、Lint、格式、类型、分支流向、API/Web 测试与构建均通过，最后文档门禁因动态 Plan 索引过期失败；生成索引后，`validate-project.ps1 -Check` 在配置 Git excludesFile 的环境中通过。无该环境配置的单次校验返回 `UNAVAILABLE`（沙箱无法读取用户 Git 全局 ignore），未算作通过。
- 独立认证／家庭 E2E 首轮 16 passed、14 设计性 skipped、3 failed；失败集中在旧家庭页三视口截图，旧图仍含两行邀请按钮。逐张检查新图布局正常后更新三张快照，并遮罩随日期变化的加入时间；定向快照生成检查 3 passed。新候选 `ea18019d59ad212338fba61b24e939bdad0ff630` 仅追加四份测试／截图文件，Review 重新绑定此候选与作用范围摘要；独立回归将不带更新标志复跑。
- `ea18019d` 的 E2E 分组复跑：认证／家庭 19 passed、14 skipped；宝宝／照片 8 passed、4 skipped；认证视觉 6 passed、状态页 9 skipped。连通性三视口首次因未传测试规定的 `E2E_API_BASE_URL` 失败，显式配置本地 API 地址后 3 passed；合计 36 passed、27 设计性 skipped。聚合 `pnpm validate` 在新候选上取得 `PROJECT_VALIDATION=PASSED`。
- 为直接覆盖处理卡片状态矩阵，新增浏览器模拟 `PROCESSING` 和安全缩略图不可用时四边 16px 的断言；375／834／1440 定向测试 3 passed。提交为最终候选 `26f15120e28edb4eec3179fe70512fa577f3a94d`，只增加照片浏览器测试；Review 重新绑定新 SHA／摘要，随后复核受影响回归。

## 候选结果与剩余门禁

- 最终本地候选 `26f15120e28edb4eec3179fe70512fa577f3a94d`，固定 v2 owned-scope 摘要 `150393DC7EC1C484BA91058AA4E922D4B56D704CC00B2F2C09D0D0A1689B682C`。逐条 66 条 Rule 的 Review 为 passed；独立 Regression 在 Review 重新绑定后，对最终候选再跑 `pnpm validate`，终值 `PROJECT_VALIDATION=PASSED`，并复跑受影响宝宝／照片 E2E 为 8 passed、4 设计性 skipped。全量分组 E2E 在相同产品代码树为 36 passed、27 设计性 skipped，环境参数与快照基线的首轮失败均已修复并记录。
- 用户对精确候选的人工验收、远端 PR／CI、推送、集成到 `origin/develop` 和集成提交复验仍待后续分别完成；本阶段不做发布分支晋升或归档。

## 图集瀑布流补充

- 用户在前一候选待人工验收期间明确要求“将图集模块也改成瀑布流形式”。该要求作为本修订 Plan 的新增范围记录，不改写冻结 `plan.md`；同步补充 Design，明确图集三／二／一列、照片宽高自然比例、实测卡片行跨度和顺序保持规则。
- `PhotoBrowse.tsx` 新增图集专用 `MasonryItem`，`PhotoBrowse.module.css` 新增图集三／二／一列网格；时间轴继续使用原有月份网格。图集单测新增照片宽高比例断言，浏览器测试新增横图／竖图／正方图、长内容、无重叠、列间距和键盘顺序断言。
- Web 单测 50 项、Web 类型检查、构建、Lint、Prettier 通过。当前浏览器进程在受限环境返回 `spawn EPERM`，重建 Docker Web 的自动审批额度也已耗尽，因此图集新增三视口 E2E 尚未运行；不把该项写成通过。图集变更提交后需重新执行三视口 E2E、Review、Regression 和项目校验。
- 本轮恢复本机浏览器和 Docker 权限后重建当前 Web。三视口 E2E 首次使用 `127.0.0.1` 时均在注册页前超时；直接请求确认该主机名在当前 Windows 环境返回 404，而 `localhost` 返回 200。改用 `STACK_BASE_URL=http://localhost:8080` 与 `E2E_API_BASE_URL=http://localhost:3000` 后，375／834／1440 的图集瀑布流流程 3 passed、0 failed。
- 完整 `pnpm validate` 首次被系统 pnpm 11.19.0／Node 24.19.0 的嵌套调用阻止；复用不入库的临时 Corepack pnpm 11.21.0 转发后，照片依赖、Lint、Prettier、类型、分支流向 5 项、API 54 项、Web 50 项、构建和项目校验全部通过，终值 `PROJECT_VALIDATION=PASSED`。
- 候选 Review 发现共享 `PhotoTile` 的自然宽高也作用于时间轴，会改变“时间轴保留原月份网格”的范围。实现改为仅图集传入自然比例，时间轴保持原固定 4:3，并在原时间轴单测中加入无内联比例断言。修复后 Web 50 项、类型检查通过；重建 Web 后三视口图集流程再次 3 passed、0 failed。前一提交 `0a9b1e5` 仅保留为 Review 中间证据，后续绑定修复后的候选。
- 独立 Regression 前的聚合验证发现 Review 修复文件未通过 Prettier，故 `67e6e0b` 不作为最终验收候选。使用仓库 Prettier 格式化两个文件，差异仅为等价单行排版；完整 `pnpm validate` 随后通过。格式化提交形成最终产品候选 `8fc539813c28d5f56e973f59eb6ff6eb11c86470`，v2 owned-scope 摘要更新为 `9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7`，Review 重新绑定后再执行独立 Regression。
- 最终候选 Review 绑定后，从当前代码树重建 Web，并用新的隔离 Redis 前缀重建 API；宝宝／照片三视口独立 Regression 为 8 passed、4 设计性 skipped、0 failed。聚合 `pnpm validate` 在同一产品代码树终值为 `PROJECT_VALIDATION=PASSED`。Plan 状态更新为 `acceptance_pending`，等待用户针对精确候选和摘要人工验收；未创建 PR、未推送、未合并。
- 用户于 `2026-09-20T13:32:50+08:00` 明确回复“验收通过”。验收记录绑定产品候选 `8fc539813c28d5f56e973f59eb6ff6eb11c86470` 与 v2 owned-scope 摘要 `9C500B481CC4770DB5EF3E3E8ABE808E391ECDE4C5CF447625F4DC01E688EAB7`。本次验收不推断远端刷新、推送、PR、合并或归档授权；Plan 转为 `integration_pending`，待后续分别处理。
