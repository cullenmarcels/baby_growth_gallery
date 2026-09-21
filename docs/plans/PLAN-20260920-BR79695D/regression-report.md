---
id: PLAN-20260920-BR79695D-REGRESSION
type: regression_report
title: "Plan F Regression"
status: passed
created_at: 2026-09-20T15:37:48+08:00
updated_at: 2026-09-21T15:30:00+08:00
plan_id: PLAN-20260920-BR79695D
phase: candidate
reviewed_commit: aacf33644f5b487f7c5971618c478ba1da3d2bab
reviewed_scope_digest: 94EFC4E2AB98BD53E53719F9A72380D9FB019DEA4D76C9A109849E974872FE13
ci_status: pending
related_ids: [PLAN-20260920-BR79695D, SPEC-20260920-QQ9SQ9VT, DES-20260920-SAX3DM0H]
supersedes: []
superseded_by: []
---

# Regression Report

## 候选结论与影响范围

独立 Regression 绑定最终产品候选 `aacf33644f5b487f7c5971618c478ba1da3d2bab` 与 v2 owned-scope 摘要 `94EFC4E2AB98BD53E53719F9A72380D9FB019DEA4D76C9A109849E974872FE13`。该候选以 `origin/develop@77c602c58f7f266e4fbee979b21e82b5de7b8085` 为基线，未推送，远端 CI 保持 `pending`。

最终完整 Playwright 共 69 项：`38 passed`、`31 skipped`（按项目条件跳过）、`0 failed`。Plan F 的两个 API 故事只在 `chromium-1440` 执行，因为接口契约与视口无关；照片、宝宝和认证的三视口响应式故事仍按 375／834／1440 执行。下表按实际影响范围选择回归对象。

| 既有能力／依赖 | 选择依据 | 独立检查和结果 |
| --- | --- | --- |
| 数据模型与迁移 | 新增里程碑表、枚举、唯一约束、索引、级联和动态清理。 | 现有数据库成功应用 `20260920154500_baby_milestones`，`prisma migrate status` 为 up to date；临时空库从全部 7 个 migration 成功应用，验证后删除。 |
| 里程碑 API 与权限 | 新增模板、列表、概览、详情、创建、编辑、完成、撤销、删除和照片关联端点。 | API 7 suites / 62 tests 通过；边界包括模板重复、日期、游标、照片数量、角色变化、跨家庭／宝宝、版本冲突和读写隔离。 |
| OpenAPI 与生成客户端 | DTO 判别联合、错误码、游标和接口签名被扩展。 | OpenAPI 导出和生成客户端通过；`packages/api-client` typecheck 通过，客户端类型来自生成产物。 |
| 混合时间轴与家庭动态 | 照片与已完成里程碑共用分页排序，撤销／删除会退出时间轴，动态需墓碑化。 | 时间轴 v1/v2 游标、同日排序、分页无重复／遗漏、完成／撤销和照片拍摄日重排场景通过。 |
| 照片关联与生命周期 | 里程碑选择已发布照片，照片回收同步清理头像和关联；恢复不自动关联。 | 照片回收、恢复、头像和里程碑关联场景通过；并发锁顺序问题修复后定向场景 1 次加串行重复 3 次通过。 |
| Web 里程碑流程 | 新增列表、概览、提醒、模板／自定义创建、详情、完成、编辑、撤销、删除和照片选择。 | Web 9 files / 55 tests 通过；错误中文映射、分页失败保留已加载内容、签名失效恢复、焦点和 aria-live 场景通过。 |
| 既有认证、宝宝与照片能力 | 应用路由、当前宝宝、发布照片、图集、详情、头像、回收和家庭权限被共享。 | 完整 Playwright 69 项中既有认证、宝宝、照片和响应式故事按项目条件执行；最终 38 passed、31 skipped、0 failed。 |
| 响应式与可访问性 | 新页面使用应用壳、移动底栏、卡片网格、对话框和所有操作按钮约束。 | Windows Chromium 375／834／1440 覆盖正常、空、加载、错误、只读、冲突、键盘、焦点恢复、无横向溢出和按钮单行。 |

## 独立执行结果

- 最终候选完整 Playwright：69 项中 38 passed、31 按项目条件跳过、0 failed。Plan F 两个 API 故事只运行 chromium-1440；三视口照片／宝宝／认证故事仍运行并通过。
- `pnpm validate`：照片依赖、ESLint、Prettier、类型检查、branch-flow 5 项、API 7 suites / 62 tests、Web 9 files / 55 tests、build 和项目校验全部通过，终值为 `PROJECT_VALIDATION=PASSED`。
- OpenAPI 导出、生成客户端和客户端类型检查通过；现有库 migration up to date，临时空库的 7 个 migration 全部应用成功后删除。
- 独立回归首轮复用 Redis 前缀，触发 `429`，随后注册页面连锁失败；改用独立 Redis 前缀后仍观察到并发请求 `500`。复核确定根因为头像设置和照片回收的锁顺序反转：头像设置按照片→宝宝，照片回收按宝宝→照片。Development 在 `aacf336` 将头像设置统一到 `Membership→宝宝→照片`，并更新单元测试；定向场景 1 次及串行重复 3 次均通过，最终全量回归全绿。
- Docker Desktop 的 broken `sailor-ingest` socket 通过保留运行时备份并重建 `run` 目录恢复；备份位于 `C:\Users\Marce\AppData\Local\Docker\run.codex-backup-20260921-100037`，不属于仓库交付物。
- 一次聚合 `validate` 因系统嵌套 pnpm 11.19 与 Node 24.19 engine 不符失败；首次临时 shim 写入字面换行，未真正执行子命令，该结果作废；修正 shim 后真实 `pnpm validate` 通过。两次失败均保留在 Execution Log，不计入最终通过结果。

## 视口 × 状态矩阵

| 视口 | 正常流程 | 空／加载／错误／冲突 | 权限、键盘与边界 |
| --- | --- | --- | --- |
| 375 | PASS：单列清单、概览、提醒、创建、详情和照片选择；移动底栏不遮挡最后一项和确认操作。 | PASS：空清单、首屏加载、分页失败、网络错误、预览失效和并发冲突保留正文并显示中文状态。 | PASS：成员只读、作者管理、Tab／Shift+Tab、Enter／Space、Escape、焦点恢复、按钮单行、无横向溢出。 |
| 834 | PASS：双列自适应里程碑卡片、模板／自定义创建、完成及照片选择。 | PASS：概览、提醒、列表和详情的空／加载／错误／分页失败状态通过。 | PASS：焦点可见、对话框焦点约束、角色变化、长标题截断和长说明换行通过。 |
| 1440 | PASS：桌面导航、进度／提醒概览、多列卡片、混合时间轴、真实 API 角色流程。 | PASS：跨家庭／宝宝隔离、游标边界、状态冲突、签名失效恢复和照片生命周期通过。 | PASS：OWNER/ADMIN 全量管理、作者管理自身、其他成员只读；按钮等高、文案单行、无溢出。 |

## 未覆盖项与剩余风险

- 自动化证据只证明 Windows Chromium 三视口，不声称 Safari、Firefox 或真实移动设备；Plan F API 故事按项目配置只在 1440 执行。
- 远端 CI 尚未因功能分支未推送而运行，`ci_status=pending`；不把其作为本地 Regression 通过证据。
- 构建只出现 Vite 单 chunk 大于 500k 的 warning，以及 libphonenumber JSON 弃用 warning；两者不影响本候选通过，也未被隐藏为失败。

## 结论

候选 Regression `passed`，没有剩余阻断风险，Plan 可以进入 `acceptance_pending`，等待用户人工验收。集成提交、远端 CI、集成 Regression、推送和归档仍未执行。
