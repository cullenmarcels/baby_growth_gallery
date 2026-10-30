# Baby Growth Gallery — AI 项目入口

> 本文件是所有 AI 进入项目后的第一阅读入口。探索、扫描、核对、设计、编码或测试前，必须先读取本文件，再按下方索引定位资料。

## 1. 项目状态

- 项目为 PC、平板、移动端自适应网站；工程基础、分支治理与 Plan A–E 均已归档，现已具备私有照片直传、安全处理、家庭发布、回收站、图集、时间轴、照片详情与宝宝头像；后续阶段以已确认知识为准，持续交付可运行、可验证网站。

## 2. 权威性与冲突优先级

从高到低依次为：

1. 用户最新明确指令。
2. 本文件列出的强制规则和资料入口。
3. `rules/` 中的专项约束。
4. `docs/` 中已确认的产品、设计、架构和数据文档。
5. `tests/` 中的验收条件及自动化测试。
6. 现有实现代码、注释与历史惯例。
   发现冲突时，不得静默选择：采用更高优先级信息，并同步修正受影响的知识库或在结果中明确报告。

## 3. 根目录菜单

| 路径        | 用途                                         | 何时优先读取               |
| ----------- | -------------------------------------------- | -------------------------- |
| `AGENTS.md` | 总入口、资料地图、通用工作协议               | 每个任务开始时             |
| `docs/`     | 产品、页面、设计、组件、数据、架构与决策资料 | 理解需求或实现功能前       |
| `rules/`    | 跨文档的强制约束与专项规则                   | 修改相关领域前             |
| `agents/`   | AI 角色、任务模板、协作或执行说明            | 任务涉及对应角色时         |
| `tests/`    | 验收标准、测试代码、测试数据与质量核对       | 实现前确认预期，完成后验证 |
| `hooks/`    | 自动检查、辅助脚本与工作流钩子               | 执行或维护自动化流程时     |

## 4. 快速检索流程

1. 先读本文件，识别目标资料所在目录。
2. 运行 `hooks/repository-preflight.ps1` 确认真实根目录、仓库模式和本地状态；只有显式远端核对才使用 `-Remote`。
3. 读取 `rules/INDEX.md` 判断当前阶段，再按阶段菜单定位必读规则。
4. 使用 `rg --files` 获取文件清单；使用 `rg` 按页面名、功能名、组件名或关键词检索。
5. 只读取与任务直接相关的资料；遇到引用时再沿链接继续读取，不默认扫描历史归档。
6. 对照需求、规则、实现与测试，确认信息一致后再修改；找不到依据时标记“未定义”。

## 5. AI 执行规则

- 先核对资料、专项规则与验收标准；Git 模式固定 HEAD、分支、远端新鲜度、集成目标和 Plan `owned_paths`，阻断未解除不得修改。
- 修改前检查最新消息中的长期 Rule 候选；先只读探查并征求确认。确认后由 AI 自动分类、版本化、关联当前 Plan 并立即执行。
- 保留既有文件和用户修改，不撤销无关改动；不得写入密钥、令牌、个人隐私、构建产物或无关临时文件。
- 需求明确时直接执行；仅对会显著改变结果的歧义提问，合理假设须可追踪并及时替换。
- 网站实现同步检查桌面、平板、移动端；代码、配置、文档和测试保持一致。知识库不完善不能成为停止安全明确工作的理由。

## 6. 知识库维护规则

- 新资料按职责存放并使用稳定、可检索的文件名；文档说明适用范围、确认状态、核心规则和关联，避免重复事实。
- 新增重要资料须在本索引登记；替代文档须更新引用并删除或标记过期，避免并行真相。本文件保留入口与高层协议并控制在 100 行以内。

## 7. 资料索引

| 主题                                  | 入口文件                                                                                                                                                                                    | 状态                          | 用途                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 文档库操作协议                        | `docs/README.md`                                                                                                                                                                            | 已生效                        | 资料类型、编号、状态、冻结和归档规则                                                                              |
| 文档中央索引                          | `docs/INDEX.md`                                                                                                                                                                             | 已生效                        | 当前有效资料、计划进度和人工验收状态                                                                              |
| 开发规则操作协议                      | `rules/README.md`                                                                                                                                                                           | 已生效                        | 规则识别、生效、版本、归档和验证规范                                                                              |
| 开发阶段菜单                          | `rules/INDEX.md`                                                                                                                                                                            | 已生效                        | 按探查、规划、开发、Review、回归、验收定位规则                                                                    |
| Git 协作规则                          | `rules/modules/git-collaboration.md`                                                                                                                                                        | 已生效                        | 仓库模式、基线、并行范围、候选验收与集成归档                                                                      |
| 分支治理规则                          | `rules/modules/branch-governance.md`                                                                                                                                                        | 已生效                        | 分支角色、晋升链、PR 保护、审批和发布标记                                                                         |
| 自动验证入口                          | `hooks/validate-project.ps1`                                                                                                                                                                | 已生效                        | 聚合规则、文档、索引、归档哈希和仓库检查                                                                          |
| 首版 UI 设计基线                      | `docs/designs/DES-20260908-ZVZKM07B-baby-growth-ui/design.md`                                                                                                                               | 已生效                        | 设计来源、令牌、截图映射与未定义项                                                                                |
| 工程基础规格                          | `docs/specs/SPEC-20260908-5BD26QCA-project-foundation/spec.md`                                                                                                                              | 已生效                        | 技术栈、目录、公共接口、部署与安全边界                                                                            |
| 第一阶段 Plan                         | `docs/plans/PLAN-20260908-KP1B7472/plan.md`                                                                                                                                                 | 已归档                        | Git 基线、owned scope、验证与 PR 交付                                                                             |
| 第一阶段 Achievement                  | `docs/achievements/ACH-20260908-KP1B7472-project-foundation.md`                                                                                                                             | 已归档                        | 工程基础、验收、集成复验与完成证据                                                                                |
| 分支治理规格                          | `docs/specs/SPEC-20260909-ASMC5N7Z-branch-governance/spec.md`                                                                                                                               | 已生效                        | 五类分支、Ruleset、流向检查和 bootstrap 边界                                                                      |
| 分支治理 Plan                         | `docs/plans/PLAN-20260909-PCVDMF5G/plan.md`                                                                                                                                                 | 已归档                        | 治理文件、bootstrap PR、长期分支和远端保护                                                                        |
| 分支治理 Achievement                  | `docs/achievements/ACH-20260909-PCVDMF5G-branch-governance.md`                                                                                                                              | 已归档                        | 五层分支、Ruleset、目标隔离检查、验收与集成证据                                                                   |
| 认证交互补充设计                      | `docs/designs/DES-20260910-V9P4SBX8-auth-session-ui/design.md`                                                                                                                              | 已生效                        | 认证页面状态、三视口、键盘与错误行为                                                                              |
| 原认证会话规格                        | `docs/specs/SPEC-20260910-TAMMQYAH-auth-session/spec.md`                                                                                                                                    | 已替代                        | 旧 12 位密码策略及首轮候选历史依据                                                                                |
| 认证会话修订规格                      | `docs/specs/SPEC-20260910-VP1CDG7N-auth-session-password-revision/spec.md`                                                                                                                  | 已生效                        | 手机号、至少 6 位密码、Session、CSRF 与 API 契约                                                                  |
| 原认证会话 Plan                       | `docs/plans/PLAN-20260910-GK1XDGCG/plan.md`                                                                                                                                                 | 已替代                        | 原候选 Review 与替代链历史证据                                                                                    |
| 认证密码修订 Plan                     | `docs/plans/PLAN-20260910-JBD9BWHZ/plan.md`                                                                                                                                                 | 已归档                        | Plan A 修订、owned scope、Review/Regression、人工验收与集成证据                                                   |
| 认证会话 Achievement                  | `docs/achievements/ACH-20260910-JBD9BWHZ-auth-session-foundation.md`                                                                                                                        | 已归档                        | 账号、验证码、密码、Redis Session、响应式与 CI 完成证据                                                           |
| 家庭身份补充设计                      | `docs/designs/DES-20260911-9Z3KRKCQ-family-identity-ui/design.md`                                                                                                                           | 已生效                        | 家庭引导、应用壳、权限、邀请和动态响应式状态                                                                      |
| 家庭身份规格                          | `docs/specs/SPEC-20260911-3YV4GCRZ-family-identity/spec.md`                                                                                                                                 | 已生效                        | 多家庭、角色、单次邀请、Session 与活动契约                                                                        |
| 家庭邀请修订 Plan                     | `docs/plans/PLAN-20260911-JBANR2J8/plan.md`                                                                                                                                                 | 已归档                        | 中文错误、撤销确认及 Plan B 集成证据                                                                              |
| 家庭身份 Achievement                  | `docs/achievements/ACH-20260911-JBANR2J8-family-identity-foundation.md`                                                                                                                     | 已归档                        | 多家庭、成员权限、单次邀请、家庭动态及中文错误完成证据                                                            |
| 宝宝成长业务规格                      | `docs/specs/SPEC-20260915-8RKJ7RGM-baby-growth-mvp/spec.md`                                                                                                                                 | 已生效                        | 多宝宝、照片、里程碑、成长数据与首页闭环边界                                                                      |
| 宝宝成长补充设计                      | `docs/designs/DES-20260915-S2PV4FM8-baby-growth-mvp-ui/design.md`                                                                                                                           | 已生效                        | 多宝宝上下文、内容页面、三视口与完整状态                                                                          |
| 多宝宝档案 Plan / Achievement         | `docs/plans/PLAN-20260915-PQ8NHNZ2/plan.md` / `docs/achievements/ACH-20260915-PQ8NHNZ2-baby-profile-foundation.md`                                                                          | 已归档                        | 宝宝档案、当前宝宝 Session、归档恢复、清理与完成证据                                                              |
| 照片上传与回收权限 Plan / Achievement | `docs/plans/PLAN-20260917-ABAHN8QT/plan.md` / `docs/achievements/ACH-20260917-ABAHN8QT-photo-upload-foundation.md`                                                                          | 已归档                        | 私有直传、安全变体、草稿、发布、30 天回收及管理员回收优先；关联 `SPEC-20260917-NHHC01TR`、`DES-20260917-8EVTR3RJ` |
| 图集、时间轴与头像原 Plan E           | `docs/specs/SPEC-20260917-KSVSF8BN-photo-gallery-timeline/spec.md` / `docs/designs/DES-20260917-YQWSZG09-photo-gallery-timeline-ui/design.md` / `docs/plans/PLAN-20260917-K0AH0D6T/plan.md` | 已由修订 Plan 取代            | 已发布照片浏览、详情管理与宝宝头像的原候选及历史 Review/Regression 证据                                           |
| Plan E 照片浏览与界面修订             | `docs/plans/PLAN-20260918-RC0Y5QH3/plan.md` / `docs/achievements/ACH-20260918-RC0Y5QH3-photo-gallery-timeline-ui.md`                                                                        | 已归档                        | 图集、时间轴、照片详情、宝宝头像、档案操作、处理卡片及照片瀑布流；关联 `DES-20260918-Y2GFD47V` 与按钮单行规则 v2  |
| Plan F 成长里程碑                     | `docs/specs/SPEC-20260920-QQ9SQ9VT-baby-milestones/spec.md` / `docs/designs/DES-20260920-SAX3DM0H-baby-milestones-ui/design.md` / `docs/plans/PLAN-20260920-BR79695D/plan.md`               | 已归档：ACH-20260920-BR79695D | 共享清单、12 项模板、自定义里程碑、应用内提醒、照片关联与混合时间轴                                               |
| 照片浏览上传者与来源导航修订          | `docs/specs/SPEC-20260923-Y0XZXEM0-photo-detail-uploader/spec.md` / `docs/designs/DES-20260923-M1TKDS56-photo-detail-uploader/design.md` / `docs/plans/PLAN-20260923-1FC2B42D/plan.md` / `docs/achievements/ACH-20260923-1FC2B42D-photo-browse-experience.md` | 已归档                      | 卡片与详情上传者显示、图集/时间轴/里程碑来源感知照片详情返回；CI 镜像支持修复另见 PR #29 |

| Plan G 成长数据与回收站 | `docs/specs/SPEC-20261022-17HX5RTZ-growth-records/spec.md` / `docs/designs/DES-20261022-EM2SND6K-growth-records/design.md` / `docs/plans/PLAN-20261022-707KSVG3/plan.md` | 实施中 | 任意年龄测量、WHO 228 月参考、30 天回收与管理员彻底删除 |

执行任务时先用 `rules/INDEX.md` 定位阶段；进入 `docs/` 后读取 `docs/README.md` 和 `docs/INDEX.md`。不得仅按文件日期推断当前有效资料。

## 8. 完成前核对

- 是否读取入口和专项资料，并核实引用、事实与当前实现？
- 是否覆盖正常、空、加载、错误及必要边界状态；测试并检查桌面、平板和移动端？
- 是否同步文档与索引，并运行项目校验如实记录 unavailable / not_configured / unverified？
