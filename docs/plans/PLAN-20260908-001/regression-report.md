---
id: PLAN-20260908-001-REGRESSION
type: regression_report
title: "Git 协作与可移植证据链 Regression"
status: passed
created_at: 2026-09-08T11:34:45+08:00
updated_at: 2026-09-08T12:19:49+08:00
plan_id: PLAN-20260908-001
repository_mode: non_git
candidate_commit: null
integrated_commit: null
ci_status: not_configured
platform_scope: platform_unbound
related_ids: [PLAN-20260908-001, PLAN-20260908-001-EXEC, PLAN-20260908-001-REVIEW]
supersedes: []
superseded_by: []
---

# Regression Report

## 结论

`passed`。非 Git 兼容流程、legacy 档案、Rules 验证器、确定性索引、规范化哈希和可选 Hook 降级均保持有效；临时 Git 仓库覆盖协作状态机的关键算法。当前项目目录仍为 `non_git`。

## 影响范围与选择依据

| 影响 | 回归方法 | 结果 |
| --- | --- | --- |
| 旧 Docs/Rules 工作流 | 对现有两个 archived Plan/Achievement 和当前过渡 Plan 运行聚合校验 | PASS |
| Rules 历史引用 | 当前 Plan 固定 v1、当前 Ruleset 已升级 v2，验证器从 archive 解析 v1 | PASS |
| 新旧 ID | legacy 解析、新随机 ID、非法/重复格式和碰撞重试 | PASS |
| 非 Git 模式 | 当前根目录 preflight 与聚合校验 | PASS |
| Git 本地/远端 | 临时 repo + bare remote + peer clone | PASS |
| 并行范围 | 直接/父子 owned_paths 重叠阻断、当前 Plan 排除 | PASS |
| 工作树与远端状态 | clean、dirty_nonoverlap、dirty_overlap、fresh、stale、diverged、detached | PASS |
| 验收摘要 | 无关路径变化摘要相同，owned_paths 内容变化摘要不同 | PASS |
| 索引 | 两次 `-Write` 无变化，`-Check` 拒绝生成区块损坏 | PASS |
| 归档不可变 | LF/CRLF 同哈希；归档与 Manifest 同时改写仍被 Git 集成基线拒绝 | PASS |
| Hook | SessionStart JSON、Stop loop guard、事件配置与 Git 根解析 | PASS |
| 双运行时 | PowerShell 7.6.5、Windows PowerShell 5.1 | PASS |

## 实际执行

- PowerShell 7：`validate-project` 通过；Rules 套件 2 正向/15 负向；协作套件 25/25。
- Windows PowerShell 5.1：相同三项全部通过。
- 既有 Rules 验证负向场景继续覆盖重复 Rule、坏引用、非法状态、缺验证方式、缺模块、错误版本、Review 漏项、缺 Achievement、归档哈希变化和坏链接。
- 新负向场景覆盖新建 legacy ID、现代 Plan 缺 State、Git Plan 缺基线、CI failed 和 Docs 归档篡改。

## 设备、UI 与状态覆盖

- 网站桌面/平板/移动端：`NOT_APPLICABLE`，本 Plan 没有网站 UI 或运行时实现。
- 页面正常/空/加载/错误/边界：`NOT_APPLICABLE`，原因同上。
- Windows PowerShell 运行环境：已验证。
- macOS/Linux：`UNVERIFIED`，超出当前锁定平台范围，不宣称通过。

## 未覆盖内容与风险

- 没有真实团队远端、托管平台、CI 或合并请求，使用本地 bare remote 演练算法与门禁。
- 没有实际执行 pull、merge、rebase、push 到外部远端；本 Plan 明确不授权这些副作用。
- 项目 Hook 是否被某台设备信任和触发属于设备状态，不能随仓库证明；显式验证入口仍是基础门禁。
- `ci_status: not_configured` 不阻止本次 non_git 归档，但未来 git_remote Plan 仍须满足集成复验规则。
