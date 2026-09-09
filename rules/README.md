# `rules/` 开发规则操作协议

> 状态：已生效。所有 AI 在探查、规划、开发、Review、回归或验收前，必须先读取 [`INDEX.md`](./INDEX.md)，再按阶段菜单读取当前有效规则。

## 1. 职责边界

`rules/` 只保存当前开发必须遵守的可复用约束及其历史版本：

- `AGENTS.md`：整个项目的最高层入口和资料优先级。
- `rules/`：现在必须怎样探查、规划、开发、Review、回归和验收。
- `docs/designs/`：页面或组件应该呈现什么视觉与交互结果。
- `docs/specs/`：具体功能、数据和行为必须是什么。
- `docs/plans/`：某一次变更准备怎样实施，以及实际使用哪些规则版本。
- `docs/achievements/`：某次变更已完成并经人工确认的历史证据。
- `tests/`：可执行验证。

具体产品结果、单页设计值、一次性修复要求和 AI 未经确认的最佳实践不得写成 active Rule。

## 2. 固定结构

```text
rules/
├─ README.md
├─ INDEX.md
├─ stages/                 # 当前阶段菜单；只路由，不复制规则正文
├─ modules/                # 当前有效规则的唯一正文
└─ archive/
   ├─ INDEX.md             # 历史版本入口
   ├─ MANIFEST.sha256      # 历史文件防篡改清单
   └─ <RULESET-ID>/vNNN-YYYYMMDD.md
```

- `stages/` 和 `modules/` 中的稳定路径就是当前版本，不另建 `current/`。
- `archive/` 不参与正常任务路由；只有冲突调查、审计或历史回溯时读取。
- `INDEX.md` 只登记入口、版本、状态和健康度，不复制具体 Rule。
- 阶段菜单不得超过 80 行；详细规则只存在于 `modules/`。

## 3. 进入阶段的读取顺序

1. 读取根目录 `AGENTS.md`。
2. 读取本文件和 `rules/INDEX.md`。
3. 根据当前行为选择唯一主要阶段菜单。
4. 读取阶段菜单列出的必需模块和命中条件的条件模块。
5. 从 `docs/INDEX.md` 定位当前 Design、Spec、Plan 和证据。
6. 若任务跨越阶段，在每次阶段变化时重新读取对应菜单并满足入口门禁。

## 4. Ruleset 元数据

阶段菜单和规则模块必须使用以下 YAML 元数据：

```yaml
---
ruleset_id: RULESET-RESPONSIVE-UI
title: "响应式界面规则"
version: 1
status: active
health: healthy
scope: frontend-ui
stages: [development, review, regression]
effective_at: YYYY-MM-DDTHH:mm:ss+08:00
updated_at: YYYY-MM-DDTHH:mm:ss+08:00
source_refs: [AGENTS.md]
related_plan_ids: [PLAN-YYYYMMDD-NNN]
related_achievement_ids: []
supersedes_version: null
---
```

合法状态：

- `active`：当前有效并参与路由。
- `superseded`：已被新版本替代，只能存在于 archive。
- `retired`：不再适用且没有直接替代版本，只能存在于 archive。

合法健康状态：

- `healthy`：最近检查未发现问题。
- `review_due`：环境或依据变化，需要复核，但仍然有效。
- `conflict`：与高优先级资料冲突，受影响任务必须暂停。
- `unverifiable`：无法证明得到执行，受影响 Plan 不能通过 Review。

版本使用正整数，从 `1` 开始递增，不复用、不跳号。年龄不会让规则自动失效；健康状态由事件驱动更新。

## 5. 单条 Rule 接口

每条 Rule 使用二级标题和固定属性：

```markdown
## RESP-001 — 桌面、平板和移动端同步考虑

- Level: `MUST`
- Status: `active`
- Stages: `development`, `review`, `regression`
- Applies to: frontend UI
- Trigger: 创建或修改页面、布局、可视组件或交互。
- Requirement: 三类终端必须在同一 Plan 中实现和验证。
- Verification modes: `review`, `regression`
- Verification: 对照三类视口证据。
- Exceptions: 仅限有效 Spec 或用户最新明确指令。
- Source: 用户确认的项目目标。
```

- `MUST`：未满足即不能通过对应阶段。
- `SHOULD`：默认遵守；偏离时必须记录原因、影响和证据。
- 不使用 `MAY` 保存普通建议。
- 每个 active `MUST` 至少声明一种 Verification mode：`automatic`、`review`、`regression` 或 `human`。
- Rule ID 在整个 `rules/modules/` 中唯一且永不复用。

## 6. 修改前规则候选检查

AI 在修改任何文件前，必须检查用户最新消息是否表达可复用的长期约束。常见信号包括：

- 以后、今后、每次、统一、始终、默认；
- 不要、不能、必须、需要、要考虑、要注意；
- 避免再次、记住、类似情况都应如此；
- 对重复缺陷提出可迁移到同类任务的要求。

只有同时满足“未来同类任务可能适用”和“能形成明确执行约束”时才是 Rule 候选。

以下内容默认不入 Rules：

- 明确只用于本次、当前页面或临时处理的指令；
- 应进入 Design/Spec 的文案、颜色、尺寸或具体业务行为；
- 已有完全相同的 active Rule；
- 只描述当前错误而没有长期约束；
- AI 自行想到但用户未确认的最佳实践；
- 用户明确表示不要记录或只修本次。

## 7. 候选确认门禁

检测到候选后：

1. 暂停所有文件修改，只允许继续只读探查。
2. 检索现有 Rules、Design、Spec、Plan 和相关实现。
3. 判断新增、加强、替代、重复、冲突或转入 Design/Spec。
4. 自动判断 Ruleset、适用阶段、范围、Level 和验证方式。
5. 向用户展示一张候选确认卡，包含原话、规范化规则、分类、阶段、Level、验证方式及对当前 Plan 的影响。
6. 用一句明确问题询问是否写入 Rules 并从本次修改起生效。

用户一次“确认”同时授权：

- 写入或更新 Rules；
- 从本次修复开始生效；
- 归档被替代的旧 Ruleset；
- 更新当前菜单和历史索引；
- 纳入当前 Plan 或修订 Plan；
- 按新规则继续修复。

不因内部文档维护再次询问。若用户说“只用于这一次”，则作为 Plan 特定约束执行，不写入 Rules。

## 8. 分类与计划影响

默认主题路由：

| 含义 | Ruleset |
| --- | --- |
| 资料、事实、推断、冲突 | `RULESET-SOURCE-EVIDENCE` |
| 文件范围、已有修改、仓库卫生 | `RULESET-REPOSITORY-SAFETY` |
| 桌面、平板、移动端和 UI 状态 | `RULESET-RESPONSIVE-UI` |
| 实现范围、同步和完成质量 | `RULESET-IMPLEMENTATION-QUALITY` |
| 测试、Review、Regression | `RULESET-TESTING-QUALITY` |
| Git 模式、分支、远端、并行 Plan、集成 | `RULESET-GIT-COLLABORATION` |
| 密钥、凭据和隐私数据 | `RULESET-SECURITY-PRIVACY` |

- 无当前 Plan：候选确认与原任务授权共同形成包含规则变更和修复的 Plan 依据。
- Plan 尚未执行：受影响时创建修订 Plan，并固定新 Ruleset 版本。
- Plan 执行中：暂停修改；受影响时创建修订 Plan，并重新检查已经完成的范围。
- 其他未归档 Plan：自动扫描影响；发生实质冲突时标记 `blocked`，修订后才能继续。
- Archived Plan：保持当时固定的规则版本，永不修改。

## 9. 规则版本与归档

修改 Ruleset 时：

1. 先确认候选和关联 Plan。
2. 将修改前全文复制到 `archive/<RULESET-ID>/vNNN-YYYYMMDD.md`。
3. 在 `archive/MANIFEST.sha256` 登记规范化 UTF-8/LF 内容的大写 SHA-256 和正斜杠相对路径。
4. archive 文件创建后永久只读。
5. 当前稳定文件版本加一，并写入新 Rule 或替代关系。
6. 更新 `rules/INDEX.md` 和 `rules/archive/INDEX.md`。
7. 将新版本和 Rule ID 写入 Plan 的 `applicable_rules`。
8. 运行 `hooks/validate-rules.ps1`。

首次创建 Ruleset 为版本 `1`，不制造 `v000`。归档文件哈希变化属于一致性失败，不得静默修复历史；必须调查并报告。

## 10. 有效性与及时更新

规则有效性由四层保证：

1. 可发现：AGENTS → Rules Index → Stage → Module。
2. 可执行：Plan 固定版本，Development 记录应用情况。
3. 可验证：每条 MUST 有验证方式，Review 逐条核对。
4. 可追溯：Regression 和 Achievement 保存最终证据。

以下事件触发健康复核：

- 用户提出新的长期注意事项；
- Review 重复出现同类问题；
- Design、Spec、代码或 Rules 发生冲突；
- 技术栈、测试系统、支持范围或数据模型改变；
- 原验证方式失效；
- 非 archived Plan 引用的版本被替代；
- Regression 暴露规则覆盖缺口。

AI 发现候选但不影响当前修改时，可在 Review 中提出；会影响当前修改时必须在修改前询问。AI 不得自行把候选升级为 active。

## 11. 完成门禁

- Development：适用规则已读取并写入执行记录；Git 模式满足 preflight 与 owned_paths 门禁。
- Review：每个适用 Rule 得到 `PASS`、`FAIL`、`NOT_APPLICABLE` 或 `UNVERIFIED` 结论及证据。
- Regression：Review 通过后独立验证既有能力。
- `FAIL` 或 `UNVERIFIED` 阻止进入人工验收。
- Acceptance：non_git 在 Review、Regression 和明确确认后归档；git_remote 还必须完成集成与集成复验。
- 归档时保存实际使用的 Ruleset、版本、Rule ID、Review 矩阵和 Regression 结果。

## 12. 自动校验边界

`hooks/validate-rules.ps1` 保留为兼容入口；`hooks/validate-project.ps1 -Check` 聚合 Rules、Docs、索引、归档和仓库上下文检查。它们不负责判断自然语言是否包含规则候选；该语义检查由 AI 根据 `AGENTS.md` 和本协议执行。
