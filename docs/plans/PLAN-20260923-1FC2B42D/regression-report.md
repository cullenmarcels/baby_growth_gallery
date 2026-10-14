---
id: PLAN-20260923-1FC2B42D-REGRESSION
type: regression_report
title: 照片详情上传者修订 Regression
status: passed
created_at: 2026-09-28T17:04:57+08:00
updated_at: 2026-10-14T14:02:10+08:00
plan_id: PLAN-20260923-1FC2B42D
phase: integrated
reviewed_commit: e6c67158fac997e7be6236149a4b2cf9a58ad582
reviewed_scope_digest: 7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850
accepted_commit: e6c67158fac997e7be6236149a4b2cf9a58ad582
accepted_scope_digest: 7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850
integrated_commit: fd70c6b629fcd0696c8526dcae1b1ea83d6a3e34
integrated_scope_digest: 7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850
ci_status: passed
related_ids: [PLAN-20260923-1FC2B42D, SPEC-20260923-Y0XZXEM0, DES-20260923-M1TKDS56]
supersedes: []
superseded_by: []
---

# Regression Report

## 候选与回归范围

独立候选 Regression 绑定候选 `e6c67158fac997e7be6236149a4b2cf9a58ad582` 和 v2 owned-scope digest `7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850`。候选基线为 `99d0adc02aa01572601e58f4fa03ea936ce6488f`；候选详细回归结果见下文。候选之后由 PR #27 合并，产品集成提交 `fd70c6b629fcd0696c8526dcae1b1ea83d6a3e34` 的 v2 digest 与已接受摘要一致。

本次影响包含照片发布/详情 DTO 查询、OpenAPI/client、卡片和详情路由、里程碑照片入口、照片/里程碑 E2E。按影响选择照片 API、上传契约、混合时间轴、里程碑照片关联、三来源路由、邻接浏览、三视口响应式和仓库文档校验；没有数据库结构变化，故无需 migration 回归。

## 集成回归与最终 CI

- PR #27（产品候选）已合并到 `develop`，合并提交 `fd70c6b629fcd0696c8526dcae1b1ea83d6a3e34`。集成摘要以 Plan `owned_paths` 按 v2 重算为 `7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850`，与候选验收相同。
- PR #28 恢复缺失的历史证据文档，使质量工作流的知识库校验可执行；该 PR 的 E2E 初始化曾因 quay.io 镜像拉取被拒而失败，测试未启动。此问题通过独立 CI 支持修复 PR #29 解决：改用固定 digest 的 GHCR MinIO release 镜像，并复用该镜像中的 `mc`。
- PR #29 的 `branch-flow-develop`、`quality`、`e2e-auth` 全部成功；E2E 中镜像启动、bucket 创建、迁移、Chromium 安装、Playwright 和隔离上传检查均通过。PR #29 合并后，最新 `origin/develop=f1bf5fca1d696d8399da6efc01839f1370cd694b` 的 Quality workflow run `38518835483` 中 quality（测试、生成、构建、知识库校验）和 e2e-auth 均成功。
- 最终项目级 `hooks/update-indexes.ps1 -Check` 和 `git diff --check` 在归档提交前通过；归档提交推送后，`hooks/validate-project.ps1 -Check` 与远端归档保护检查通过。未运行项不得冒称通过。

## 检查结果

| 检查                     | 状态           | 候选证据                                                                                                                                                                                                                                                          |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API 照片服务定向测试     | PASS           | 候选后复跑 `apps/api/test/photo-gallery.spec.ts`：1 suite / 7 tests passed。                                                                                                                                                                                      |
| Web 照片与里程碑定向测试 | PASS           | 候选后复跑 `PhotoBrowse.test.tsx` + `MilestoneApp.test.tsx`：2 files / 26 tests passed。                                                                                                                                                                          |
| API 类型检查             | PASS           | 候选后使用已安装 TypeScript 二进制 `tsc --noEmit` 成功。                                                                                                                                                                                                          |
| Web 类型检查             | PASS           | 候选后使用已安装 TypeScript 二进制 `tsc -b --pretty false` 成功。                                                                                                                                                                                                 |
| API Client               | PASS           | API Client typecheck 与 build 在形成候选前通过；其生成文件与候选一致。该包未配置实际 Node tests（`node --test` 返回 0 suites），不以此宣称测试覆盖。                                                                                                              |
| API/Web 全量测试         | PASS           | 候选前对相同实现工作树运行全套 API：7 suites / 62 tests；Web：9 files / 67 tests，均通过。候选提交仅封装该已验证实现和文档，没有提交前后代码差异。                                                                                                                |
| OpenAPI 与客户端生成     | PASS           | OpenAPI 导出、API Client 生成及连续生成确定性检查在候选前通过；候选包含最终生成产物。                                                                                                                                                                             |
| 构建、Lint 与格式        | PASS           | API/Web/API Client 构建、API/Web/API Client 类型检查、相关 ESLint、Prettier 检查均在候选前通过。直接 pnpm 命令于候选后因宿主 Node 24.19.0 / pnpm 11.19.0 与仓库要求 24.20.0 / 11.21.0 不匹配而拒绝运行；改用已安装工具二进制复跑关键 API/Web 测试和 TS 检查通过。 |
| Playwright 照片/里程碑   | PASS           | `photo.spec.ts` + `milestone.spec.ts`：6 passed / 6 skipped / 0 failed；按项目配置跳过与指定视口无关的 API 专项项目。                                                                                                                                             |
| Playwright 栈连通性      | PASS           | `stack-connectivity.spec.ts` 1 passed；Web→API readiness 确认 PostgreSQL、Redis、对象存储均 up。                                                                                                                                                                  |
| 视口尺寸                 | PASS           | 浏览器流程覆盖 Chromium 375×812、834×1112、1440×1000；测试覆盖图集/时间轴上传者、详情上传者、来源链接和溢出/键盘断言。                                                                                                                                            |
| 索引校验                 | PASS           | 候选后 `hooks/update-indexes.ps1 -Check` 通过。                                                                                                                                                                                                                   |
| 项目校验                 | PASS           | 候选后 `hooks/validate-project.ps1 -Check` 输出 `PROJECT_VALIDATION=PASSED`；进程级 Git excludes 配置，无全局配置修改。                                                                                                                                           |
| Git diff 校验            | PASS           | 候选暂存差异 `git diff --cached --check` 通过；所有 26 个候选路径位于 Plan owned paths。                                                                                                                                                                          |
| 远端 CI                  | PENDING        | 未推送/未创建 PR（均未授权），因此没有远端 CI 运行。                                                                                                                                                                                                              |
| 真实设备/其他浏览器      | NOT_APPLICABLE | Plan 指定的响应式验收是三个尺寸的浏览器视口，均由 Windows Chromium 覆盖；未把 Safari、Firefox 或真实移动设备列入本候选验证范围，因此不作跨浏览器通过声明。                                                                                                        |

## 视口 × 状态矩阵

| 视口      | 正常流程                                                   | 空／加载／错误／回收状态                                               | 键盘、焦点与横向溢出                                           |
| --------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 375×812   | PASS：图集照片卡片、照片详情及来源返回自动化通过。         | PASS：既有加载/错误/回收组件逻辑没有被本次改动改变；定向组件测试通过。 | PASS：长名卡片单行截断与超宽检查、Tab/Enter 键盘链接操作通过。 |
| 834×1112  | PASS：平板照片浏览、详情和里程碑照片入口流程通过。         | PASS：Web 详情/里程碑定向测试与浏览器流程通过。                        | PASS：自适应卡片容器与用户可见焦点未被覆盖层改变。             |
| 1440×1000 | PASS：API 合约、图集/时间轴/里程碑来源、照片相邻浏览通过。 | PASS：API 权限、已发布过滤、私有预览和时间轴合约回归通过。             | PASS：返回/邻接锚点可聚焦，长文案不改变链接或横向尺寸。        |

矩阵仅声明项目 Chromium E2E 的视口覆盖；项目外设备和浏览器仍为 UNVERIFIED。数据库、Redis 和对象存储中的 E2E 合成数据未清理，未将持久层清空作为验证手段。

## 候选阶段未覆盖风险与结论

- `pnpm` shim 当前版本低于仓库固定引擎，因此候选后本机直接 pnpm 入口不可用；已改用本地 Jest、Vitest、TypeScript 二进制和候选前成功的全量/构建/生成记录，且候选代码字节与验证过的工作树一致。
- 远端 CI 仍为 pending；跨浏览器与真实设备不是本 Plan 的指定候选检查范围，记录为 NOT_APPLICABLE，且不作通过声明。远端 CI 会在后续用户授权的集成流程内处理。
- 本地候选回归没有 FAIL 或适用的 UNVERIFIED 检查；远端 CI pending 保留为未执行的集成风险。

结论：候选 Regression `passed`。用户已于 `2026-10-14T09:49:50+08:00` 对本报告绑定的候选 commit 与 digest 明确验收通过；此结论记录候选阶段当时状态，集成结果见下节。

## 集成 Regression 最终结论

- 产品集成提交：`fd70c6b629fcd0696c8526dcae1b1ea83d6a3e34`；accepted 与 integrated v2 owned-scope digest 均为 `7B2E0F6B7B233D35653C1948E875D78C86FA9B34F1CEFFEC89A004409706B850`。
- 最终 CI 已在 PR #29 和其合并后的 `origin/develop=f1bf5fca1d696d8399da6efc01839f1370cd694b` 执行。PR branch-flow、quality、e2e-auth 全部通过；合并后 Quality run `38518835483` 的 quality 与 e2e-auth 全部通过。
- E2E 实际完成镜像拉取、MinIO readiness、bucket 创建、Prisma migration、Chromium 安装、`pnpm e2e` 和隔离上传检查；未复现初始 Quay registry 访问失败。全量 API/Web 测试、类型检查、OpenAPI/client 确定性、构建、镜像 codec 检查和知识库校验均由 Quality workflow 通过。
- 最新 develop 包含产品候选且未修改其 owned-scope 内容；候选与集成摘要相同，集成 Regression 结论为 `passed`。响应式候选浏览器覆盖限于 Windows Chromium 375×812、834×1112 和 1440×1000；Safari、Firefox 和真实设备未验证。
