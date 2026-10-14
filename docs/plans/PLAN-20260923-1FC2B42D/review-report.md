---
id: PLAN-20260923-1FC2B42D-REVIEW
type: review_report
title: 照片详情上传者修订 Review
status: passed
created_at: 2026-09-28T17:04:57+08:00
updated_at: 2026-10-14T14:02:10+08:00
plan_id: PLAN-20260923-1FC2B42D
repository_mode: git_remote
reviewed_commit: e6c67158fac997e7be6236149a4b2cf9a58ad582
reviewed_scope_digest: 7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850
ci_status: passed
related_ids: [PLAN-20260923-1FC2B42D, SPEC-20260923-Y0XZXEM0, DES-20260923-M1TKDS56]
supersedes: []
superseded_by: []
---

# Review Report

## 候选与结论

Review 绑定本地候选 `e6c67158fac997e7be6236149a4b2cf9a58ad582`，按 Plan `owned_paths` 以 v2 算法重算的 scope digest 为 `7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850`。候选基于 `99d0adc02aa01572601e58f4fa03ea936ce6488f`；本轮已 fetch 并核实 `origin/develop` 与该基线一致，ahead/behind 为 0。工作分支为 `feature/photo-browse-experience-revision`。候选之后工作树仅有被替代 Plan 的五份旧文档未提交，均在当前 Plan scope 之外；本报告不以这些工作树内容作为候选证据。

结论：`passed`。实现、契约、测试、响应式 UI 与文档相互一致；未发现阻断或需修复项。远端 CI 因功能分支未推送而为 `pending`，不是本地 Review 通过依据；本次未执行任何远端写入。

## 实现核对与发现

- DTO/OpenAPI：`PhotoUploaderDto` 仅含 `displayName`；已发布图集页、时间轴照片项和已发布照片详情使用 `PublishedPhotoSummaryDto`。草稿、批次、管理列表、相邻照片契约维持原 DTO。服务只选择创建 Membership 的显示名，映射不扩散账户、Membership、手机号或角色信息；未增加数据库结构。
- 来源路由：卡片明确发出 `gallery`/`timeline`，里程碑详情照片携带里程碑 UUID；详情解析对重复 `from`、未知来源、非法/重复里程碑 ID 和不匹配参数回退图集，并仅构造白名单目标。相邻照片传播已解析来源。未使用浏览器历史，服务端邻接排序未变。
- 上传者 UI：共用照片卡片按 code point 截断为 15 字加 `…`，完整名称保留于 `title`/`aria-label`；详情在标题之后以只读完整文本显示，编辑态仍呈现。CSS 将卡片上传者行约束为右对齐单行并截断，详情允许完整名称换行。
- 权限与既有行为：发布状态和家庭/宝宝范围过滤、照片管理能力、私有签名预览、分页游标、相邻顺序及混合时间轴排序保持原逻辑；没有新增迁移或管理权限。
- 测试和资料：API/Web/E2E 均新增相应契约断言；Spec、Design、Plan、Execution Log 和 INDEX 已同步。生成区块由索引生成器更新，归档 Plan E、Plan F 的历史包未修改。

发现清单：无。已复核未发现需返回 Development 的缺陷。

## 视口与 UI 状态矩阵

| 视口      | 图集、时间轴、详情正常状态                                  | 加载、空、错误与失效状态                                        | 键盘、焦点与布局                                                               |
| --------- | ----------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 375×812   | PASS：照片 E2E 响应式流程通过，照片卡片与来源详情链接可用。 | PASS：沿用既有加载、空、错误和回收状态实现；定向 Web 测试通过。 | PASS：上传者单行截断断言及无横向溢出断言通过，Tab/Enter 卡片导航保持链接语义。 |
| 834×1112  | PASS：平板视口照片浏览与详情 E2E 通过。                     | PASS：既有状态组件未改变，相关组件测试通过。                    | PASS：响应式照片流程通过，卡片元数据宽度受容器约束。                           |
| 1440×1000 | PASS：桌面图集、时间轴、详情和里程碑照片来源 E2E 通过。     | PASS：API/组件状态与原权限和私有预览路径保持不变。              | PASS：返回与相邻照片使用锚点链接并保留可见焦点；长上传者不改变卡片点击目标。   |

矩阵依据：候选分支 `photo.spec.ts` 与 `milestone.spec.ts` 的 Chromium 运行、Web 定向组件测试、CSS/DOM Review。实测平台仅为 Windows Chromium；未声称 Safari、Firefox 或真实移动设备已验证。E2E 汇总 6 passed / 6 skipped；跳过项按项目 viewport/API 条件配置执行，不将 skipped 计为 passed。

## 固定规则逐条符合性矩阵

状态为 PASS 或 NOT_APPLICABLE 的适用项均给出核对依据；无 FAIL/UNVERIFIED。

| Rule ID    | 结果           | 证据 / 理由                                                                     |
| ---------- | -------------- | ------------------------------------------------------------------------------- |
| SRC-001    | PASS           | 本阶段已读取 AGENTS、Rules Index、Docs Index 和 Review 菜单。                   |
| SRC-002    | PASS           | 报告区分本地候选、远端 CI pending 与用户人工验收待办。                          |
| SRC-003    | PASS           | 以 Docs Index 确定本 Plan 的 active Spec/Design 与被替代历史。                  |
| SRC-004    | PASS           | 原 Plan E/F 归档保持不变；承接和替代关系在新 Plan 留证。                        |
| SRC-005    | PASS           | 执行记录包含修改前 Rule 候选检查；未发现需新增长期 Rule 的候选。                |
| SRC-006    | NOT_APPLICABLE | 本次无待确认 Rule 候选，不触发等待入库门禁。                                    |
| SRC-007    | PASS           | 未新增或擅自激活 Rule。                                                         |
| SRC-008    | PASS           | 通过 DTO、服务、路由和测试核实可发现事实后形成结论。                            |
| SRC-009    | PASS           | 报告记录本地 HEAD、已验证远端基线和集成目标；未将 feature 说成已集成。          |
| SRC-010    | PASS           | INDEX 由 `update-indexes.ps1` 生成并校验。                                      |
| REPO-001   | PASS           | 旧 Plan 五份非所有权文档未暂存、未提交、未改写；工作树其他变更保留。            |
| REPO-002   | PASS           | 26 个候选路径全部属于本 Plan `owned_paths`。                                    |
| REPO-003   | NOT_APPLICABLE | 本候选未删除、移动或覆盖既有归档内容。                                          |
| REPO-004   | PASS           | 候选无缓存、构建产物或临时日志。                                                |
| REPO-005   | PASS           | 候选文件与 Plan 所有权清单逐项核对，未发现越界。                                |
| REPO-006   | NOT_APPLICABLE | 提交前未执行同步、切换、重置或清理；只读 fetch 已记录。                         |
| REPO-007   | PASS           | 已归档 Plan/ Achievement/Rules 未改；项目归档校验通过。                         |
| GIT-001    | PASS           | repository preflight 识别为 `git_remote`，根目录为本工作区。                    |
| GIT-002    | PASS           | fetch 后 `origin/develop`、基线和本地候选父提交核实；freshness 为 verified。    |
| GIT-003    | PASS           | 提交前仅 staged 本 Plan owned paths；五个旧 Plan 非所有权文件保留为 untracked。 |
| GIT-004    | PASS           | State 固定远端、目标、分支、基线和 owned paths。                                |
| GIT-005    | PASS           | `overlapping_plan_ids` 为空；被替代 Plan 不再活动且旧 scope 文件未混入。        |
| GIT-006    | PASS           | 本报告绑定已提交候选与可重算的 v2 digest。                                      |
| GIT-007    | PASS           | Acceptance Record 保持 pending；未记录未经用户提供的接受证据。                  |
| GIT-008    | PASS           | 没有生成 Achievement；集成与集成复验仍在未来阶段。                              |
| GIT-009    | PASS           | 用户授权仅限一个本地候选提交；无 push、PR、merge、promotion 或 archive 操作。   |
| GIT-010    | PASS           | pnpm 引擎不匹配如实记为本地 shim 限制，改以直接工具运行；CI 为 pending。        |
| BRANCH-001 | PASS           | 候选留在 `feature/*` 功能分支，未改变长期分支职责。                             |
| BRANCH-002 | NOT_APPLICABLE | 未创建或合并 PR；正常目标保持 `develop`。                                       |
| BRANCH-003 | NOT_APPLICABLE | 未更新 release/master/main。                                                    |
| BRANCH-004 | NOT_APPLICABLE | 未配置或更改 GitHub PR 审批规则。                                               |
| BRANCH-005 | NOT_APPLICABLE | 未向 develop 直接推送。                                                         |
| BRANCH-006 | PASS           | 工作分支名符合 `feature/<topic>` 且基于 develop 已验证基线。                    |
| BRANCH-007 | NOT_APPLICABLE | 未创建 PR 或触发远端 branch-flow 检查。                                         |
| BRANCH-008 | NOT_APPLICABLE | 未晋升长期分支。                                                                |
| BRANCH-009 | NOT_APPLICABLE | 本 Plan 非发布操作。                                                            |
| BRANCH-010 | NOT_APPLICABLE | 未修改远端保护规则或分支治理配置。                                              |
| IMPL-001   | PASS           | Plan 固定并引用现行 Spec、Design 与 Rule 版本。                                 |
| IMPL-002   | PASS           | DTO、查询、OpenAPI/client、Web、E2E、资料和索引同步。                           |
| IMPL-003   | PASS           | 详情上传者扩展建立独立修订 Plan，未改写旧 Plan 冻结正文。                       |
| IMPL-004   | PASS           | Execution Log 可重建修改、环境偏差、验证和用户授权。                            |
| IMPL-005   | PASS           | 在结束 Development 前通过与风险相称的单测、类型、E2E 和项目校验。               |
| IMPL-006   | PASS           | 未新增权限、数据库结构、头像/角色/上传时间等非目标功能。                        |
| IMPL-007   | NOT_APPLICABLE | 本次没有新增或修改用户可见错误提示。                                            |
| TEST-001   | PASS           | 本 Plan 引用规则均有可核对验证方式；测试规则本身由现行体系定义。                |
| TEST-002   | PASS           | 本矩阵逐条覆盖 State 中全部固定 Rule IDs。                                      |
| TEST-003   | PASS           | Regression 独立报告和独立候选检查已形成。                                       |
| TEST-004   | PASS           | 所有规则与验证项均以 PASS/NOT_APPLICABLE/PENDING 标识且附理由。                 |
| TEST-005   | PASS           | Review 无 FAIL/UNVERIFIED；skipped 与 CI pending 明确披露，未冒充通过。         |
| TEST-006   | PASS           | Regression 按 API/DTO、客户端、路由 UI、权限、混合时间轴与 E2E 影响推导。       |
| TEST-007   | PASS           | 复用仓库 Jest、Vitest、Playwright、TS、生成器和校验器。                         |
| TEST-008   | PASS           | 本报告与候选 Regression 绑定候选；集成复验保留为后续独立门禁。                  |
| TEST-009   | PASS           | 远端 CI 未运行记为 pending；不构成已配置 CI 失败或通过。                        |
| TEST-010   | PASS           | 只声称 Windows Chromium 的已执行尺寸，不扩展到其他浏览器/平台。                 |
| RESP-001   | PASS           | 移动、平板、桌面三个目标尺寸均纳入自动化浏览。                                  |
| RESP-002   | PASS           | 卡片元数据与来源路由在同一实现中同步完成。                                      |
| RESP-003   | PASS           | 既有数据状态未改变，Web/API 定向测试覆盖正常、加载、空及错误行为。              |
| RESP-004   | PASS           | 上述视口×状态表记录适用 UI 覆盖和风险。                                         |
| RESP-005   | PASS           | 视口取自 Plan 验收要求，不将其声称为通用断点标准。                              |
| RESP-006   | PASS           | 上传者单行采用容器宽度和文本截断，没有新增固定卡片宽度。                        |
| RESP-007   | PASS           | 新增操作链接文案均来自用户确认规格；链接文本保持单行并测试返回语义。            |
| SAFE-001   | PASS           | 候选差异与报告未发现真实凭据。                                                  |
| SAFE-002   | PASS           | E2E 使用合成账号、家庭、成员和照片资料。                                        |
| SAFE-003   | NOT_APPLICABLE | 无需处理或持久化新增敏感个人字段；仅公开显示名。                                |
| SAFE-004   | NOT_APPLICABLE | Review 未发现疑似凭据或需限制披露的秘密。                                       |
| SAFE-005   | NOT_APPLICABLE | 未修改管理员限制、回收/恢复权限或其反转路径。                                   |

## Review 退出条件

- 规则矩阵：适用项均 PASS 或有理由的 NOT_APPLICABLE；无 FAIL/UNVERIFIED。
- 候选回归已独立运行并在 `regression-report.md` 记录；最初候选阶段 CI pending 为当时状态，不代表最终 CI。
- 人工验收于 `2026-10-14T09:49:50+08:00` 确认，并绑定候选提交与摘要。

## 最终集成 Review / CI 结果

- 产品候选 PR #27 已合并，集成提交为 `fd70c6b629fcd0696c8526dcae1b1ea83d6a3e34`；accepted/integrated v2 scope digest 一致。
- PR #28 的质量检查曾揭示历史计划文档未纳入原候选提交；五份既有文档按用户确认恢复，且仅三个 Markdown 文件做格式化。E2E 初始化失败由 PR #29 修复，没有改变原产品候选或其 owned-scope 内容。
- PR #29 的 branch-flow、quality 和 e2e-auth 均通过；合并后的 `develop` Quality run `38518835483` 的 quality 和 e2e-auth 均通过。GHCR 镜像启动、mc bucket 操作和完整 Playwright 流程均执行成功。
- 复核原接受摘要覆盖的产品与规格路径未改变；当前 develop 仍包含候选，最新集成摘要与接受摘要一致，无遗留 Review 阻断项。
