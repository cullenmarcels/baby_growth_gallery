---
id: PLAN-20260920-BR79695D-REVIEW
type: review_report
title: "Plan F Review"
status: passed
created_at: 2026-09-20T15:37:48+08:00
updated_at: 2026-09-21T15:30:00+08:00
plan_id: PLAN-20260920-BR79695D
repository_mode: git_remote
reviewed_commit: aacf33644f5b487f7c5971618c478ba1da3d2bab
reviewed_scope_digest: 94EFC4E2AB98BD53E53719F9A72380D9FB019DEA4D76C9A109849E974872FE13
ci_status: pending
related_ids: [PLAN-20260920-BR79695D, SPEC-20260920-QQ9SQ9VT, DES-20260920-SAX3DM0H]
supersedes: []
superseded_by: []
---

# Review Report

## 结论与版本

最终产品候选为 `aacf33644f5b487f7c5971618c478ba1da3d2bab`，本报告绑定 v2 owned-scope 摘要 `94EFC4E2AB98BD53E53719F9A72380D9FB019DEA4D76C9A109849E974872FE13`。候选从已核验的 `origin/develop@77c602c58f7f266e4fbee979b21e82b5de7b8085` 建立，目标分支保持 `origin/develop`。

本地 Review 结论为 `passed`。66 个适用 Rule 全部为 `PASS` 或有明确理由的 `NOT_APPLICABLE`，没有 `FAIL` 或 `UNVERIFIED`。功能分支尚未推送，因此远端 CI 为 `pending`，不作为本地 Review 通过证据。

## 实现核对

| 核对项 | 结果 | 证据与结论 |
| --- | --- | --- |
| 模型与 migration | PASS | Prisma 增加 `Milestone`、`MilestonePhoto`、来源与状态枚举、模板唯一约束、照片级联和列表索引；现有库已应用 `20260920154500_baby_milestones`，空库从全部 7 个 migration 前向应用成功。 |
| 权限与并发 | PASS | 所有读取和写入重新校验 ACTIVE Membership、ACTIVE 宝宝、家庭归属和角色；作者与 OWNER/ADMIN 可管理，其他成员只读；写入按 Membership、宝宝、目标资源顺序加锁并以 `expectedVersion` 防旧页面提交。 |
| 模板、清单、提醒与进度 | PASS | 固定 12 项模板 key 和标题快照稳定；模板同一宝宝唯一且删除后可重新加入；进度只计算仍在清单中的项目；提醒只展示今天及未来日期，已过提醒仍保留原值。 |
| 照片生命周期 | PASS | 关联仅接受同家庭、同宝宝、已发布照片，按选择顺序去重且最多 10 张；照片回收同事务解除头像与里程碑关联，恢复不自动重建；宝宝永久清理将动态转墓碑并级联数据。 |
| 混合时间轴 | PASS | `PHOTO` 与 `MILESTONE` 判别联合按日历日期、记录时间、类型优先级和 ID 稳定排序；游标 v2 保存完整排序键并兼容照片 v1；撤销或删除的里程碑立即退出时间轴。 |
| OpenAPI 与生成客户端 | PASS | 时间轴联合 DTO 已加入 discriminator，接口、错误码和游标契约已重新导出，`packages/api-client` 由生成流程更新并通过 typecheck；客户端未手写重复接口类型。 |
| Web、响应式与可访问性 | PASS | `/app/milestones`、`/new`、`/:milestoneId` 覆盖列表、概览、编辑、完成、撤销、删除和照片选择；375／834／1440 分别使用单列、双列、桌面布局；按钮单行且同级 44px，弹层支持 Escape、焦点恢复、可见焦点和 `aria-live`。 |
| 文档与作用范围 | PASS | Plan F Spec、Design、Plan、State、Review、Regression、Acceptance、执行记录及索引相互链接；原 Plan D/E 归档不改；导航和生命周期证据不纳入产品 owned-scope 摘要，State 已收紧为产品与 `plan.md` 路径。 |

## 发现记录与复查

1. `12a1dfd864e3872d353828b2d77873ed76d543a4`（`12a1dfd`）形成初始产品候选，覆盖里程碑 API、迁移、OpenAPI/client、Web 页面、混合时间轴和基础 E2E。
2. `3c1e65c3fa89bde6a174f540147b8ee6ea805128`（`3c1e65c`）扩充 E2E 边界故事，覆盖模板唯一性、日期和照片关联边界及响应式流程。
3. 独立回归发现头像设置按“照片→宝宝”、照片回收按“宝宝→照片”的锁顺序反转，在并发场景会触发 Prisma 500。该发现返回 Development 修复，未沿用受影响的通过结论。
4. `aacf33644f5b487f7c5971618c478ba1da3d2bab`（`aacf336`）将头像设置统一为 `Membership→宝宝→照片`，与照片回收的锁顺序一致，并更新头像设置单元测试。定向并发场景执行 1 次，随后串行重复 3 次，均通过；最终 Review 对修复后的候选重新核对，没有阻断发现。

## 视口 × 状态矩阵

| 视口 | 正常布局与核心流程 | 空／加载／错误／冲突 | 权限、键盘与边界 |
| --- | --- | --- | --- |
| 375 | PASS：里程碑单列卡片、概览、清单与已完成列表、创建和详情操作；移动底栏不遮挡最后一项。 | PASS：空清单、初始加载、下一页加载失败、网络错误、照片预览失效和并发冲突均有中文状态。 | PASS：普通成员只读、作者管理、按钮单行、Tab／Shift+Tab、Escape、焦点恢复和无横向溢出。 |
| 834 | PASS：里程碑双列自适应卡片，模板／自定义创建和最多 10 张照片选择流程可用。 | PASS：概览、提醒、列表和详情的空／加载／错误／分页失败状态不丢已加载内容。 | PASS：可见焦点、对话框焦点约束、角色变化刷新和长说明换行通过。 |
| 1440 | PASS：桌面导航、进度与提醒概览、多列卡片、混合时间轴和照片详情入口通过。 | PASS：真实 API 角色、跨家庭／宝宝隔离、游标边界、签名失效恢复和版本冲突通过。 | PASS：管理员管理全部、作者管理自身、其他成员只读；按钮等高、文案单行、无横向溢出。 |

浏览器证据只声称 Windows Chromium 的 375、834、1440 三个视口；未把本次 Review 写成 Safari、Firefox 或真实移动设备验证。

## 固定规则逐条结果

| Rule | 结果 | 可核对证据或理由 |
| --- | --- | --- |
| SRC-001 | PASS | 开始前读取 AGENTS、Rules Index、Docs Index 和阶段菜单。 |
| SRC-002 | PASS | 将用户确认、实现事实、自动化结果和人工验收状态分开记录。 |
| SRC-003 | PASS | 通过索引读取当前有效 Plan F Spec、Design、Plan 和 Rules。 |
| SRC-004 | PASS | Plan D/E 归档事实保持不动，Plan F 单独承接新范围。 |
| SRC-005 | PASS | 识别此前单行按钮和同级按钮等高的长期界面约束。 |
| SRC-006 | PASS | Plan F 中的模板、提醒、照片关联和时间轴行为均有用户确认依据。 |
| SRC-007 | PASS | 本候选沿用已固定的规则版本，不把新规则写入历史归档。 |
| SRC-008 | PASS | 修改前核对代码入口、迁移、接口、Web、E2E 和文档范围。 |
| SRC-009 | PASS | 通过 fetch 精确核对 `origin/develop`；通用 preflight 的 upstream 未配置如实保留为 unverified。 |
| SRC-010 | PASS | 文档索引由项目生成与检查脚本核对，入口与状态保持一致。 |
| REPO-001 | PASS | 其他操作者的现有修改未被撤销或覆盖，证据变更限于 Plan F 文档范围。 |
| REPO-002 | PASS | 代码、迁移、测试、OpenAPI/client、Web 和证据均属于确认的 Plan F 范围。 |
| REPO-003 | PASS | 未执行 reset、强制覆盖或不可恢复的仓库操作。 |
| REPO-004 | PASS | 候选不含密钥、个人隐私、构建产物、截图缓存或无关临时文件。 |
| REPO-005 | PASS | 候选提交、差异、摘要和文档文件清单均已核对。 |
| REPO-006 | PASS | 未改写 Plan D/E 归档、develop 历史或其他 Plan 的事实。 |
| REPO-007 | PASS | Docker 运行时恢复使用可保留备份，项目内没有新增环境凭据或本地数据。 |
| GIT-001 | PASS | preflight 确认真实 Git 根目录和 git_remote 模式。 |
| GIT-002 | PASS | fetch 后精确目标为 `origin/develop@77c602c`；功能分支无 upstream，通用 preflight 的 unverified 状态如实记录。 |
| GIT-003 | PASS | 候选修改前检查路径重叠和工作区状态，产品代码在已提交候选中；证据文件单独登记。 |
| GIT-004 | PASS | State 固定基线、分支、`origin/develop` 集成目标、owned_paths 和无重叠 Plan。 |
| GIT-005 | PASS | 活动 Plan 路径扫描无未协调重叠；导航和生命周期文档不进入产品摘要。 |
| GIT-006 | PASS | Review 与 Regression 均绑定已提交候选 SHA 和可重算 v2 摘要。 |
| GIT-007 | NOT_APPLICABLE | 用户人工验收尚未发生，accepted commit 和摘要按要求保持 null。 |
| GIT-008 | NOT_APPLICABLE | 尚未进入集成或归档阶段，integrated commit 和摘要按要求保持 null。 |
| GIT-009 | PASS | 未推送、未创建 PR、未合并；fetch 仅用于远端预检且结果如实记录。 |
| GIT-010 | PASS | 远端 CI pending、upstream 未配置和首次环境失败均单独标记，没有静默写成通过。 |
| BRANCH-001 | PASS | 工作发生在 `feature/baby-milestones`，集成目标仍为 `origin/develop`。 |
| BRANCH-002 | PASS | 未越过 feature→develop 的集成流向，develop 未被本地写入。 |
| BRANCH-003 | NOT_APPLICABLE | 本阶段未更新 release、master 或 main。 |
| BRANCH-004 | NOT_APPLICABLE | 未修改分支保护或 PR 检查设置。 |
| BRANCH-005 | PASS | `origin/develop` 未改写，候选基于其精确基线且保持祖先关系。 |
| BRANCH-006 | PASS | 从已核验 develop 创建并持续使用 Plan F 功能分支。 |
| BRANCH-007 | PASS | 本地 branch-flow 5 项通过；远端分支尚未推送，远端检查保留 pending。 |
| BRANCH-008 | NOT_APPLICABLE | 未执行长期分支晋升或合并。 |
| BRANCH-009 | NOT_APPLICABLE | 未在 main 创建发布点或 Tag。 |
| BRANCH-010 | PASS | 分支治理规则和已归档治理证据未被修改。 |
| IMPL-001 | PASS | 实现对齐 Plan F Spec、Design、接口、生命周期和固定模板规则。 |
| IMPL-002 | PASS | migration、API、OpenAPI/client、Web、E2E、文档和索引保持同步。 |
| IMPL-003 | PASS | 原 Plan D/E 冻结与归档文件未改，新增能力只写入 Plan F 范围。 |
| IMPL-004 | PASS | Execution Log 记录候选、失败、修复、环境恢复、Review 和 Regression。 |
| IMPL-005 | PASS | Review 依据已提交候选和可重放验证，不把未提交工作区当证据。 |
| IMPL-006 | PASS | 错误码、权限、分页、锁顺序和 DTO 均有稳定实现与测试覆盖。 |
| IMPL-007 | PASS | 页面使用已确认的短中文操作文案，操作按钮保持单行与 44px 层级。 |
| TEST-001 | PASS | 计划内 API、Web、E2E、migration、OpenAPI/client 和三视口条件均有验证。 |
| TEST-002 | PASS | 本表逐条列出 Plan 固定的全部 66 个 Rule ID。 |
| TEST-003 | PASS | Regression 使用独立报告、独立 Redis 前缀和最终候选重新执行。 |
| TEST-004 | PASS | 每条规则给出 PASS 或合法 NOT_APPLICABLE 及具体理由。 |
| TEST-005 | PASS | 没有 FAIL 或 UNVERIFIED；未将远端 CI pending 当作本地通过。 |
| TEST-006 | PASS | 回归范围由迁移、权限、照片、宝宝、时间轴、客户端和响应式依赖推导。 |
| TEST-007 | PASS | 使用现有 Vitest、Playwright、ESLint、Prettier、TypeScript、migration 和项目脚本。 |
| TEST-008 | PASS | Review、候选 Regression 与未来集成复验分别记录，未互相替代。 |
| TEST-009 | NOT_APPLICABLE | 尚未进入集成归档，不执行集成提交复验；Acceptance 保持 pending。 |
| TEST-010 | PASS | UI 结论限定为 Windows Chromium 375／834／1440，不扩张为跨浏览器或真机。 |
| RESP-001 | PASS | 同一候选覆盖 375、834、1440 三个视口。 |
| RESP-002 | PASS | 移动单列、平板双列、桌面多列及底栏规则均在同一实现和测试中保持一致。 |
| RESP-003 | PASS | 正常、空、初始加载、分页失败、网络错误、只读和冲突状态均有证据。 |
| RESP-004 | PASS | 视口与状态矩阵逐项记录本次实现覆盖和验证边界。 |
| RESP-005 | PASS | 卡片、按钮、焦点、弹层和移动底栏遵循已确认的尺寸与间距设计。 |
| RESP-006 | PASS | 长标题、说明、照片预览和错误状态在各断点换行或截断正确，无横向溢出。 |
| RESP-007 | PASS | 操作按钮文案单行且不超过五个中文字符，同级按钮以 44px 为基准。 |
| SAFE-001 | PASS | 候选未加入密钥、令牌或真实账号数据。 |
| SAFE-002 | PASS | E2E 使用合成家庭、宝宝、照片和里程碑数据，未写入真实隐私资料。 |
| SAFE-003 | PASS | 预览继续使用短时私有 THUMBNAIL 签名，不返回对象 Key 或长期 URL。 |
| SAFE-004 | PASS | 变更范围内没有疑似真实秘密；Docker 备份路径不在仓库且不含项目凭据。 |
| SAFE-005 | PASS | 家庭／宝宝／照片隔离、角色变化、回收解除和并发锁顺序均完成服务端复核。 |

## 后续门禁

Review 已通过，允许依照阶段规则进入独立 Regression。用户人工验收、功能分支推送、PR 创建、合并、集成提交复验和归档仍分别等待授权；本候选没有远端 CI 通过证据。
