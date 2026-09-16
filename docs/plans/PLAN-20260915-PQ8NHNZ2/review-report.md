---
id: PLAN-20260915-PQ8NHNZ2-REVIEW
type: review_report
title: "多宝宝档案基础 Review"
status: passed
created_at: 2026-09-15T10:21:58+08:00
updated_at: 2026-09-15T16:05:41+08:00
plan_id: PLAN-20260915-PQ8NHNZ2
repository_mode: git_remote
reviewed_commit: 5fdb3cfd89c4569f509e15788bc398a991836901
reviewed_scope_digest: DCDF8DD68C6FC840A4A1B00CF64CCFF63B5FA2D1001E310A2A51B832C7C6024E
ci_status: passed
related_ids: [PLAN-20260915-PQ8NHNZ2, SPEC-20260915-8RKJ7RGM, DES-20260915-S2PV4FM8]
supersedes: []
superseded_by: []
---

# Review Report

## 结论

`PASS`。Review 绑定已提交候选 `5fdb3cfd89c4569f509e15788bc398a991836901`，按 `scope_digest_version: 2` 对 Plan `owned_paths` 重算为 `DCDF8DD68C6FC840A4A1B00CF64CCFF63B5FA2D1001E310A2A51B832C7C6024E`。64 条固定 Rule 均为 `PASS` 或有触发条件依据的 `NOT_APPLICABLE`，无 `FAIL`/`UNVERIFIED`。

本结论只覆盖 feature 候选的代码、文档和候选前验证。PR #23 的证据 Head `04427e7883521e8bf290076486b51608945af985` 上，`branch-flow-develop`、`quality`、`e2e-auth` 均已通过；记录本结果的最终证据提交会重新触发检查，仍须以最终 PR Head 的实时状态为准。Review 不替代独立 Regression、用户试玩、PR 合并授权或集成复验。

## 需求、实现与安全核对

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 数据模型与 migration | PASS | 新增 `BabyProfile`、性别/生命周期 enum、家庭级联与创建成员 Restrict 外键、归档一致性 check 和查询/清理索引；既有库升级、空库全量 deploy、家庭级联实测通过。 |
| 权限与隔离 | PASS | Policy 集中要求 ACTIVE Membership；OWNER/ADMIN 管理，MEMBER 只读/切换；所有 baby 查询同时限制 `familyId`，未加入或跨家庭统一 404。 |
| 当前宝宝 Session | PASS | `activeBabyId` 仅写入 Redis Session；登录、会话恢复、家庭切换、宝宝切换和归档后均重新校验并按 `(createdAt DESC,id DESC)` 回退。 |
| 生命周期与清理 | PASS | archive 原子写 `ARCHIVED/archivedAt/purgeAfter`，30 天内条件恢复；维护任务使用 PostgreSQL transaction advisory lock、批量锁定、`PURGING` 中间态和条件删除，真实 SQL 实测只清理过期归档项。 |
| API 与客户端 | PASS | Zod/Swagger/OpenAPI/client 同步新增 create/list/get/update/activate/archive/restore；连续两次生成 SHA-256 相同。 |
| Web 与中文错误 | PASS | 创建、首页、查看/切换、编辑、归档确认、恢复和 MEMBER 等待状态均可达；全部异常通过 `userFacingError` 的 code→中文映射或中文兜底，不渲染原始英文 `detail/message`。 |
| 响应式与可访问性 | PASS | 375/834 使用紧凑头部/底栏，1440 使用桌面 Navbar；字段 label、错误摘要、`aria-live`、确认对话框、focus-visible、reduced-motion 和底栏安全间距沿用应用壳并通过浏览器流程。 |
| 回归与数据安全 | PASS | branch-flow 5、API 27、Web 23、Playwright 38 passed/19 designed skips；测试仅使用合成账号/家庭/宝宝，不提交 Cookie、Session、验证码、邀请码或真实儿童资料。 |

## UI 终端 × 状态矩阵

| 状态 | 375 | 834 | 1440 | 证据 |
| --- | --- | --- | --- | --- |
| 无宝宝且可创建 | PASS | PASS | PASS | 三视口真实创建流程；按角色显示创建入口。 |
| 无宝宝且 MEMBER 等待 | PASS | PASS | PASS | Web 组件测试覆盖只读等待文案；共享响应式路由。 |
| 创建/保存中与字段错误 | PASS | PASS | PASS | RHF/Zod、按钮禁用、错误摘要和生日上限；组件与三视口流程。 |
| 首页正常态与当前宝宝 | PASS | PASS | PASS | 创建后自动激活并进入 `/app/home`；Session/API E2E 复核。 |
| 多宝宝查看与切换 | PASS | PASS | PASS | 生成客户端、Session service 和浏览器切换入口共用 family-scoped query key。 |
| 编辑与并发状态变化 | PASS | PASS | PASS | 管理表单、中文 409 映射和成功后缓存刷新。 |
| 归档确认/取消/成功 | PASS | PASS | PASS | 复用键盘可操作 ConfirmDialog；API 证明归档当前宝宝后确定性回退。 |
| 30 天内恢复/过期 | PASS | PASS | PASS | 单元测试边界、真实维护 SQL 和中文 `BABY_RESTORE_EXPIRED`。 |
| 加载/网络错误/权限不足 | PASS | PASS | PASS | Baby Entry/Home/Manage 均有加载、重试或中文错误出口；MEMBER 403 由 API/E2E 覆盖。 |
| 导航与无横向溢出 | PASS | PASS | PASS | 三视口完整 E2E 通过，移动底栏不遮挡创建流程。 |

## 规则符合性

| Rule | 结果 | Review 证据 |
| --- | --- | --- |
| `SRC-001` | PASS | 开始前读取 AGENTS、Docs/Rules Index、Family 基线、active Rules 与 Plan 文档。 |
| `SRC-002` | PASS | 用户确认、已实现事实、失败、环境恢复和最终验证分层记录。 |
| `SRC-003` | PASS | 由中央索引定位现行 Family Spec/Design 和归档 Plan，不以日期猜测权威性。 |
| `SRC-004` | PASS | 用户最新“确认”只授权已说明的 Docker 恢复；没有扩大产品范围。 |
| `SRC-005` | PASS | 本轮没有新的长期 Rule 候选；中文页面错误已由现行 `IMPL-007` 覆盖。 |
| `SRC-006` | NOT_APPLICABLE | 无需新增长期规则或向用户请求规则入库确认。 |
| `SRC-007` | PASS | 未把实现偏好提升为长期规则；测试隔离仅记录为 Plan scope。 |
| `SRC-008` | PASS | 不确定项通过既有 Spec、代码、migration 与实测澄清，无影响结果的未决问题。 |
| `SRC-009` | PASS | 严格区分本地、Docker、候选 commit 与尚未执行的 PR CI。 |
| `SRC-010` | PASS | 中央索引由脚本更新并通过项目校验。 |
| `REPO-001` | PASS | 修改前 clean；Docker 恢复未删除镜像、容器、卷或业务数据。 |
| `REPO-002` | PASS | 47 个候选文件全部落在 Plan owned paths；根配置扩大后再次确认无活动 Plan 冲突。 |
| `REPO-003` | PASS | 仅删除两个明确命名的任务临时数据库；损坏 Docker runtime 目录移动为可恢复备份。 |
| `REPO-004` | PASS | 无 dist、Playwright report、日志、secret、Cookie 或真实资料进入 Git。 |
| `REPO-005` | PASS | 数据库/API/client/Web/测试/Docs/索引作为一条影响链同步修改。 |
| `REPO-006` | PASS | 无 pull、merge、rebase、reset 或 force；普通 feature commit 未覆盖用户无关修改。 |
| `REPO-007` | NOT_APPLICABLE | 未修改已归档 Plan、Achievement、Ruleset 快照或归档哈希。 |
| `GIT-001` | PASS | preflight 确认真实根目录和 `git_remote` 模式。 |
| `GIT-002` | PASS | 固定 base、feature 分支、origin freshness 与 `origin/develop` 集成目标；提交后再次 fetch 验证。 |
| `GIT-003` | PASS | 开工前 clean；Review 绑定提交后 clean 的候选。 |
| `GIT-004` | PASS | State 固定 branch/base/target/owned paths/overlap 和 v2 digest。 |
| `GIT-005` | PASS | 扩大 `playwright.config.ts` 前后均确认无其他活动 Plan 路径重叠。 |
| `GIT-006` | PASS | reviewed commit 存在，digest 由 Git tree 与 owned paths 确定性重算。 |
| `GIT-007` | NOT_APPLICABLE | 尚未收到固定 PR Head 的人工验收。 |
| `GIT-008` | NOT_APPLICABLE | 尚未集成或归档。 |
| `GIT-009` | PASS | 当前仅本地 feature commit；尚未 push、merge 或改变远端引用。 |
| `GIT-010` | PASS | Docker 启动失败、Origin 混用失败、恢复方法和最终结果均保留，未静默写成 PASS。 |
| `BRANCH-001` | PASS | 工作分支是 `feature/baby-profile-foundation`，目标只允许 develop。 |
| `BRANCH-002` | PASS | 流向固定 feature → develop。 |
| `BRANCH-003` | NOT_APPLICABLE | 不涉及 develop→release→master→main 晋升。 |
| `BRANCH-004` | NOT_APPLICABLE | 不修改远端 Ruleset、审批数或 required checks。 |
| `BRANCH-005` | PASS | 未直接写 develop 或受保护分支。 |
| `BRANCH-006` | PASS | 分支从刷新后的精确 develop 基线创建。 |
| `BRANCH-007` | PASS | 本地 branch-flow 5 项通过；PR #23 证据 Head 的 `branch-flow-develop`、`quality`、`e2e-auth` 全部通过。 |
| `BRANCH-008` | NOT_APPLICABLE | 非长期分支晋升。 |
| `BRANCH-009` | NOT_APPLICABLE | 不发布、不创建产品 Tag。 |
| `BRANCH-010` | NOT_APPLICABLE | 不新增或修改 Ruleset。 |
| `IMPL-001` | PASS | Plan 固定 active Spec/Design 和 64 条规则；实现与默认决策一致。 |
| `IMPL-002` | PASS | 数据、Session、API、生成客户端、UI、测试和文档同步交付。 |
| `IMPL-003` | PASS | 未改历史冻结内容；使用新的 Spec/Design/Plan ID。 |
| `IMPL-004` | PASS | Execution Log 可重建预检、实现、失败、Docker 恢复、测试与候选形成过程。 |
| `IMPL-005` | PASS | migration、真实维护任务、Docker 和完整 E2E 通过后才形成 Review。 |
| `IMPL-006` | PASS | 未扩张到照片、头像、里程碑、成长数据、家庭删除或真实短信。 |
| `IMPL-007` | PASS | Baby 页面全部异常出口使用中文 code 映射/兜底，代码检索无原始错误渲染。 |
| `TEST-001` | PASS | Spec/Plan 为权限、Session、生命周期、三视口与迁移定义 automatic/review/regression 证据。 |
| `TEST-002` | PASS | 本表逐条覆盖全部 64 个固定 Rule ID。 |
| `TEST-003` | PASS | Review 后状态进入独立 Regression，不复用本结论。 |
| `TEST-004` | PASS | 每条检查使用 PASS/NOT_APPLICABLE，并给出触发和证据。 |
| `TEST-005` | PASS | 无 FAIL/UNVERIFIED；Docker 与测试环境问题解决后才继续。 |
| `TEST-006` | PASS | 回归矩阵包含 Plan A/B、权限、Session、维护、migration、OpenAPI、Docker 与三视口。 |
| `TEST-007` | PASS | 复用 Jest、Vitest、Playwright、Prisma 和 Docker，无新增依赖。 |
| `TEST-008` | PASS | 本报告只声称 candidate Review，Regression/integration 单独记录。 |
| `TEST-009` | PASS | 本地等价 CI 命令和 PR #23 证据 Head 三项 CI 全部通过；最终证据提交仍须再次成功。 |
| `TEST-010` | PASS | 只声称当前 Windows、Chromium、PostgreSQL/Redis/MinIO 与 Docker Desktop 实测结果。 |
| `RESP-001` | PASS | 375/834/1440 同期实现并在完整 E2E 验证。 |
| `RESP-002` | PASS | Baby 页面与 desktop/mobile 应用壳同一提交交付。 |
| `RESP-003` | PASS | 正常、无数据、加载、错误、权限、归档、恢复和并发冲突均有实现/测试。 |
| `RESP-004` | PASS | 本报告包含终端 × 状态矩阵。 |
| `RESP-005` | PASS | 沿用用户已确认的 1024px 断点和 375/834/1440 视口。 |
| `RESP-006` | PASS | CSS 使用流式布局和既有 tokens；浏览器断言无横向溢出。 |
| `SAFE-001` | PASS | 无密码、Session ID、Cookie、CSRF token、验证码、邀请口令或密钥进入仓库/证据。 |
| `SAFE-002` | PASS | 测试与视觉内容全部使用合成账号、家庭、称呼和宝宝昵称。 |
| `SAFE-003` | PASS | 服务端以 code 返回中性错误；跨家庭统一 404，Web 不显示英文 detail。 |
| `SAFE-004` | PASS | 维护日志只记录清理数量；失败日志不记录 Baby 字段、账号、Session 或秘密。 |

## 已处理发现与剩余风险

| 严重级别 | 发现 | 处理与复查 |
| --- | --- | --- |
| High | Docker Desktop 重复后台与损坏 AF_UNIX runtime socket 阻止数据库/完整栈验证。 | 经用户确认后关闭重复后台与 WSL，把四个 runtime 目录移动为可恢复备份；Engine、migration、维护 SQL、Docker E2E 和 readiness 全部复查通过。 |
| Medium | 聚合 E2E 使用同一 localhost IP 会触发生产语义正确的验证码限流。 | 测试运行使用独立 Redis key 前缀，并在显式 `TRUST_PROXY=1` 下使用文档保留网段合成 IP；产品阈值未修改，完整矩阵连续通过。 |
| Medium | 本地 5173 浏览器曾误连只允许 8080 Origin 的 Docker API。 | 停止 Docker API/Web 后让 Playwright 启动同源服务，完整 E2E 两次均 38/19/0；失败保留为调用环境证据。 |
| Low | Node/Jest 对 `libphonenumber-js` 的 JSON import 输出未来弃用预警。 | 这是 Plan A 固定依赖的上游兼容提示；当前 27 个 API 测试通过，不在 Plan C 越界升级依赖，后续依赖治理处理。 |
| Low | Web 生产 bundle 约 502 kB，Vite 输出 chunk 建议。 | 当前 build 与三视口性能路径可用；照片/时间轴模块加入前宜规划路由级 code splitting，本 Plan 不以无关重构扩大范围。 |

剩余产品边界保持明确：真实短信未接入、法律文本仍为草案、宝宝照片/里程碑/成长数据尚未实现。本候选不宣称已具备公开生产运营条件。
